(() => {
  const marker = "__dsahubLeetCodeInterceptorInstalled";
  if (window[marker]) {
    window.postMessage({ source: "DSAHUB_LEETCODE_INTERCEPTOR", type: "OBSERVER_READY" }, window.location.origin);
    return;
  }
  window[marker] = true;

  const seenSubmissionIds = new Set();
  const checkPath = /\/submissions\/detail\/(\d+)(?:\/check)?\/?$/i;
  const submitPath = /\/problems\/([^/]+)\/submit\/?$/i;

  function report(type, payload = {}) {
    window.postMessage({
      source: "DSAHUB_LEETCODE_INTERCEPTOR",
      type,
      payload
    }, window.location.origin);
  }

  function getRequestInfo(input) {
    try {
      let rawUrl = input;
      if (typeof input !== "string") {
        if (input instanceof URL) rawUrl = input.href;
        else if (input && typeof input.url === "string") rawUrl = input.url;
      }
      if (typeof rawUrl !== "string") return null;

      const url = new URL(rawUrl, window.location.href);
      if (url.hostname !== "leetcode.com" && url.hostname !== "www.leetcode.com") return null;

      const checkMatch = url.pathname.match(checkPath);
      if (checkMatch) return { kind: "check", submissionId: checkMatch[1] };
      const submitMatch = url.pathname.match(submitPath);
      if (submitMatch) return { kind: "submit", slug: submitMatch[1] };
      return null;
    } catch {
      return null;
    }
  }

  function inspectSubmitResponse(data, slug) {
    const result = data && typeof data === "object" && data.data && typeof data.data === "object"
      ? data.data
      : data;
    const submissionId = result && (result.submission_id ?? result.submissionId);
    if (submissionId === null || submissionId === undefined) {
      report("SUBMIT_RESPONSE_WITHOUT_ID", { slug });
      return;
    }
    report("SUBMISSION_ID_CREATED", {
      submissionId: String(submissionId),
      slug,
      submittedAt: new Date().toISOString()
    });
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
      language: typeof result.pretty_lang === "string" ? result.pretty_lang :
        (typeof result.lang === "string" ? result.lang : null),
      runtime: typeof result.status_runtime === "string" || typeof result.status_runtime === "number"
        ? result.status_runtime
        : (typeof result.runtime === "string" || typeof result.runtime === "number" ? result.runtime : null),
      memory: typeof result.status_memory === "string" || typeof result.status_memory === "number"
        ? result.status_memory
        : (typeof result.memory === "string" || typeof result.memory === "number" ? result.memory : null),
      totalCorrect: result.total_correct !== null && result.total_correct !== undefined &&
        Number.isSafeInteger(Number(result.total_correct)) ? Number(result.total_correct) : null,
      totalTestcases: result.total_testcases !== null && result.total_testcases !== undefined &&
        Number.isSafeInteger(Number(result.total_testcases)) ? Number(result.total_testcases) : null,
      submittedAt: new Date().toISOString()
    });
  }

  function inspectResponse(kind, response, slug, submissionId) {
    if (!response?.ok) return;
    response.clone().json().then((data) => {
      if (kind === "submit") inspectSubmitResponse(data, slug);
      if (kind === "check") inspectCheckResponse(submissionId, data);
    }).catch(() => report("OBSERVER_RESPONSE_PARSE_FAILED", { kind, slug, submissionId }));
  }

  report("OBSERVER_READY");

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const info = getRequestInfo(args[0]);
    if (info?.kind === "submit") report("SUBMIT_REQUEST", { slug: info.slug });
    if (info?.kind === "check") report("SUBMISSION_CHECK_REQUEST", { submissionId: info.submissionId });

    const response = await Reflect.apply(originalFetch, this, args);
    if (info) inspectResponse(info.kind, response, info.slug, info.submissionId);
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__dsahubRequestInfo = getRequestInfo(url);
    return Reflect.apply(originalOpen, this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const info = this.__dsahubRequestInfo;
    if (info?.kind === "submit") report("SUBMIT_REQUEST", { slug: info.slug });
    if (info?.kind === "check") report("SUBMISSION_CHECK_REQUEST", { submissionId: info.submissionId });

    if (info) {
      this.addEventListener("load", () => {
        try {
          const data = this.responseType === "json" ? this.response : JSON.parse(this.responseText);
          if (info.kind === "submit") inspectSubmitResponse(data, info.slug);
          if (info.kind === "check") inspectCheckResponse(info.submissionId, data);
        } catch {
          report("OBSERVER_RESPONSE_PARSE_FAILED", info);
        }
      }, { once: true });
    }
    return Reflect.apply(originalSend, this, args);
  };
})();