"use client";

import { useState } from "react";

export function ExtensionTokenPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function generateToken() {
    setBusy(true);
    setStatus("");
    setToken(null);

    try {
      const response = await fetch("/api/extension-token", { method: "POST" });
      const result = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !result.token) {
        throw new Error(result.error ?? "Could not generate an extension key.");
      }
      setToken(result.token);
      setStatus("Key generated. Copy it now and paste it into the DSAHub extension popup.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not generate an extension key.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/extension-token", { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not revoke the extension key.");
      setToken(null);
      setStatus("Extension key revoked. Generate a new key to reconnect the extension.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not revoke the extension key.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setStatus("Key copied. Paste it into the DSAHub extension popup.");
    } catch {
      setStatus("Clipboard access failed. Select and copy the key manually.");
    }
  }

  return (
    <section className="section panel">
      <h2>Browser extension</h2>
      <p className="fine-print">
        Connect DSAHub Companion to this account. The key is stored as a hash on the server and is shown only when generated.
      </p>
      <div className="actions">
        <button className="secondary-btn" type="button" onClick={generateToken} disabled={busy}>
          {busy ? "Please wait…" : token ? "Generate new key" : "Generate extension key"}
        </button>
        <button className="secondary-btn" type="button" onClick={revokeToken} disabled={busy}>
          Revoke key
        </button>
      </div>
      {token ? (
        <div className="token-value">
          <code>{token}</code>
          <button className="secondary-btn" type="button" onClick={copyToken}>Copy key</button>
        </div>
      ) : null}
      <p className="fine-print" role="status" aria-live="polite">{status}</p>
      <p className="fine-print">
        Paste the generated key into the extension popup. Generating another key replaces the previous key.
      </p>
    </section>
  );
}
