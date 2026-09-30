import { makeWhatsAppUrl, validateImage, validateMessageText } from './core';

chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage().catch(() => {}); });

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.frameId && sender.frameId !== 0) return;
  if (message?.type === 'open-settings') {
    chrome.runtime.openOptionsPage().then(() => respond({ ok: true }), () => respond({ ok: false }));
    return true;
  }
  if (!['prepare-image', 'claim-image'].includes(message?.type)) return;
  void (async () => {
    if (message.type === 'prepare-image') {
      if (!sender.url?.startsWith('https://zappysoftware.com/backoffice/')) throw new Error('Origem inválida.');
      makeWhatsAppUrl(message.phone, message.text);
      if (message.text.length > 1024) throw new Error('A legenda da imagem pode ter até 1024 caracteres.');
      if (!validateImage(message.image)) throw new Error('Imagem indisponível.');
      const token = crypto.randomUUID();
      const tab = await chrome.tabs.create({ url: 'about:blank', active: true });
      if (tab.id === undefined) throw new Error('Não foi possível abrir o WhatsApp Web.');
      const key = `image-draft-${tab.id}`;
      try {
        await chrome.storage.session.set({ [key]: { token, phone: message.phone, text: message.text, image: message.image, expires: Date.now() + 120_000 } });
        await chrome.tabs.update(tab.id, { url: `https://web.whatsapp.com/send?phone=${message.phone.slice(1)}#zappy-image=${token}` });
      } catch (error) { await chrome.storage.session.remove(key); await chrome.tabs.remove(tab.id); throw error; }
      return { ok: true };
    }
    if (sender.tab?.id === undefined || !sender.url) throw new Error('Separador inválido.');
    const url = new URL(sender.url);
    if (url.origin !== 'https://web.whatsapp.com' || url.pathname !== '/send') throw new Error('Origem inválida.');
    const key = `image-draft-${sender.tab.id}`;
    const draft = (await chrome.storage.session.get(key))[key] as { token: string; phone: string; text: string; image: string; expires: number } | undefined;
    if (!draft || draft.token !== message.token || url.hash !== `#zappy-image=${draft.token}` || url.searchParams.get('phone') !== draft.phone.slice(1)) throw new Error('Rascunho indisponível. Volte ao Zappy e escolha novamente.');
    await chrome.storage.session.remove(key);
    if (draft.expires < Date.now()) throw new Error('Rascunho expirado. Volte ao Zappy e escolha novamente.');
    validateMessageText(draft.text); validateImage(draft.image);
    return { ok: true, draft };
  })().then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});

chrome.tabs.onRemoved.addListener(id => { void chrome.storage.session.remove(`image-draft-${id}`); });
