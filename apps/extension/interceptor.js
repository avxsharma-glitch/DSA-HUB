(() => {
  const marker = "__dsahubLeetCodeInterceptorInstalled";
  if (window[marker]) {
    window.postMessage({
      source: "DSAHUB_LEETCODE_INTERCEPTOR",
      type: "OBSERVER_READY"
    }, window.location.origin);
    return;
  }
  window[marker] = true;

  const seenSubmissionIds = new Set();
  const checkPath = /\/submissions\/detail\/(\d+)(?:\/check)?\/?$/i;

  function report(type, payload = {}) {
    window.postMessage({
      source: "DSAHUB_LEETCODE_INTERCEPTOR",
      type,
      payload
    }, window.location.origin);
  }

  function getSubmissionId(input) {
    try {
      let rawUrl = input;
      if (typeof input !== "string") {
        if (input instanceof URL) rawUrl = input.href;
        else if (input && typeof input.url === "string") rawUrl = input.url;
      }
      if (typeof rawUrl !== "string") return null;

      const url = new URL(rawUrl, window.location.href);
      if (url.hostname !== "leetcode.com" && url.hostname !== "www.leetcode.com") return null;
      return url.pathname.match(checkPath)?.[1] ?? null;
    } catch {
      return null;
    }
  }

  function inspectCheckResponse(submissionId, data) {
    if (!submissionId || seenSubmissionIds.has(submissionId) || !data || typeof data !== "object") return;

    const result = data.data && typeof data.data === "object" ? data.data : data;
    const statusMessage = typeof result.status_msg === "string" ? result.status_msg : "";
    const statusCode = Number(result.status_code);
    const accepted = statusMessage.toLowerCase() === "accepted" || statusCode === 10;

    if (!accepted) {
      if (statusMessage || Number.isFinite(statusCode)) {
        report("SUBMISSION_CHECK_RESULT", {
          submissionId,
          status: statusMessage || (Number.isFinite(statusCode) ? "Processing" : "Unknown")
        });
      }
      return;
    }

    seenSubmissionIds.add(submissionId);
    report("ACCEPTED_SUBMISSION", {
      submissionId,
      language: typeof result.lang === "string" ? result.lang : null,
      runtime: typeof result.runtime === "string" || typeof result.runtime === "number" ? result.runtime : null,
      memory: typeof result.memory === "string" || typeof result.memory === "number" ? result.memory : null,
      totalCorrect: result.total_correct !== null && result.total_correct !== undefined &&
        Number.isSafeInteger(Number(result.total_correct)) ? Number(result.total_correct) : null,
      totalTestcases: result.total_testcases !== null && result.total_testcases !== undefined &&
        Number.isSafeInteger(Number(result.total_testcases)) ? Number(result.total_testcases) : null,
      submittedAt: new Date().toISOString()
    });
  }

  report("OBSERVER_READY");

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const submissionId = getSubmissionId(args[0]);
    if (submissionId) report("SUBMISSION_CHECK_REQUEST", { submissionId });

    const response = await Reflect.apply(originalFetch, this, args);
    if (submissionId && response.ok) {
      response.clone().json()
        .then((data) => inspectCheckResponse(submissionId, data))
        .catch(() => report("OBSERVER_RESPONSE_PARSE_FAILED", { submissionId }));
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
      report("SUBMISSION_CHECK_REQUEST", { submissionId });
      this.addEventListener("load", () => {
        try {
          const data = this.responseType === "json" ? this.response : JSON.parse(this.responseText);
          inspectCheckResponse(submissionId, data);
        } catch {
          report("OBSERVER_RESPONSE_PARSE_FAILED", { submissionId });
        }
      }, { once: true });
    }
    return Reflect.apply(originalSend, this, args);
  };
})();