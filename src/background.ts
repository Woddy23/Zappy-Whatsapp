chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'open-settings') return;
  chrome.runtime.openOptionsPage().then(
    () => respond({ ok: true }),
    () => respond({ ok: false })
  );
  return true;
});
