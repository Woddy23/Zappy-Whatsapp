// ponytail: public WhatsApp Web DOM only; stop visibly if its composer changes. No private API or automatic Send.
const token = location.hash.match(/^#zappy-image=([a-f0-9-]{36})$/)?.[1];
if (token && location.pathname === '/send') void prepareImage(token);

async function prepareImage(token: string): Promise<void> {
  const host = document.createElement('aside');
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = '<style>:host{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(520px,calc(100vw - 24px));font:14px/1.5 system-ui;color:#20372d}section{background:#fff;border:2px solid #17754f;border-radius:8px;padding:12px;box-shadow:0 4px 20px #0003}p{margin:0;white-space:pre-wrap}button{margin-top:8px;padding:6px 12px}textarea{width:100%;box-sizing:border-box;margin-top:8px}a{display:block;margin-top:8px}</style><section><p role="status" aria-live="polite"></p><button type="button">Fechar aviso</button></section>';
  document.body.append(host);
  const status = shadow.querySelector('p')!;
  let cancelled = false;
  let interrupted = false;
  const interrupt = (event: Event) => { if (event.isTrusted && !event.composedPath().includes(host)) interrupted = true; };
  document.addEventListener('pointerdown', interrupt, true);
  document.addEventListener('keydown', interrupt, true);
  shadow.querySelector('button')!.addEventListener('click', () => { cancelled = true; host.remove(); });
  const notify = (text: string) => { status.textContent = text; };
  const visible = (node: HTMLElement) => node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
  const wait = async <T>(find: () => T | undefined): Promise<T> => {
    const end = Date.now() + 60_000;
    while (Date.now() < end) {
      if (cancelled) throw new Error('Preparação cancelada.');
      if (interrupted) throw new Error('Interagiu com o WhatsApp durante a preparação. Volte ao Zappy e escolha novamente.');
      const result = find(); if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('O WhatsApp não disponibilizou o editor. Inicie sessão e tente novamente a partir do Zappy.');
  };
  let draft: { image: string; text: string; phone: string } | undefined;
  try {
    const result = await chrome.runtime.sendMessage({ type: 'claim-image', token });
    if (!result?.ok) throw new Error(result?.error || 'Rascunho indisponível.');
    draft = result.draft;
    if (!draft) throw new Error('Rascunho indisponível.');
    notify(`A preparar imagem para ${draft.phone}. Aguarde; não envie texto separado.`);
    const composer = await wait(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('#main footer [contenteditable="true"][role="textbox"]')).filter(visible);
      return nodes.length === 1 ? nodes[0] : undefined;
    });
    if (document.querySelector('[role="dialog"] [contenteditable="true"], [data-animate-modal-popup="true"] [contenteditable="true"]')) throw new Error('Já existe uma pré-visualização aberta. Não foi substituída.');
    if (composer.textContent?.trim()) throw new Error('Existe texto no editor. Não foi substituído.');
    const main = composer.closest('#main')!;
    const header = main.querySelector('header');
    const identity = header?.textContent;
    const bytes = Uint8Array.from(atob(draft.image.split(',')[1]), char => char.charCodeAt(0));
    const file = new File([bytes], 'mensagem.png', { type: 'image/png' });
    const transfer = new DataTransfer(); transfer.items.add(file);
    composer.focus();
    composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true, composed: true }));
    // Only a media preview outside the chat footer can receive the caption.
    const caption = await wait(() => {
      if (!composer.isConnected || document.querySelector('#main') !== main || main.querySelector('header') !== header || header?.textContent !== identity) throw new Error('A conversa mudou durante a preparação. Volte ao Zappy.');
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"][role="textbox"]')).filter(node => visible(node) && !node.closest('footer') && !!node.closest('[role="dialog"], [data-animate-modal-popup="true"]'));
      const modal = nodes.length === 1 ? nodes[0].closest('[role="dialog"], [data-animate-modal-popup="true"]') : null;
      return modal?.querySelector('img[src^="blob:"], img[src^="data:image/"]') && modal.querySelector('[data-icon="send"]') ? nodes[0] : undefined;
    });
    if (caption.textContent?.trim()) throw new Error('A pré-visualização já contém uma legenda. Não foi substituída.');
    caption.focus();
    // Native editing updates React/Lexical state; setting textContent alone does not.
    if (!document.execCommand('insertText', false, draft.text)) throw new Error('Não foi possível preencher a legenda.');
    if ((caption.innerText || caption.textContent || '').replace(/\r\n/g, '\n') !== draft.text.replace(/\r\n/g, '\n')) throw new Error('Confirme a legenda: o editor não preservou todo o texto.');
    notify(`Imagem e legenda preparadas para ${draft.phone}. Confirme o destinatário e a conta. Clique em Enviar no WhatsApp uma vez. Nada foi enviado automaticamente.`);
  } catch (error) {
    if (cancelled) return;
    notify(`Não foi possível concluir a preparação. ${(error as Error).message} Nada foi enviado automaticamente.`);
    if (draft) {
      const download = document.createElement('a'); download.href = draft.image; download.download = 'mensagem.png'; download.textContent = 'Guardar imagem para anexar manualmente';
      const text = document.createElement('textarea'); text.readOnly = true; text.value = draft.text; text.setAttribute('aria-label', 'Legenda para copiar manualmente');
      shadow.querySelector('section')!.append(download, text);
    }
  } finally {
    document.removeEventListener('pointerdown', interrupt, true);
    document.removeEventListener('keydown', interrupt, true);
  }
}
