(() => {
  const isLeetCode = location.hostname === "leetcode.com" || location.hostname === "www.leetcode.com";
  const platform = isLeetCode ? "leetcode" : location.hostname.includes("geeksforgeeks.org") ? "geeksforgeeks" : "unknown";

  chrome.runtime.sendMessage({
    type: "DSAHUB_PAGE_CONTEXT",
    payload: {
      platform,
      url: location.href,
      title: document.title,
      capturedAt: new Date().toISOString()
    }
  });

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
    return /s(?:ec(?:ond)?s?)?$/i.test(String(value).trim()) ? Math.round(amount * 1000) : Math.round(amount);
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

  if (!isLeetCode) return;

  const seen = new Set();
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== "DSAHUB_LEETCODE_INTERCEPTOR" ||
        event.data?.type !== "ACCEPTED_SUBMISSION" ||
        !event.data?.payload) return;

    const payload = event.data.payload;
    const submissionId = String(payload.submissionId ?? "");
    if (!/^\d{1,40}$/.test(submissionId) || seen.has(submissionId)) return;

    const context = getProblemContext();
    if (!context.problemId || !context.title) return;
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

    chrome.runtime.sendMessage({ type: "DSAHUB_ACCEPTED_SUBMISSION", payload: submission });
  });
})();