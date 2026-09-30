"use strict";
(() => {
  // src/core.ts
  var MAX_CONFIG_BYTES = 9 * 1024 * 1024;
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
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
    if (message?.type !== "open-image-chat") return;
    void (async () => {
      if (!sender.url?.startsWith("https://zappysoftware.com/backoffice/")) throw new Error("Origem inv\xE1lida.");
      const url = new URL(makeWhatsAppUrl(message.phone, message.text));
      await chrome.tabs.create({ url: url.href, active: true });
      return { ok: true };
    })().then(respond, (error) => respond({ ok: false, error: error.message }));
    return true;
  });
})();
