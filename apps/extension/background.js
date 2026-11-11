const DEFAULT_API_BASE = "http://localhost:3000";

async function syncAcceptedSubmission(submission) {
  const settings = await chrome.storage.local.get(["extensionToken", "apiBase"]);
  const token = settings.extensionToken;
  const apiBase = String(settings.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");

  if (!token) {
    await chrome.storage.local.set({
      lastSyncStatus: "Not connected. Generate an extension key in your DSAHub dashboard and paste it in this popup."
    });
    return;
  }

  try {
    const response = await fetch(apiBase + "/api/extension-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(12000)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Sync failed with HTTP " + response.status);
    }

    await chrome.storage.local.set({
      lastSyncStatus: result.duplicate ? "Already synced (duplicate ignored)." : "Accepted submission synced to DSAHub.",
      lastSyncAt: new Date().toISOString()
    });
  } catch (error) {
    await chrome.storage.local.set({
      lastSyncStatus: error instanceof Error ? error.message : "Could not sync submission."
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "DSAHUB_PAGE_CONTEXT" && message.payload) {
    chrome.storage.local.set({ lastPageContext: message.payload });
    return;
  }

  if (message?.type === "DSAHUB_ACCEPTED_SUBMISSION" && message.payload) {
    chrome.storage.local.set({
      lastAcceptedSubmission: message.payload,
      lastSyncStatus: "Accepted submission detected. Syncing metadata…"
    }).then(() => syncAcceptedSubmission(message.payload));
    return;
  }

  if (message?.type === "DSAHUB_RETRY_LAST_SUBMISSION") {
    chrome.storage.local.get("lastAcceptedSubmission").then(({ lastAcceptedSubmission }) => {
      if (!lastAcceptedSubmission) {
        sendResponse({ success: false, error: "No accepted submission has been captured yet." });
        return;
      }
      syncAcceptedSubmission(lastAcceptedSubmission).then(() => sendResponse({ success: true }));
    });
    return true;
  }
});