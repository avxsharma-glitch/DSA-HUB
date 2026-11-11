const status = document.getElementById("status");
chrome.storage.local.get("lastPageContext", ({ lastPageContext }) => {
  if (!lastPageContext) { status.textContent = "Open LeetCode or GeeksforGeeks to detect the current page."; return; }
  status.textContent = `Detected ${lastPageContext.platform}: ${lastPageContext.title}`;
});
