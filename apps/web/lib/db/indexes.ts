import "server-only";

import type { Db } from "mongodb";

const indexSetupByDatabase = new WeakMap<Db, Promise<void>>();

export async function ensureDataIndexes(db: Db): Promise<void> {
  const existingSetup = indexSetupByDatabase.get(db);
  if (existingSetup) {
    await existingSetup;
    return;
  }

  const setup = Promise.all([
    // Auth.js MongoDB adapter collections.
    db.collection("users").createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
        name: "auth_user_email_unique"
      }
    ),
    db.collection("accounts").createIndex(
      { provider: 1, providerAccountId: 1 },
      { unique: true, name: "auth_account_provider_unique" }
    ),
    db.collection("sessions").createIndex(
      { sessionToken: 1 },
      { unique: true, name: "auth_session_token_unique" }
    ),
    db.collection("sessions").createIndex(
      { expires: 1 },
      { expireAfterSeconds: 0, name: "auth_session_expiry_ttl" }
    ),
    db.collection("verification_tokens").createIndex(
      { identifier: 1, token: 1 },
      { unique: true, name: "auth_verification_token_unique" }
    ),
    db.collection("verification_tokens").createIndex(
      { expires: 1 },
      { expireAfterSeconds: 0, name: "auth_verification_expiry_ttl" }
    ),

    // DSAHub application collections.
    db.collection("profiles").createIndex(
      { userId: 1 },
      { unique: true, name: "profile_user_unique" }
    ),
    db.collection("connectedPlatforms").createIndex(
      { userId: 1, platform: 1 },
      { unique: true, name: "connected_platform_user_unique" }
    ),
    db.collection("extensionTokens").createIndex(
      { userId: 1 },
      { unique: true, name: "extension_token_user_unique" }
    ),
    db.collection("submissions").createIndex(
      { userId: 1, platform: 1, externalSubmissionId: 1 },
      { unique: true, name: "submission_external_id_unique" }
    ),
    db.collection("submissions").createIndex(
      { userId: 1, submittedAt: -1 },
      { name: "submission_user_date" }
    ),
    db.collection("githubSyncRecords").createIndex(
      { userId: 1, createdAt: -1 },
      { name: "github_sync_user_date" }
    ),
    db.collection("goals").createIndex(
      { userId: 1, isActive: 1 },
      { name: "goal_user_active" }
    )
  ]).then(() => undefined);

  indexSetupByDatabase.set(db, setup);

  try {
    await setup;
  } catch (error) {
    indexSetupByDatabase.delete(db);
    throw error;
  }
}
