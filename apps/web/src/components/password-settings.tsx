"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStudy } from "./study-provider";
export function PasswordSettings() {
  const { user, setNotice } = useStudy(),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [client] = useState(createClient);
  if (!user) return null;
  return (
    <section className="panel daily-card">
      <h2>Sign-in password</h2>
      <p>
        Previously used an email link? Set a password to sign in directly next
        time.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setNotice("Passwords do not match.");
            return;
          }
          setBusy(true);
          try {
            const { error } = await client.auth.updateUser({ password });
            if (error) throw error;
            setPassword("");
            setConfirm("");
            setNotice(
              "Password updated. You can now sign in with your email and password.",
            );
          } catch (error) {
            setNotice(
              error instanceof Error
                ? error.message
                : "Unable to update your password.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
        </div>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </section>
  );
}
