(() => {
  function pathnameOf(url, base) {
    try {
      return new URL(url, base).pathname;
    } catch {
      return String(url ?? "");
    }
  }

  function slugFromPath(pathname) {
    const match = String(pathname).match(/\/problems\/([a-z0-9-]+)/i);
    return match ? match[1] : null;
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function unwrapResponse(value) {
    if (!isRecord(value)) return value;
    return isRecord(value.data) ? value.data : value;
  }

  function looksLikeSubmitBody(value) {
    return isRecord(value) &&
      typeof value.typed_code === "string" &&
      typeof value.lang === "string";
  }

  function looksLikeCheckPayload(value) {
    const payload = unwrapResponse(value);
    return isRecord(payload) && "state" in payload && "status_code" in payload;
  }

  function idFromPayload(value) {
    const payload = unwrapResponse(value);
    if (!isRecord(payload)) return null;
    const candidate = payload.submission_id ?? payload.submissionId ?? payload.id;
    return candidate !== undefined && candidate !== null ? String(candidate) : null;
  }

  function safeXhrResponseText(xhr) {
    try {
      const type = xhr.responseType;
      if (type === "" || type === "text") return xhr.responseText;
      if (type === "json") {
        return xhr.response === null || xhr.response === undefined ? null : JSON.stringify(xhr.response);
      }
      return null;
    } catch {
      return null;
    }
  }

  globalThis.DSAHubInterceptorUtils = Object.freeze({
    pathnameOf,
    slugFromPath,
    safeJsonParse,
    isRecord,
    unwrapResponse,
    looksLikeSubmitBody,
    looksLikeCheckPayload,
    idFromPayload,
    safeXhrResponseText
  });
})();
