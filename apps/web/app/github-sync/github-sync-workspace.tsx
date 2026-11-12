"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Repository = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  url: string;
};
type Submission = {
  id: string;
  platform: string;
  problemId: string;
  title: string;
  language: string | null;
  difficulty: string | null;
  submittedAt: string;
};
type SyncRecord = {
  id: string;
  submissionId: string;
  repositoryFullName: string;
  branch: string;
  filePath: string;
  status: "pending" | "success" | "failed";
  syncedAt: string | null;
  errorCode: string | null;
};
type Installation = { installationId: number; accountLogin: string; accountType: "User" | "Organization" };
type Settings = {
  repositoryId: number;
  repositoryFullName: string;
  branch: string;
  folderPath: string;
  enabled: boolean;
};
type ApiError = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as ApiError).error ?? "Request failed.");
  }
  return data as T;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function GithubSyncWorkspace() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [installationId, setInstallationId] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryId, setRepositoryId] = useState("");
  const [branch, setBranch] = useState("main");
  const [folderPath, setFolderPath] = useState("solutions");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [confirmCodeSync, setConfirmCodeSync] = useState(false);
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedRepository = useMemo(
    () => repositories.find((item) => String(item.id) === repositoryId) ?? null,
    [repositories, repositoryId]
  );
  const selectedSubmission = useMemo(
    () => submissions.find((item) => item.id === selectedSubmissionId) ?? null,
    [submissions, selectedSubmissionId]
  );

  const loadRepositories = useCallback(async () => {
    const result = await readJson<{ repositories: Repository[] }>(
      await fetch("/api/github-sync/repositories", { cache: "no-store" })
    );
    setRepositories(result.repositories);
    return result.repositories;
  }, []);

  const loadHistory = useCallback(async () => {
    const result = await readJson<{ items: SyncRecord[] }>(
      await fetch("/api/github-sync/history", { cache: "no-store" })
    );
    setHistory(result.items);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const [app, saved, submissionData, historyData] = await Promise.all([
        readJson<{ configured: boolean; installation: Installation | null }>(
          await fetch("/api/github-sync/installation", { cache: "no-store" })
        ),
        readJson<{ installation: Installation | null; settings: Settings | null }>(
          await fetch("/api/github-sync/settings", { cache: "no-store" })
        ),
        readJson<{ items: Submission[] }>(
          await fetch("/api/submissions?limit=50", { cache: "no-store" })
        ),
        readJson<{ items: SyncRecord[] }>(
          await fetch("/api/github-sync/history", { cache: "no-store" })
        )
      ]);
      setConfigured(app.configured);
      setInstallation(app.installation ?? saved.installation);
      if (app.installation ?? saved.installation) {
        setInstallationId(String((app.installation ?? saved.installation)!.installationId));
      }
      setSubmissions(submissionData.items);
      setHistory(historyData.items);
      if (submissionData.items[0]) setSelectedSubmissionId((current) => current || submissionData.items[0].id);

      if (saved.settings) {
        setRepositoryId(String(saved.settings.repositoryId));
        setBranch(saved.settings.branch);
        setFolderPath(saved.settings.folderPath);
        setSyncEnabled(saved.settings.enabled);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load GitHub Sync.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!installation) {
      setRepositories([]);
      return;
    }
    let active = true;
    loadRepositories()
      .then((items) => {
        if (!active) return;
        setRepositoryId((current) => current || String(items[0]?.id ?? ""));
      })
      .catch((error: unknown) => {
        if (active) setStatus(error instanceof Error ? error.message : "Could not load repositories.");
      });
    return () => { active = false; };
  }, [installation, loadRepositories]);

  async function connectInstallation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const result = await readJson<{ installation: Installation }>(
        await fetch("/api/github-sync/installation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installationId: Number(installationId) })
        })
      );
      setInstallation(result.installation);
      setStatus("GitHub App installation verified for " + result.installation.accountLogin + ".");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not connect GitHub installation.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectInstallation() {
    setBusy(true);
    setStatus("");
    try {
      await readJson(await fetch("/api/github-sync/installation", { method: "DELETE" }));
      setInstallation(null);
      setRepositories([]);
      setRepositoryId("");
      setStatus("GitHub installation disconnected from this DSAHub account.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not disconnect installation.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRepository) {
      setStatus("Select a repository first.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      await readJson(await fetch("/api/github-sync/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          repositoryFullName: selectedRepository.fullName,
          branch,
          folderPath,
          enabled: syncEnabled
        })
      }));
      setStatus("Repository settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save repository settings.");
    } finally {
      setBusy(false);
    }
  }

  async function syncSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubmission || !sourceCode.trim() || !confirmCodeSync) {
      setStatus("Select a submission, paste its solution code and confirm the code transfer.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const result = await readJson<{ filePath: string; repositoryUrl: string; updated: boolean }>(
        await fetch("/api/github-sync/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: selectedSubmission.id,
            sourceCode,
            confirmCodeSync
          })
        })
      );
      setStatus((result.updated ? "Updated " : "Created ") + result.filePath + " in GitHub.");
      setSourceCode("");
      setConfirmCodeSync(false);
      await loadHistory();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GitHub sync failed.");
      await loadHistory();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/dashboard">DSA<span>HUB</span></Link>
        <nav className="product-nav">
          <Link href="/dashboard">Overview</Link>
          <Link href="/analytics">Analytics</Link>
          <Link className="active" href="/github-sync">GitHub Sync</Link>
        </nav>
      </header>

      <section className="analytics-hero">
        <div>
          <div className="eyebrow">Solution backup workspace</div>
          <h1>Your code. Your repository.</h1>
          <p className="sub">Connect a GitHub App installation, select a repository and sync a solution only when you explicitly approve the code transfer.</p>
        </div>
        <span className="sync-mode-pill">MANUAL SYNC</span>
      </section>

      {status ? <div className="notice sync-notice" role="status">{status}</div> : null}
      {loading ? <div className="analytics-loading">Loading GitHub settings…</div> : null}

      {configured === false ? (
        <section className="analytics-panel setup-panel">
          <div className="setup-number">01</div>
          <div>
            <h2>GitHub App server configuration required</h2>
            <p>Repository writes are not enabled by your GitHub sign-in. A GitHub App is required so DSAHub can request Contents write access only for the installation and repository you select.</p>
            <ol>
              <li>Create a GitHub App in <a href="https://github.com/settings/apps/new" target="_blank" rel="noreferrer">GitHub Developer Settings</a>.</li>
              <li>Set Repository permissions → Contents: Read and write. Keep all other repository permissions disabled.</li>
              <li>Install the app on your GitHub account and select only the repositories you want DSAHub to access.</li>
              <li>Generate an app private key and configure <code>GITHUB_APP_ID</code> and <code>GITHUB_APP_PRIVATE_KEY</code> on the DSAHub server.</li>
              <li>Restart the DSAHub server after setting environment variables.</li>
            </ol>
            <p className="fine-print">This version supports personal-account installations tied to the GitHub account used for DSAHub sign-in. Organization installations are not yet supported. Never paste the private key into this page or commit it to Git.</p>
          </div>
        </section>
      ) : null}

      {configured ? (
        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <div><h2>01 · GitHub App installation</h2><p>Verify the installation ID for the account where you installed the app.</p></div>
            {installation ? <span className="sync-state success">Connected</span> : <span className="sync-state">Not connected</span>}
          </div>
          {installation ? (
            <div className="connected-account">
              <div><strong>{installation.accountLogin}</strong><small>{installation.accountType} · installation #{installation.installationId}</small></div>
              <button className="secondary-btn" type="button" onClick={disconnectInstallation} disabled={busy}>Disconnect</button>
            </div>
          ) : (
            <form className="sync-form-inline" onSubmit={connectInstallation}>
              <label htmlFor="installation-id">GitHub App installation ID</label>
              <input id="installation-id" inputMode="numeric" value={installationId} onChange={(event) => setInstallationId(event.target.value)} placeholder="e.g. 12345678" />
              <button className="action-btn" type="submit" disabled={busy || !installationId.trim()}>{busy ? "Verifying…" : "Verify installation"}</button>
            </form>
          )}
        </section>
      ) : null}

      {configured && installation ? (
        <>
          <section className="analytics-panel">
            <div className="analytics-panel-head"><div><h2>02 · Repository destination</h2><p>Choose the exact repository, branch and folder for your solution files.</p></div></div>
            <form className="sync-settings-grid" onSubmit={saveSettings}>
              <div className="field-block field-wide">
                <label htmlFor="github-repository">Repository</label>
                <select id="github-repository" value={repositoryId} onChange={(event) => {
                  const repo = repositories.find((item) => String(item.id) === event.target.value);
                  setRepositoryId(event.target.value);
                  if (repo) setBranch(repo.defaultBranch || "main");
                }}>
                  <option value="">Select a repository</option>
                  {repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}{repo.private ? " · Private" : " · Public"}</option>)}
                </select>
              </div>
              <div className="field-block">
                <label htmlFor="github-branch">Branch</label>
                <input id="github-branch" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" required />
              </div>
              <div className="field-block">
                <label htmlFor="github-folder">Folder path</label>
                <input id="github-folder" value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder="solutions" />
              </div>
              <label className="checkline field-wide">
                <input type="checkbox" checked={syncEnabled} onChange={(event) => setSyncEnabled(event.target.checked)} />
                Enable manual sync to this destination
              </label>
              <div className="field-wide sync-form-actions">
                <button className="action-btn" type="submit" disabled={busy || !selectedRepository}>{busy ? "Saving…" : "Save repository settings"}</button>
                {selectedRepository ? <a href={selectedRepository.url} target="_blank" rel="noreferrer">Open repository ↗</a> : null}
              </div>
            </form>
          </section>

          <section className="analytics-panel">
            <div className="analytics-panel-head"><div><h2>03 · Sync a solution</h2><p>Choose one of your accepted submissions and paste its solution code. Code is sent directly to GitHub and is not saved in MongoDB.</p></div></div>
            <form className="sync-code-form" onSubmit={syncSubmission}>
              <div className="field-block">
                <label htmlFor="sync-submission">Accepted submission</label>
                <select id="sync-submission" value={selectedSubmissionId} onChange={(event) => setSelectedSubmissionId(event.target.value)}>
                  <option value="">Select a submission</option>
                  {submissions.map((submission) => (
                    <option key={submission.id} value={submission.id}>
                      {submission.title} · {submission.platform} · {submission.language ?? "language unknown"}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSubmission ? (
                <div className="selected-problem">
                  <strong>{selectedSubmission.title}</strong>
                  <span>{selectedSubmission.platform} · {selectedSubmission.difficulty ?? "Difficulty unavailable"} · {dateLabel(selectedSubmission.submittedAt)}</span>
                </div>
              ) : null}
              <div className="field-block">
                <label htmlFor="solution-code">Solution source code</label>
                <textarea id="solution-code" value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} placeholder="// Paste the accepted solution here" rows={12} spellCheck={false} />
              </div>
              <label className="checkline">
                <input type="checkbox" checked={confirmCodeSync} onChange={(event) => setConfirmCodeSync(event.target.checked)} />
                I confirm this is my solution code and authorize DSAHub to send it to the selected GitHub repository.
              </label>
              <div className="sync-form-actions">
                <button className="action-btn" type="submit" disabled={busy || !syncEnabled || !sourceCode.trim() || !selectedSubmission}>{busy ? "Syncing…" : "Sync solution to GitHub"}</button>
                {!syncEnabled ? <small>Enable manual sync in Repository destination first.</small> : null}
              </div>
            </form>
            <div className="privacy-callout">Privacy boundary: source code is processed for this request only. DSAHub stores submission metadata and sync status, not the pasted code. Automatic code capture is not enabled in this version.</div>
          </section>
        </>
      ) : null}

      <section className="analytics-panel">
        <div className="analytics-panel-head"><div><h2>Sync history</h2><p>Recent file writes, updates and failures for your account.</p></div><button className="secondary-btn" type="button" onClick={() => void loadHistory()}>Refresh</button></div>
        {history.length ? (
          <div className="sync-history-list">
            {history.map((item) => (
              <div className="sync-history-row" key={item.id}>
                <div><strong>{item.filePath}</strong><small>{item.repositoryFullName} · {item.branch}</small></div>
                <span className={"sync-state " + item.status}>{item.status}</span>
              </div>
            ))}
          </div>
        ) : <div className="analytics-empty">No GitHub syncs yet. Your successful and failed attempts will appear here.</div>}
      </section>

      <p className="fine-print">Repository writes use a GitHub App installation token scoped to the selected repository and Contents permission. See <a href="https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app" target="_blank" rel="noreferrer">GitHub App authentication documentation</a>.</p>
    </main>
  );
}
