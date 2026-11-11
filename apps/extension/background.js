chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "DSAHUB_PAGE_CONTEXT" && message.payload) chrome.storage.local.set({ lastPageContext: message.payload });
});
