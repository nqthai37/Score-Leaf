"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStudy } from "./study-provider";
export function AuthPage({
  nextPath = "/dashboard",
  signInError = false,
}: { nextPath?: string; signInError?: boolean } = {}) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(
      signInError
        ? "Your sign-in link is invalid or has expired. Please sign in again."
        : "",
    ),
    [client] = useState(createClient),
    { user, ready } = useStudy(),
    router = useRouter();
  useEffect(() => {
    if (ready && user) router.replace(nextPath);
  }, [ready, user, router, nextPath]);
  function switchMode(next: "login" | "register") {
    setMode(next);
    setMessage("");
    setError("");
    setPassword("");
    setConfirm("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace(nextPath);
        router.refresh();
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              location.origin +
              "/auth/callback?next=" +
              encodeURIComponent(nextPath),
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(nextPath);
          router.refresh();
        } else {
          setMessage(
            "Check your email to confirm your account, then sign in. If you already have an account, use the Sign in tab.",
          );
          setPassword("");
          setConfirm("");
        }
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setError(
        /Invalid login credentials/i.test(text)
          ? "Your email or password is incorrect."
          : /Email not confirmed/i.test(text)
            ? "Please confirm your email before signing in."
            : /rate limit/i.test(text)
              ? "Too many attempts. Please try again in a few minutes."
              : /already registered/i.test(text)
                ? "This email already has an account. Please sign in."
                : text || "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo:
            location.origin +
            "/auth/callback?next=" +
            encodeURIComponent(nextPath),
        },
      });
      if (error) throw error;
      setMessage("Check your email and open the sign-in link in this browser.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to send a sign-in link. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <Link className="brand" href="/">
          <img
            className="brand-logo"
            src="/branding/toeic-path-logo.png"
            width={40}
            height={40}
            alt=""
            aria-hidden="true"
          />
          TOEIC<span>path</span>
        </Link>
        <div className="auth-intro-copy">
          <span className="auth-kicker">SMALL STEPS. REAL PROGRESS.</span>
          <h1>
            A small routine.
            <br />A bigger opportunity.
          </h1>
          <p>
            Turn 1–3 months of preparation into a steady routine. Practice
            listening, reading and the skills you want to strengthen — at your
            own pace.
          </p>
          <div className="auth-highlights">
            <div>
              <b>7</b>
              <span>TOEIC parts</span>
            </div>
            <div>
              <b>246</b>
              <span>questions with explanations</span>
            </div>
            <div>
              <b>10</b>
              <span>practice sets</span>
            </div>
          </div>
          <ul className="auth-benefits">
            <li>
              <span>✓</span> Faye & Dmitri conversations, at your listening pace
            </li>
            <li>
              <span>✓</span> 4, 8 or 12-week plans with spaced review
            </li>
            <li>
              <span>✓</span> Save your place and track your daily progress
            </li>
          </ul>
        </div>
        <div className="auth-intro-bottom">
          <img
            src="/illustrations/study-books.svg"
            alt="Books beside a growing plant"
          />
          <p>Your next chapter starts here.</p>
        </div>
        <small>Independent practice · Not affiliated with ETS</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-card">
          <span className="auth-step">YOUR PERSONAL STUDY SPACE</span>
          <h2>
            {mode === "login" ? "Welcome back." : "Start your next chapter."}
          </h2>
          <p className="auth-description">
            {mode === "login"
              ? "Sign in to continue where you left off."
              : "Create an account to save your progress and build a lasting study habit."}
          </p>
          <div className="auth-tabs" role="tablist" aria-label="Account">
            <button
              role="tab"
              type="button"
              aria-selected={mode === "login"}
              aria-controls="auth-panel"
              id="login-tab"
              onClick={() => switchMode("login")}
              disabled={busy}
            >
              Sign in
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={mode === "register"}
              aria-controls="auth-panel"
              id="register-tab"
              onClick={() => switchMode("register")}
              disabled={busy}
            >
              Sign up
            </button>
          </div>
          <div
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={mode === "login" ? "login-tab" : "register-tab"}
          >
            <form onSubmit={submit}>
              <label htmlFor="auth-email">
                Email
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <label htmlFor="auth-password">
                Password
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Enter your password"
                      : "At least 8 characters"
                  }
                  minLength={mode === "register" ? 8 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              {mode === "register" && (
                <label htmlFor="auth-confirm">
                  Confirm password
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    minLength={8}
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={busy}
                  />
                </label>
              )}
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="auth-success" role="status">
                  {message}
                </p>
              )}
              <button
                className="primary auth-submit"
                type="submit"
                disabled={busy || !ready}
              >
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in →"
                    : "Create account →"}
              </button>
            </form>
          </div>
          {mode === "register" && (
            <p className="auth-email-note">
              You will receive a confirmation email before getting started.
            </p>
          )}
          <details className="auth-magic">
            <summary>Sign in with an email link instead</summary>
            <p>
              Open the link in this browser. You can set a password in Settings
              after signing in.
            </p>
            <form onSubmit={sendLink}>
              <label htmlFor="link-email">
                Email address for sign-in link
                <input
                  id="link-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                className="secondary"
                disabled={busy || !ready}
              >
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          </details>
        </div>
        <span className="auth-form-footer">A little better, every day. ✦</span>
      </section>
    </div>
  );
}
