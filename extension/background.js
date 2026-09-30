"use strict";
(() => {
  // src/core.ts
  var MAX_CONFIG_BYTES = 9 * 1024 * 1024;
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  function validateImage(value) {
    if (typeof value !== "string") throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    if (!value) return "";
    const prefix = "data:image/png;base64,";
    const encoded = value.slice(prefix.length);
    if (!value.startsWith(prefix) || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    const bytes = atob(encoded);
    if (bytes.length > MAX_IMAGE_BYTES || !bytes.startsWith("\x89PNG\r\n\n")) throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    return value;
  }
  function validateMessageText(text) {
    if (/[\ufffd\ud800-\udfff]/u.test(text)) throw new Error("A mensagem cont\xE9m um car\xE1ter inv\xE1lido (\uFFFD). Apague-o e escreva-o novamente.");
  }
  function makeWhatsAppUrl(phone, message) {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new Error("N\xFAmero inv\xE1lido.");
    validateMessageText(message);
    if (!message.trim() || message.length > 4e3) throw new Error("A mensagem deve ter entre 1 e 4000 caracteres.");
    return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;
  }

  // src/background.ts
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage().catch(() => {
    });
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.frameId && sender.frameId !== 0) return;
    if (message?.type === "open-settings") {
      chrome.runtime.openOptionsPage().then(() => respond({ ok: true }), () => respond({ ok: false }));
      return true;
    }
    if (!["prepare-image", "claim-image"].includes(message?.type)) return;
    void (async () => {
      if (message.type === "prepare-image") {
        if (!sender.url?.startsWith("https://zappysoftware.com/backoffice/")) throw new Error("Origem inv\xE1lida.");
        makeWhatsAppUrl(message.phone, message.text);
        if (message.text.length > 1024) throw new Error("A legenda da imagem pode ter at\xE9 1024 caracteres.");
        if (!validateImage(message.image)) throw new Error("Imagem indispon\xEDvel.");
        const token = crypto.randomUUID();
        const tab = await chrome.tabs.create({ url: "about:blank", active: true });
        if (tab.id === void 0) throw new Error("N\xE3o foi poss\xEDvel abrir o WhatsApp Web.");
        const key2 = `image-draft-${tab.id}`;
        try {
          await chrome.storage.session.set({ [key2]: { token, phone: message.phone, text: message.text, image: message.image, expires: Date.now() + 12e4 } });
          await chrome.tabs.update(tab.id, { url: `https://web.whatsapp.com/send?phone=${message.phone.slice(1)}#zappy-image=${token}` });
        } catch (error) {
          await chrome.storage.session.remove(key2);
          await chrome.tabs.remove(tab.id);
          throw error;
        }
        return { ok: true };
      }
      if (sender.tab?.id === void 0 || !sender.url) throw new Error("Separador inv\xE1lido.");
      const url = new URL(sender.url);
      if (url.origin !== "https://web.whatsapp.com" || url.pathname !== "/send") throw new Error("Origem inv\xE1lida.");
      const key = `image-draft-${sender.tab.id}`;
      const draft = (await chrome.storage.session.get(key))[key];
      if (!draft || draft.token !== message.token || url.hash !== `#zappy-image=${draft.token}` || url.searchParams.get("phone") !== draft.phone.slice(1)) throw new Error("Rascunho indispon\xEDvel. Volte ao Zappy e escolha novamente.");
      await chrome.storage.session.remove(key);
      if (draft.expires < Date.now()) throw new Error("Rascunho expirado. Volte ao Zappy e escolha novamente.");
      validateMessageText(draft.text);
      validateImage(draft.image);
      return { ok: true, draft };
    })().then(respond, (error) => respond({ ok: false, error: error.message }));
    return true;
  });
  chrome.tabs.onRemoved.addListener((id) => {
    void chrome.storage.session.remove(`image-draft-${id}`);
  });
})();
