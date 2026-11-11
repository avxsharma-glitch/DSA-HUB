export type PlatformId = "leetcode" | "geeksforgeeks";
export interface PageContext { platform: PlatformId; url: string; title: string; capturedAt: string; }
export interface SubmissionRecord { userId: string; platform: PlatformId; problemId: string; title: string; language?: string; difficulty?: "Easy" | "Medium" | "Hard"; submittedAt: string; }
