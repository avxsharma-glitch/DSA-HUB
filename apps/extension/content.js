(() => {
  const isLeetCode = location.hostname === "leetcode.com" || location.hostname === "www.leetcode.com";
  const platform = isLeetCode ? "leetcode" : location.hostname.includes("geeksforgeeks.org") ? "geeksforgeeks" : "unknown";

  function sendStatus(status) {
    chrome.runtime.sendMessage({ type: "DSAHUB_OBSERVER_STATUS", status });
  }

  chrome.runtime.sendMessage({
    type: "DSAHUB_PAGE_CONTEXT",
    payload: {
      platform,
      url: location.href,
      title: document.title,
      capturedAt: new Date().toISOString()
    }
  });

  if (!isLeetCode) return;

  function getProblemContext() {
    const match = location.pathname.match(/\/problems\/([^/]+)/);
    const problemId = match?.[1] ?? "";
    const titleFromDocument = document.title.split(/\s[-|] LeetCode/i)[0].trim();
    const titleFromHeading = document.querySelector("div[data-cy='question-title'], h1")?.textContent?.trim();
    const title = titleFromHeading || titleFromDocument || problemId.replace(/-/g, " ");

    const difficultyElement = document.querySelector("[class*='text-difficulty'], [class*='text-olive'], [class*='text-yellow'], [class*='text-pink']");
    const difficultyText = difficultyElement?.textContent?.trim();
    const difficulty = ["Easy", "Medium", "Hard"].find((item) => item.toLowerCase() === difficultyText?.toLowerCase());

    return {
      problemId,
      title: title.slice(0, 200),
      problemUrl: location.origin + location.pathname,
      difficulty
    };
  }

  function parseRuntime(value) {
    if (value === null || value === undefined) return undefined;
    const match = String(value).match(/[0-9]+(?:\.[0-9]+)?/);
    if (!match) return undefined;
    const amount = Number(match[0]);
    return /\s*(?:sec(?:ond)?s?|s)$/i.test(String(value).trim()) && !/ms$/i.test(String(value).trim())
      ? Math.round(amount * 1000)
      : Math.round(amount);
  }

  function parseMemoryKb(value) {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    const match = text.match(/[0-9]+(?:\.[0-9]+)?/);
    if (!match) return undefined;
    const amount = Number(match[0]);
    if (/gb/i.test(text)) return Math.round(amount * 1024 * 1024);
    if (/mb/i.test(text)) return Math.round(amount * 1024);
    if (/kb/i.test(text)) return Math.round(amount);
    if (/bytes?/i.test(text)) return Math.round(amount / 1024);
    return undefined;
  }

  function normalizeLanguage(language) {
    if (!language) return undefined;
    const known = {
      cpp: "C++", "c++": "C++", python: "Python", python3: "Python 3",
      java: "Java", javascript: "JavaScript", typescript: "TypeScript",
      c: "C", csharp: "C#", golang: "Go", rust: "Rust", kotlin: "Kotlin",
      swift: "Swift", ruby: "Ruby", php: "PHP", scala: "Scala"
    };
    const normalized = String(language).trim().toLowerCase();
    return (known[normalized] || String(language).trim()).slice(0, 60);
  }

  const seen = new Set();

  function handleAccepted(payload, source) {
    const submissionId = String(payload.submissionId ?? "");
    if (!/^(?:\d{1,40}|dom-\d{10,})$/.test(submissionId) || seen.has(submissionId)) return;

    const context = getProblemContext();
    if (!context.problemId || !context.title) {
      sendStatus("Accepted result detected, but the problem URL/title could not be read.");
      return;
    }
    seen.add(submissionId);

    const submission = {
      platform: "leetcode",
      externalSubmissionId: submissionId,
      ...context,
      status: "Accepted",
      language: normalizeLanguage(payload.language),
      runtimeMs: parseRuntime(payload.runtime),
      memoryKb: parseMemoryKb(payload.memory),
      totalCorrect: Number.isSafeInteger(payload.totalCorrect) && payload.totalCorrect >= 0 ? payload.totalCorrect : undefined,
      totalTestcases: Number.isSafeInteger(payload.totalTestcases) && payload.totalTestcases >= 0 ? payload.totalTestcases : undefined,
      topics: [],
      submittedAt: typeof payload.submittedAt === "string" ? payload.submittedAt : new Date().toISOString()
    };

    sendStatus("Accepted submission detected (" + source + "). Sending metadata to DSAHub…");
    chrome.runtime.sendMessage({ type: "DSAHUB_ACCEPTED_SUBMISSION", payload: submission });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== "DSAHUB_LEETCODE_INTERCEPTOR") return;

    if (event.data.type === "OBSERVER_READY") {
      sendStatus("LeetCode observer active. Submit a new solution to capture its result.");
      return;
    }

    if (event.data.type === "SUBMISSION_CHECK_REQUEST") {
      sendStatus("LeetCode submission request detected. Waiting for the judge result…");
      return;
    }

    if (event.data.type === "SUBMISSION_CHECK_RESULT") {
      sendStatus("LeetCode judge response: " + String(event.data.payload?.status || "Processing"));
      return;
    }

    if (event.data.type === "OBSERVER_RESPONSE_PARSE_FAILED") {
      sendStatus("LeetCode request detected, but its response was not readable as JSON.");
      return;
    }

    if (event.data.type === "ACCEPTED_SUBMISSION" && event.data.payload) {
      handleAccepted(event.data.payload, "network observer");
    }
  });

  // DOM fallback: on a fresh Submit click, watch for LeetCode's Accepted result
  // banner. Use the check-request ID from performance entries when available.
  let lastSubmitAttemptAt = 0;

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button");
    if (!button) return;

    const label = (button.innerText || button.getAttribute("aria-label") || "").trim();
    if (/^submit$/i.test(label)) {
      lastSubmitAttemptAt = Date.now();
      sendStatus("Submit clicked. Waiting for LeetCode to finish judging…");
    }
  }, true);

  function findRecentSubmissionId() {
    const attemptStart = performance.now() - (Date.now() - lastSubmitAttemptAt) - 2000;
    const entries = performance.getEntriesByType("resource");
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry.startTime < attemptStart) continue;
      try {
        const url = new URL(entry.name);
        const match = url.pathname.match(/\/submissions\/detail\/(\d+)(?:\/check)?\/?$/i);
        if (url.hostname.endsWith("leetcode.com") && match) return match[1];
      } catch {
        // Ignore unrelated resources.
      }
    }
    return null;
  }

  function scanAcceptedResult() {
    if (!lastSubmitAttemptAt || Date.now() - lastSubmitAttemptAt > 5 * 60 * 1000) return;

    const resultElement = document.querySelector('[data-e2e-locator="submission-result"]');
    const resultText = resultElement?.textContent?.trim() || "";
    if (!/^Accepted\b/i.test(resultText)) return;

    const submissionId = findRecentSubmissionId() || "dom-" + String(lastSubmitAttemptAt);
    handleAccepted({
      submissionId,
      submittedAt: new Date(lastSubmitAttemptAt).toISOString()
    }, "result banner");
    lastSubmitAttemptAt = 0;
  }

  const resultObserver = new MutationObserver(scanAcceptedResult);
  resultObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  sendStatus("LeetCode page detector active. Waiting for the submission observer…");
})();