(() => {
  const marker = "__dsahubLeetCodeInterceptorInstalled";
  const U = globalThis.DSAHubInterceptorUtils;
  if (!U) {
    console.error("[DSAHub] LeetCode interceptor helpers are missing.");
    return;
  }

  function report(type, payload = {}) {
    window.postMessage({
      source: "DSAHUB_LEETCODE_INTERCEPTOR",
      type,
      payload
    }, window.location.origin);
  }

  if (window[marker]) {
    report("OBSERVER_READY");
    return;
  }
  window[marker] = true;

  const seenSubmissionIds = new Set();
  const slugBySubmissionId = new Map();
  let latestSubmission = null;

  const submitPath = /\/problems\/([a-z0-9-]+)\/submit\/?$/i;
  const checkPath = /\/submissions\/detail\/(\d+)\/(?:v\d+\/)?check\/?$/i;

  function currentSlug() {
    return U.slugFromPath(location.pathname);
  }

  function getRequestMeta(input, init) {
    try {
      let rawUrl = input;
      if (typeof input !== "string") {
        if (input instanceof URL) rawUrl = input.href;
        else if (input && typeof input.url === "string") rawUrl = input.url;
      }
      if (typeof rawUrl !== "string") return null;

      const url = new URL(rawUrl, location.href);
      if (url.hostname !== "leetcode.com" && url.hostname !== "www.leetcode.com") return null;
      const method = String(
        init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
      ).toUpperCase();

      const checkSubmissionId = U.submissionIdFromCheckPath(url.pathname);
      if (checkSubmissionId) return { kind: "check", method, submissionId: checkSubmissionId, pathname: url.pathname };

      const submitSlug = U.submitSlugFromPath(url.pathname);
      if (submitSlug && method === "POST") {
        return { kind: "submit", method, slug: submitSlug, pathname: url.pathname };
      }

      return { kind: "other", method, pathname: url.pathname };
    } catch {
      return null;
    }
  }

  async function getFetchBodyText(input, init) {
    if (typeof init?.body === "string") return init.body;
    if (typeof Request !== "undefined" && input instanceof Request) {
      try {
        return await input.clone().text();
      } catch {
        return null;
      }
    }
    return null;
  }

  function recognizeSubmitBody(bodyText, fallbackSlug) {
    const body = typeof bodyText === "string" ? U.safeJsonParse(bodyText) : null;
    if (!U.looksLikeSubmitBody(body)) return null;

    const slug = fallbackSlug || currentSlug();
    if (!slug) return null;
    latestSubmission = { slug, submittedAt: new Date().toISOString(), submissionId: null };
    report("SUBMIT_REQUEST", { slug });
    return slug;
  }

  function inspectSubmitResponse(data, slug) {
    if (!U.isRecord(data)) return;
    const id = U.idFromPayload(data);
    if (!id || !/^\d{1,40}$/.test(id)) {
      report("SUBMIT_RESPONSE_WITHOUT_ID", { slug });
      return;
    }

    const actualSlug = slug || currentSlug() || latestSubmission?.slug || null;
    if (!actualSlug) return;

    slugBySubmissionId.set(id, actualSlug);
    latestSubmission = {
      slug: actualSlug,
      submissionId: id,
      submittedAt: new Date().toISOString()
    };
    report("SUBMISSION_ID_CREATED", {
      submissionId: id,
      slug: actualSlug,
      submittedAt: latestSubmission.submittedAt
    });
  }

  function inspectCheckResponse(data, urlSubmissionId, fallbackSlug) {
    if (!U.looksLikeCheckPayload(data)) return;

    const result = U.unwrapResponse(data);
    const payloadId = U.idFromPayload(result);
    const submissionId = urlSubmissionId || payloadId || latestSubmission?.submissionId;
    if (!submissionId || !/^\d{1,40}$/.test(submissionId)) {
      report("CHECK_RESPONSE_WITHOUT_ID");
      return;
    }

    const slug = slugBySubmissionId.get(submissionId) ||
      fallbackSlug ||
      latestSubmission?.slug ||
      currentSlug();

    const statusCode = Number(result.status_code);
    const statusMessage = typeof result.status_msg === "string" ? result.status_msg : "";
    const state = typeof result.state === "string" ? result.state : "";
    const accepted = statusCode === 10 || statusMessage.toLowerCase() === "accepted";

    if (!accepted) {
      report("SUBMISSION_CHECK_RESULT", {
        submissionId,
        slug,
        status: statusMessage || (state ? state.replace(/_/g, " ") : "Judging")
      });
      return;
    }

    if (seenSubmissionIds.has(submissionId)) return;
    seenSubmissionIds.add(submissionId);

    report("ACCEPTED_SUBMISSION", {
      submissionId,
      slug,
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

  function shouldInspectFallbackResponse(meta, response) {
    if (!meta || (meta.method !== "GET" && meta.method !== "POST")) return false;
    if (meta.kind === "submit" || meta.kind === "check") return true;
    const contentType = response?.headers?.get?.("content-type") || "";
    return /json/i.test(contentType) &&
      /submission|submit|check|judge|graphql/i.test(meta.pathname);
  }

  function readResponse(response, callback) {
    try {
      response.clone().text().then((text) => {
        const data = U.safeJsonParse(text);
        if (data !== null) callback(data);
      }).catch(() => undefined);
    } catch {
      // Instrumentation must never affect LeetCode's request.
    }
  }

  report("OBSERVER_READY");

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const input = args[0];
    const init = args[1];
    const meta = getRequestMeta(input, init);
    let submittedSlug = meta?.kind === "submit" ? meta.slug : null;

    try {
      if (meta?.method === "POST" && meta.kind !== "submit") {
        submittedSlug = recognizeSubmitBody(await getFetchBodyText(input, init), null);
      } else if (meta?.kind === "submit") {
        const bodyText = await getFetchBodyText(input, init);
        const recognized = recognizeSubmitBody(bodyText, meta.slug);
        if (recognized) submittedSlug = recognized;
        else report("SUBMIT_REQUEST", { slug: meta.slug });
      }
      if (meta?.kind === "check") {
        report("SUBMISSION_CHECK_REQUEST", { submissionId: meta.submissionId });
      }
    } catch {
      // Keep the page request flowing even if its request body cannot be read.
    }

    const response = await Reflect.apply(originalFetch, this, args);
    if (shouldInspectFallbackResponse(meta, response)) {
      readResponse(response, (data) => {
        if (meta?.kind === "submit") inspectSubmitResponse(data, meta.slug);
        else if (meta?.kind === "check") inspectCheckResponse(data, meta.submissionId, null);
        else if (U.looksLikeCheckPayload(data)) inspectCheckResponse(data, null, latestSubmission?.slug);
        else if (submittedSlug) inspectSubmitResponse(data, submittedSlug);
      });
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__dsahubRequestMeta = getRequestMeta(url, { method });
    return Reflect.apply(originalOpen, this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const meta = this.__dsahubRequestMeta;
    let submittedSlug = meta?.kind === "submit" ? meta.slug : null;
    try {
      if (meta?.method === "POST" && meta.kind !== "submit" && typeof args[0] === "string") {
        submittedSlug = recognizeSubmitBody(args[0], null);
      } else if (meta?.kind === "submit") {
        const recognized = recognizeSubmitBody(typeof args[0] === "string" ? args[0] : null, meta.slug);
        if (recognized) submittedSlug = recognized;
        else report("SUBMIT_REQUEST", { slug: meta.slug });
      }
      if (meta?.kind === "check") {
        report("SUBMISSION_CHECK_REQUEST", { submissionId: meta.submissionId });
      }
    } catch {
      // Ignore body parsing failures; never interfere with the site request.
    }

    const shouldWatch = meta && (
      meta.kind === "submit" ||
      meta.kind === "check" ||
      (meta.method === "GET" || meta.method === "POST")
    );

    if (shouldWatch) {
      this.addEventListener("load", () => {
        const text = U.safeXhrResponseText(this);
        if (text === null) return;
        const data = U.safeJsonParse(text);
        if (meta.kind === "submit") inspectSubmitResponse(data, meta.slug);
        else if (meta.kind === "check") inspectCheckResponse(data, meta.submissionId, null);
        else if (U.looksLikeCheckPayload(data)) inspectCheckResponse(data, null, latestSubmission?.slug);
        else if (submittedSlug) inspectSubmitResponse(data, submittedSlug);
      }, { once: true });
    }

    return Reflect.apply(originalSend, this, args);
  };
})();
