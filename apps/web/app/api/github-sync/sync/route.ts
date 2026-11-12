import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { GithubInstallationDocument, GithubSyncRecordDocument, GithubSyncSettingsDocument, SubmissionDocument } from "@/lib/db/models";
import { getGithubFileSha, writeGithubFile } from "@/lib/github/app";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extensionForLanguage(language: string | undefined): string {
  const normalized = language?.toLowerCase() ?? "";
  if (normalized.includes("python")) return "py";
  if (normalized.includes("javascript")) return "js";
  if (normalized.includes("typescript")) return "ts";
  if (normalized.includes("java")) return "java";
  if (normalized.includes("c++") || normalized === "cpp") return "cpp";
  if (normalized === "c") return "c";
  if (normalized.includes("c#") || normalized.includes("csharp")) return "cs";
  if (normalized.includes("golang") || normalized === "go") return "go";
  if (normalized.includes("rust")) return "rs";
  if (normalized.includes("kotlin")) return "kt";
  if (normalized.includes("swift")) return "swift";
  if (normalized.includes("ruby")) return "rb";
  if (normalized.includes("php")) return "php";
  return "txt";
}

function safeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "solution";
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const submissionId = typeof value.submissionId === "string" ? value.submissionId : "";
  const sourceCode = typeof value.sourceCode === "string" ? value.sourceCode : "";
  const consent = value.confirmCodeSync === true;

  if (!ObjectId.isValid(submissionId)) return NextResponse.json({ error: "Select a valid saved submission." }, { status: 400 });
  if (!consent) return NextResponse.json({ error: "Explicit confirmation is required before sending code to GitHub." }, { status: 400 });
  if (!sourceCode.trim() || Buffer.byteLength(sourceCode, "utf8") > 200_000) {
    return NextResponse.json({ error: "Solution code is required and must be at most 200 KB." }, { status: 400 });
  }

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const [installation, settings, submission] = await Promise.all([
    db.collection<GithubInstallationDocument>("githubInstallations").findOne({ userId: user.id }),
    db.collection<GithubSyncSettingsDocument>("githubSyncSettings").findOne({ userId: user.id, enabled: true }),
    db.collection<SubmissionDocument>("submissions").findOne({ _id: new ObjectId(submissionId), userId: user.id })
  ]);

  if (!installation) return NextResponse.json({ error: "Connect your GitHub App installation first." }, { status: 409 });
  if (!settings) return NextResponse.json({ error: "Save and enable a GitHub repository in GitHub Sync settings first." }, { status: 409 });
  if (!submission) return NextResponse.json({ error: "The selected submission was not found in your account." }, { status: 404 });

  const language = submission.language ?? "text";
  const extension = extensionForLanguage(submission.language);
  const filename = safeSlug(submission.problemId) + "." + extension;
  const filePath = [settings.folderPath, filename].filter(Boolean).join("/");
  const [owner, repository] = settings.repositoryFullName.split("/");
  const records = db.collection<GithubSyncRecordDocument>("githubSyncRecords");
  const submissionKey = submission._id!.toString();
  const existingRecord = await records.findOne({ userId: user.id, submissionId: submissionKey });

  const now = new Date();
  try {
    const existingFileSha = await getGithubFileSha({
      installationId: installation.installationId,
      repositoryId: settings.repositoryId,
      owner,
      repository,
      path: filePath,
      branch: settings.branch
    });

    if (existingFileSha && !existingRecord) {
      return NextResponse.json({
        error: "A file already exists at " + filePath + ". DSAHub will not overwrite a file it did not create."
      }, { status: 409 });
    }

    await records.updateOne(
      { userId: user.id, submissionId: submissionKey },
      {
        $set: {
          userId: user.id,
          submissionId: submissionKey,
          repositoryId: settings.repositoryId,
          repositoryFullName: settings.repositoryFullName,
          branch: settings.branch,
          filePath,
          status: "pending",
          lastAttemptAt: now,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    const result = await writeGithubFile({
      installationId: installation.installationId,
      repositoryId: settings.repositoryId,
      owner,
      repository,
      path: filePath,
      branch: settings.branch,
      content: sourceCode,
      message: (existingFileSha ? "Update" : "Add") + " " + submission.title + " via DSAHub",
      existingFileSha: existingFileSha ?? undefined
    });

    await records.updateOne(
      { userId: user.id, submissionId: submissionKey },
      {
        $set: {
          status: "success",
          syncedAt: new Date(),
          updatedAt: new Date(),
          errorCode: undefined
        }
      }
    );

    return NextResponse.json({
      success: true,
      filePath,
      repositoryUrl: result.html_url,
      commitSha: result.commit.sha,
      updated: Boolean(existingFileSha),
      language
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub sync failed.";
    await records.updateOne(
      { userId: user.id, submissionId: submissionKey },
      {
        $set: {
          userId: user.id,
          submissionId: submissionKey,
          repositoryId: settings.repositoryId,
          repositoryFullName: settings.repositoryFullName,
          branch: settings.branch,
          filePath,
          status: "failed",
          lastAttemptAt: now,
          updatedAt: new Date(),
          errorCode: message.slice(0, 160)
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
