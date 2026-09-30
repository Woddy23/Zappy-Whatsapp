import { makeWhatsAppUrl } from './core';

chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage().catch(() => {}); });

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.frameId && sender.frameId !== 0) return;
  if (message?.type === 'open-settings') {
    chrome.runtime.openOptionsPage().then(() => respond({ ok: true }), () => respond({ ok: false }));
    return true;
  }
  if (message?.type !== 'open-image-chat') return;
  void (async () => {
    if (!sender.url?.startsWith('https://zappysoftware.com/backoffice/')) throw new Error('Origem inválida.');
    const url = new URL(makeWhatsAppUrl(message.phone, message.text));
    await chrome.tabs.create({ url: url.href, active: true });
    return { ok: true };
  })().then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});
