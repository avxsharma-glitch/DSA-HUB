import type { Document, ObjectId } from "mongodb";

export type PlatformId = "leetcode" | "geeksforgeeks";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface UserProfileDocument extends Document {
  _id?: ObjectId;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  preferences: {
    theme: "dark" | "light";
    dailyGoal: number;
    weeklyGoal: number;
  };
  privacy: {
    publicProfile: boolean;
    shareActivity: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectedPlatformDocument extends Document {
  _id?: ObjectId;
  userId: string;
  platform: PlatformId;
  externalUsername: string;
  externalUserId?: string;
  isActive: boolean;
  connectedAt: Date;
  updatedAt: Date;
}

export interface SubmissionDocument extends Document {
  _id?: ObjectId;
  userId: string;
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
  createdAt: Date;
}

export interface GithubSyncRecordDocument extends Document {
  _id?: ObjectId;
  userId: string;
  submissionId: string;
  repositoryId: number;
  repositoryFullName: string;
  branch: string;
  filePath: string;
  status: "pending" | "success" | "failed";
  lastAttemptAt?: Date;
  syncedAt?: Date;
  errorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalDocument extends Document {
  _id?: ObjectId;
  userId: string;
  period: "daily" | "weekly";
  targetSolved: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
