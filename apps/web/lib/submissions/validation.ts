import type { Difficulty, PlatformId } from "@/lib/db/models";

export interface NewSubmissionInput {
  platform: PlatformId;
  externalSubmissionId: string;
  problemId: string;
  title: string;
  problemUrl: string;
  status: "Accepted";
  language?: string;
  difficulty?: Difficulty;
  topics: string[];
  submittedAt: Date;
}

type ValidationResult =
  | { success: true; data: NewSubmissionInput }
  | { success: false; error: string };

const allowedKeys = new Set([
  "platform",
  "externalSubmissionId",
  "problemId",
  "title",
  "problemUrl",
  "status",
  "language",
  "difficulty",
  "topics",
  "submittedAt"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function validateNewSubmission(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Request body must be a JSON object." };
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      return { success: false, error: "Unsupported field: " + key };
    }
  }

  const platform = value.platform;
  if (platform !== "leetcode" && platform !== "geeksforgeeks") {
    return { success: false, error: "platform must be leetcode or geeksforgeeks." };
  }

  if (!isNonEmptyString(value.externalSubmissionId, 128)) {
    return { success: false, error: "externalSubmissionId is required and must be at most 128 characters." };
  }
  if (!isNonEmptyString(value.problemId, 160)) {
    return { success: false, error: "problemId is required and must be at most 160 characters." };
  }
  if (!isNonEmptyString(value.title, 200)) {
    return { success: false, error: "title is required and must be at most 200 characters." };
  }
  if (!isNonEmptyString(value.problemUrl, 800)) {
    return { success: false, error: "problemUrl is required and must be a valid HTTPS URL." };
  }
  if (value.status !== "Accepted") {
    return { success: false, error: "Only Accepted submissions can be recorded in this MVP." };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value.problemUrl);
  } catch {
    return { success: false, error: "problemUrl is not a valid URL." };
  }

  if (parsedUrl.protocol !== "https:") {
    return { success: false, error: "problemUrl must use HTTPS." };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const allowedDomain = platform === "leetcode" ? "leetcode.com" : "geeksforgeeks.org";
  if (host !== allowedDomain && !host.endsWith("." + allowedDomain)) {
    return { success: false, error: "problemUrl host does not match the selected platform." };
  }

  let language: string | undefined;
  if (value.language !== undefined) {
    if (!isNonEmptyString(value.language, 60)) {
      return { success: false, error: "language must be a non-empty string of at most 60 characters." };
    }
    language = value.language.trim();
  }

  let difficulty: Difficulty | undefined;
  if (value.difficulty !== undefined) {
    if (value.difficulty !== "Easy" && value.difficulty !== "Medium" && value.difficulty !== "Hard") {
      return { success: false, error: "difficulty must be Easy, Medium, or Hard." };
    }
    difficulty = value.difficulty;
  }

  let topics: string[] = [];
  if (value.topics !== undefined) {
    if (!Array.isArray(value.topics) || value.topics.length > 20) {
      return { success: false, error: "topics must be an array containing at most 20 labels." };
    }
    if (!value.topics.every((topic) => isNonEmptyString(topic, 60))) {
      return { success: false, error: "Each topic must be a non-empty string of at most 60 characters." };
    }
    topics = [...new Set(value.topics.map((topic) => topic.trim()))];
  }

  let submittedAt = new Date();
  if (value.submittedAt !== undefined) {
    if (typeof value.submittedAt !== "string") {
      return { success: false, error: "submittedAt must be an ISO date string." };
    }
    submittedAt = new Date(value.submittedAt);
    if (Number.isNaN(submittedAt.getTime())) {
      return { success: false, error: "submittedAt must be a valid date." };
    }
    if (submittedAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return { success: false, error: "submittedAt cannot be more than five minutes in the future." };
    }
  }

  return {
    success: true,
    data: {
      platform,
      externalSubmissionId: value.externalSubmissionId.trim(),
      problemId: value.problemId.trim(),
      title: value.title.trim(),
      problemUrl: parsedUrl.toString(),
      status: "Accepted",
      language,
      difficulty,
      topics,
      submittedAt
    }
  };
}
