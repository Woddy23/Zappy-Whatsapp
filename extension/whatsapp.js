"use strict";
(() => {
  // src/whatsapp.ts
  var token = location.hash.match(/^#zappy-image=([a-f0-9-]{36})$/)?.[1];
  if (token && location.pathname === "/send") void prepareImage(token);
  async function prepareImage(token2) {
    const host = document.createElement("aside");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = '<style>:host{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(520px,calc(100vw - 24px));font:14px/1.5 system-ui;color:#20372d}section{background:#fff;border:2px solid #17754f;border-radius:8px;padding:12px;box-shadow:0 4px 20px #0003}p{margin:0;white-space:pre-wrap}button{margin-top:8px;padding:6px 12px}textarea{width:100%;box-sizing:border-box;margin-top:8px}a{display:block;margin-top:8px}</style><section><p role="status" aria-live="polite"></p><button type="button">Fechar aviso</button></section>';
    document.body.append(host);
    const status = shadow.querySelector("p");
    let cancelled = false;
    let interrupted = false;
    const interrupt = (event) => {
      if (event.isTrusted && !event.composedPath().includes(host)) interrupted = true;
    };
    document.addEventListener("pointerdown", interrupt, true);
    document.addEventListener("keydown", interrupt, true);
    shadow.querySelector("button").addEventListener("click", () => {
      cancelled = true;
      host.remove();
    });
    const notify = (text) => {
      status.textContent = text;
    };
    const visible = (node) => node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
    const wait = async (find) => {
      const end = Date.now() + 6e4;
      while (Date.now() < end) {
        if (cancelled) throw new Error("Prepara\xE7\xE3o cancelada.");
        if (interrupted) throw new Error("Interagiu com o WhatsApp durante a prepara\xE7\xE3o. Volte ao Zappy e escolha novamente.");
        const result = find();
        if (result) return result;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("O WhatsApp n\xE3o disponibilizou o editor. Inicie sess\xE3o e tente novamente a partir do Zappy.");
    };
    let draft;
    try {
      const result = await chrome.runtime.sendMessage({ type: "claim-image", token: token2 });
      if (!result?.ok) throw new Error(result?.error || "Rascunho indispon\xEDvel.");
      draft = result.draft;
      if (!draft) throw new Error("Rascunho indispon\xEDvel.");
      notify(`A preparar imagem para ${draft.phone}. Aguarde; n\xE3o envie texto separado.`);
      const composer = await wait(() => {
        const nodes = Array.from(document.querySelectorAll('#main footer [contenteditable="true"][role="textbox"]')).filter(visible);
        return nodes.length === 1 ? nodes[0] : void 0;
      });
      if (document.querySelector('[role="dialog"] [contenteditable="true"], [data-animate-modal-popup="true"] [contenteditable="true"]')) throw new Error("J\xE1 existe uma pr\xE9-visualiza\xE7\xE3o aberta. N\xE3o foi substitu\xEDda.");
      if (composer.textContent?.trim()) throw new Error("Existe texto no editor. N\xE3o foi substitu\xEDdo.");
      const main = composer.closest("#main");
      const header = main.querySelector("header");
      const identity = header?.textContent;
      const bytes = Uint8Array.from(atob(draft.image.split(",")[1]), (char) => char.charCodeAt(0));
      const file = new File([bytes], "mensagem.png", { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      composer.focus();
      composer.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true, composed: true }));
      const caption = await wait(() => {
        if (!composer.isConnected || document.querySelector("#main") !== main || main.querySelector("header") !== header || header?.textContent !== identity) throw new Error("A conversa mudou durante a prepara\xE7\xE3o. Volte ao Zappy.");
        const nodes = Array.from(document.querySelectorAll('[contenteditable="true"][role="textbox"]')).filter((node) => visible(node) && !node.closest("footer") && !!node.closest('[role="dialog"], [data-animate-modal-popup="true"]'));
        const modal = nodes.length === 1 ? nodes[0].closest('[role="dialog"], [data-animate-modal-popup="true"]') : null;
        return modal?.querySelector('img[src^="blob:"], img[src^="data:image/"]') && modal.querySelector('[data-icon="send"]') ? nodes[0] : void 0;
      });
      if (caption.textContent?.trim()) throw new Error("A pr\xE9-visualiza\xE7\xE3o j\xE1 cont\xE9m uma legenda. N\xE3o foi substitu\xEDda.");
      caption.focus();
      if (!document.execCommand("insertText", false, draft.text)) throw new Error("N\xE3o foi poss\xEDvel preencher a legenda.");
      if ((caption.innerText || caption.textContent || "").replace(/\r\n/g, "\n") !== draft.text.replace(/\r\n/g, "\n")) throw new Error("Confirme a legenda: o editor n\xE3o preservou todo o texto.");
      notify(`Imagem e legenda preparadas para ${draft.phone}. Confirme o destinat\xE1rio e a conta. Clique em Enviar no WhatsApp uma vez. Nada foi enviado automaticamente.`);
    } catch (error) {
      if (cancelled) return;
      notify(`N\xE3o foi poss\xEDvel concluir a prepara\xE7\xE3o. ${error.message} Nada foi enviado automaticamente.`);
      if (draft) {
        const download = document.createElement("a");
        download.href = draft.image;
        download.download = "mensagem.png";
        download.textContent = "Guardar imagem para anexar manualmente";
        const text = document.createElement("textarea");
        text.readOnly = true;
        text.value = draft.text;
        text.setAttribute("aria-label", "Legenda para copiar manualmente");
        shadow.querySelector("section").append(download, text);
      }
    } finally {
      document.removeEventListener("pointerdown", interrupt, true);
      document.removeEventListener("keydown", interrupt, true);
    }
  }
})();
