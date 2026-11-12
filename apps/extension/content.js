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

  function getProblemContext(preferredSlug) {
    const currentMatch = location.pathname.match(/\/problems\/([^/]+)/);
    const currentSlug = currentMatch?.[1] ?? "";
    const problemId = preferredSlug || currentSlug;
    const isCurrentProblem = !preferredSlug || preferredSlug === currentSlug;

    const titleFromDocument = isCurrentProblem
      ? document.title.split(/\s[-|] LeetCode/i)[0].trim()
      : "";
    const titleFromHeading = isCurrentProblem
      ? document.querySelector("div[data-cy='question-title'], h1")?.textContent?.trim()
      : "";
    const titleFromSlug = problemId
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    const title = titleFromHeading || titleFromDocument || titleFromSlug;

    const difficultyElement = isCurrentProblem
      ? document.querySelector("[class*='text-difficulty'], [class*='text-olive'], [class*='text-yellow'], [class*='text-pink']")
      : null;
    const difficultyText = difficultyElement?.textContent?.trim();
    const difficulty = ["Easy", "Medium", "Hard"].find(
      (item) => item.toLowerCase() === difficultyText?.toLowerCase()
    );

    return {
      problemId,
      title: title.slice(0, 200),
      problemUrl: "https://leetcode.com/problems/" + problemId + "/",
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
    // LeetCode can use zero as an empty/unavailable sentinel.
    if (typeof value === "number" && Number.isFinite(value)) {
      return value > 0 ? Math.round(value * 1024) : undefined;
    }
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

  function extractVisibleResultMetadata() {
    // Read only the visible result labels and their values. Never read or send
    // the editor contents, source code, test input, or test output.
    const text = document.body?.innerText || "";
    const runtimeMatch = text.match(/\bRuntime\\s*[:：]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*ms\\b/i);
    const memoryMatch = text.match(/\bMemory\\s*[:：]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(KB|MB|GB)\\b/i);
    const testMatch = text.match(/\bAccepted\\s*([0-9]+)\\s*\\/\\s*([0-9]+)\\s*testcases?\\s*passed\\b/i);
    const languageMatch = text.match(/\bCode\\s*[|·]\\s*(C\\+\\+|C#|Python 3?|JavaScript|TypeScript|Java|Go|Rust|Kotlin|Swift|Ruby|PHP|C)\\b/i);

    return {
      language: languageMatch?.[1],
      runtime: runtimeMatch ? Number(runtimeMatch[1]) : undefined,
      memory: memoryMatch ? memoryMatch[1] + " " + memoryMatch[2] : undefined,
      totalCorrect: testMatch ? Number(testMatch[1]) : undefined,
      totalTestcases: testMatch ? Number(testMatch[2]) : undefined
    };
  }

  const seen = new Set();
  const submissionSlugById = new Map();

  function handleAccepted(payload, source) {
    const submissionId = String(payload.submissionId ?? "");
    if (!/^(?:\d{1,40}|dom-\d{10,})$/.test(submissionId) || seen.has(submissionId)) return;

    const preferredSlug = typeof payload.slug === "string" ? payload.slug : submissionSlugById.get(submissionId);
    const context = getProblemContext(preferredSlug);
    if (!context.problemId || !context.title) {
      sendStatus("Accepted result detected, but the problem URL/title could not be read.");
      return;
    }
    seen.add(submissionId);

    const visible = extractVisibleResultMetadata();
    const language = normalizeLanguage(payload.language) || normalizeLanguage(visible.language);
    const runtimeMs = parseRuntime(payload.runtime) ?? parseRuntime(visible.runtime);
    const memoryKb = parseMemoryKb(payload.memory) ?? parseMemoryKb(visible.memory);
    const totalCorrect = Number.isSafeInteger(payload.totalCorrect) && payload.totalCorrect >= 0
      ? payload.totalCorrect
      : visible.totalCorrect;
    const totalTestcases = Number.isSafeInteger(payload.totalTestcases) && payload.totalTestcases >= 0
      ? payload.totalTestcases
      : visible.totalTestcases;

    const submission = {
      platform: "leetcode",
      externalSubmissionId: submissionId,
      ...context,
      status: "Accepted",
      language,
      runtimeMs,
      memoryKb,
      totalCorrect,
      totalTestcases,
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

    if (event.data.type === "SUBMIT_REQUEST") {
      sendStatus("LeetCode Submit request detected. Waiting for submission ID and judge result…");
      return;
    }

    if (event.data.type === "SUBMISSION_ID_CREATED") {
      const id = String(event.data.payload?.submissionId || "");
      const slug = event.data.payload?.slug;
      if (/^\d{1,40}$/.test(id) && typeof slug === "string" && slug) {
        submissionSlugById.set(id, slug);
      }
      sendStatus("LeetCode assigned submission ID " + id + ". Waiting for the judge result…");
      return;
    }

    if (event.data.type === "SUBMISSION_CHECK_REQUEST") {
      sendStatus("LeetCode submission-check request detected. Waiting for the judge result…");
      return;
    }

    if (event.data.type === "SUBMISSION_CHECK_RESULT") {
      const id = String(event.data.payload?.submissionId || "");
      const slug = event.data.payload?.slug;
      if (/^\d{1,40}$/.test(id) && typeof slug === "string" && slug) {
        submissionSlugById.set(id, slug);
      }
      sendStatus("LeetCode judge response: " + String(event.data.payload?.status || "Processing"));
      return;
    }

    if (event.data.type === "SUBMIT_RESPONSE_WITHOUT_ID") {
      sendStatus("LeetCode received the Submit request, but no submission ID was present in its response.");
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

  // DOM fallback: require the result panel to change after the current
  // submit click so an old Accepted banner cannot be re-used for a later problem.
  let lastSubmitAttempt = null;

  function getResultElement() {
    return document.querySelector('[data-e2e-locator="submission-result"]');
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button");
    if (!button) return;

    const label = (button.innerText || button.getAttribute("aria-label") || "").trim();
    if (/^submit$/i.test(label)) {
      const currentSlug = location.pathname.match(/\/problems\/([^/]+)/)?.[1] ?? "";
      lastSubmitAttempt = {
        startedAt: Date.now(),
        slug: currentSlug,
        previousResult: getResultElement()?.textContent?.trim() ?? ""
      };
      sendStatus("Submit clicked for " + (currentSlug || "this problem") + ". Waiting for LeetCode to finish judging…");
    }
  }, true);

  function findRecentSubmissionId(attempt) {
    const attemptStart = performance.now() - (Date.now() - attempt.startedAt) - 2000;
    const entries = performance.getEntriesByType("resource");
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry.startTime < attemptStart) continue;
      try {
        const url = new URL(entry.name);
        const match = url.pathname.match(/\/submissions\/detail\/(\d+)\/(?:v\d+\/)?check\/?$/i);
        if (url.hostname.endsWith("leetcode.com") && match) return match[1];
      } catch {
        // Ignore unrelated resources.
      }
    }
    return null;
  }

  function scanAcceptedResult() {
    if (!lastSubmitAttempt || Date.now() - lastSubmitAttempt.startedAt > 5 * 60 * 1000) return;

    const currentSlug = location.pathname.match(/\/problems\/([^/]+)/)?.[1] ?? "";
    if (currentSlug !== lastSubmitAttempt.slug) return;

    const resultText = getResultElement()?.textContent?.trim() ?? "";
    if (!resultText || resultText === lastSubmitAttempt.previousResult || !/^Accepted\b/i.test(resultText)) return;

    const attempt = lastSubmitAttempt;
    const submissionId = findRecentSubmissionId(attempt) || "dom-" + String(attempt.startedAt);
    handleAccepted({
      submissionId,
      slug: attempt.slug,
      submittedAt: new Date(attempt.startedAt).toISOString()
    }, "updated result banner");
    lastSubmitAttempt = null;
  }

  const resultObserver = new MutationObserver(scanAcceptedResult);
  resultObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener("popstate", () => {
    chrome.runtime.sendMessage({
      type: "DSAHUB_PAGE_CONTEXT",
      payload: {
        platform: "leetcode",
        url: location.href,
        title: document.title,
        capturedAt: new Date().toISOString()
      }
    });
  });

  sendStatus("LeetCode page detector active. Waiting for the submission observer…");
})();
