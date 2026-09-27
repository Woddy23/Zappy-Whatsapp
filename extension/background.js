"use strict";
(() => {
  // src/background.ts
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage().catch(() => {
    });
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== "open-settings") return;
    chrome.runtime.openOptionsPage().then(
      () => respond({ ok: true }),
      () => respond({ ok: false })
    );
    return true;
  });
})();
