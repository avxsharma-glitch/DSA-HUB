(() => {
  const marker = "__dsahubLeetCodeInterceptorInstalled";
  if (window[marker]) return;
  window[marker] = true;

  const seenSubmissionIds = new Set();
  const checkPath = /\/submissions\/detail\/(\d+)\/check\/?$/;

  function getSubmissionId(input) {
    try {
      const rawUrl = typeof input === "string" ? input : input?.url;
      if (!rawUrl) return null;
      const url = new URL(rawUrl, window.location.href);
      if (url.hostname !== "leetcode.com" && url.hostname !== "www.leetcode.com") return null;
      return url.pathname.match(checkPath)?.[1] ?? null;
    } catch {
      return null;
    }
  }

  function inspectCheckResponse(submissionId, data) {
    if (!submissionId || seenSubmissionIds.has(submissionId) || !data || typeof data !== "object") return;

    const accepted = String(data.status_msg ?? "").toLowerCase() === "accepted" ||
      Number(data.status_code) === 10;
    if (!accepted) return;

    seenSubmissionIds.add(submissionId);
    window.postMessage({
      source: "DSAHUB_LEETCODE_INTERCEPTOR",
      type: "ACCEPTED_SUBMISSION",
      payload: {
        submissionId,
        submittedAt: new Date().toISOString()
      }
    }, window.location.origin);
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const submissionId = getSubmissionId(args[0]);
    const response = await Reflect.apply(originalFetch, this, args);

    if (submissionId && response.ok) {
      response.clone().json()
        .then((data) => inspectCheckResponse(submissionId, data))
        .catch(() => undefined);
    }

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__dsahubSubmissionId = getSubmissionId(url);
    return Reflect.apply(originalOpen, this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const submissionId = this.__dsahubSubmissionId;
    if (submissionId) {
      this.addEventListener("load", () => {
        try {
          const data = this.responseType === "json" ? this.response : JSON.parse(this.responseText);
          inspectCheckResponse(submissionId, data);
        } catch {
          // Ignore non-JSON or incomplete responses.
        }
      }, { once: true });
    }
    return Reflect.apply(originalSend, this, args);
  };
})();
