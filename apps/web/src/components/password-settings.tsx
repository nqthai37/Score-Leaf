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
      <h2>Mật khẩu đăng nhập</h2>
      <p>
        Đã dùng link email trước đây? Đặt mật khẩu để lần sau đăng nhập ngay từ
        trang đầu.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setNotice("Mật khẩu nhập lại chưa khớp.");
            return;
          }
          setBusy(true);
          try {
            const { error } = await client.auth.updateUser({ password });
            if (error) throw error;
            setPassword("");
            setConfirm("");
            setNotice(
              "Đã cập nhật mật khẩu. Lần sau bạn có thể đăng nhập bằng email và mật khẩu.",
            );
          } catch (error) {
            setNotice(
              error instanceof Error
                ? error.message
                : "Chưa cập nhật được mật khẩu.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Mật khẩu mới
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
            Nhập lại mật khẩu mới
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
          {busy ? "Đang lưu…" : "Lưu mật khẩu"}
        </button>
      </form>
    </section>
  );
}
