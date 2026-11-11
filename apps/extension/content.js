(() => {
  const platform = location.hostname.includes("leetcode.com") ? "leetcode" : location.hostname.includes("geeksforgeeks.org") ? "geeksforgeeks" : "unknown";
  chrome.runtime.sendMessage({ type: "DSAHUB_PAGE_CONTEXT", payload: { platform, url: location.href, title: document.title, capturedAt: new Date().toISOString() } });
})();
