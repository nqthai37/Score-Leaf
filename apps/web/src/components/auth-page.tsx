"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStudy } from "./study-provider";
export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [client] = useState(createClient),
    { user, ready } = useStudy(),
    router = useRouter();
  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);
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
      setError("Mật khẩu nhập lại chưa khớp.");
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
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: location.origin + "/auth/callback" },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setMessage(
            "Kiểm tra email để xác nhận tài khoản, sau đó quay lại đăng nhập. Nếu email đã có tài khoản, hãy dùng tab Đăng nhập.",
          );
          setPassword("");
          setConfirm("");
        }
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setError(
        /Invalid login credentials/i.test(text)
          ? "Email hoặc mật khẩu chưa đúng."
          : /Email not confirmed/i.test(text)
            ? "Bạn cần xác nhận email trước khi đăng nhập."
            : /rate limit/i.test(text)
              ? "Bạn thao tác hơi nhanh. Vui lòng thử lại sau ít phút."
              : /already registered/i.test(text)
                ? "Email này đã có tài khoản. Hãy chuyển sang Đăng nhập."
                : text || "Chưa thể kết nối. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <Link className="brand" href="/">
          <span className="brand-icon">↗</span>TOEIC<span>path</span>
        </Link>
        <div className="auth-intro-copy">
          <span className="auth-kicker">MỖI NGÀY MỘT CHÚT. TIẾN XA HƠN.</span>
          <h1>
            Một lộ trình nhỏ.
            <br />
            Một cơ hội lớn hơn.
          </h1>
          <p>
            Biến 1–3 tháng ôn luyện thành một thói quen rõ ràng. Luyện nghe, đọc
            và ôn lại những điều bạn chưa vững — theo nhịp của riêng bạn.
          </p>
          <div className="auth-highlights">
            <div>
              <b>7</b>
              <span>phần thi TOEIC</span>
            </div>
            <div>
              <b>246</b>
              <span>câu hỏi có giải thích</span>
            </div>
            <div>
              <b>10</b>
              <span>bộ đề luyện tập</span>
            </div>
          </div>
          <ul className="auth-benefits">
            <li>
              <span>✓</span> Hội thoại Faye & Dmitri, nghe theo tốc độ của bạn
            </li>
            <li>
              <span>✓</span> Lộ trình 4, 8 hoặc 12 tuần và ôn tập ngắt quãng
            </li>
            <li>
              <span>✓</span> Lưu bài đang làm và theo dõi tiến độ mỗi ngày
            </li>
          </ul>
        </div>
        <div className="auth-intro-bottom">
          <img
            src="/illustrations/study-books.svg"
            alt="Những cuốn sách bên chậu cây đang lớn"
          />
          <p>Your next chapter starts here.</p>
        </div>
        <small>Nội dung luyện tập độc lập · Không liên kết với ETS</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-card">
          <span className="auth-step">KHÔNG GIAN HỌC CỦA BẠN</span>
          <h2>
            {mode === "login"
              ? "Chào mừng bạn trở lại."
              : "Bắt đầu hành trình của bạn."}
          </h2>
          <p className="auth-description">
            {mode === "login"
              ? "Đăng nhập để tiếp tục từ nơi bạn đã dừng lại."
              : "Tạo tài khoản để lưu tiến độ và xây dựng thói quen ôn luyện."}
          </p>
          <div className="auth-tabs" role="tablist" aria-label="Tài khoản">
            <button
              role="tab"
              type="button"
              aria-selected={mode === "login"}
              aria-controls="auth-panel"
              id="login-tab"
              onClick={() => switchMode("login")}
              disabled={busy}
            >
              Đăng nhập
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
              Đăng ký
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
                  placeholder="ban@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <label htmlFor="auth-password">
                Mật khẩu
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Nhập mật khẩu của bạn"
                      : "Tối thiểu 8 ký tự"
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
                  Nhập lại mật khẩu
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
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
                  ? "Đang xử lý…"
                  : mode === "login"
                    ? "Đăng nhập →"
                    : "Tạo tài khoản →"}
              </button>
            </form>
          </div>
          {mode === "register" && (
            <p className="auth-email-note">
              Bạn sẽ nhận được email xác nhận trước khi bắt đầu.
            </p>
          )}
          <div className="auth-divider">
            <span>muốn khám phá trước?</span>
          </div>
          <Link className="auth-guest" href="/dashboard">
            Học thử không cần tài khoản <span>↗</span>
          </Link>
          <p className="auth-footnote">
            Học thử lưu trên thiết bị. Đăng nhập để đồng bộ tiến độ giữa các
            thiết bị.
          </p>
          <details className="auth-magic">
            <summary>Đã dùng link email trước đây?</summary>
            <p>
              Bạn vẫn có thể dùng link đăng nhập trong{" "}
              <Link className="link" href="/settings">
                Cài đặt tài khoản
              </Link>
              . Đăng nhập bằng link rồi đặt mật khẩu để sử dụng cách đăng nhập
              mới.
            </p>
          </details>
        </div>
        <span className="auth-form-footer">A little better, every day. ✦</span>
      </section>
    </div>
  );
}
