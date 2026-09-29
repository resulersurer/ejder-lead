"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) { const body = await response.json(); setError(body.error || "Giriş yapılamadı."); setBusy(false); return; }
    router.replace("/"); router.refresh();
  }
  return <main className="login-shell"><form className="login-card" onSubmit={submit}><span>EJDER TURİZM</span><h1>Lead Yönetimi</h1><p>Müşteri ve rezervasyon bilgilerine erişmek için giriş yapın.</p><label htmlFor="password">Yönetici şifresi</label><input id="password" name="password" type="password" autoComplete="current-password" required autoFocus/>{error ? <p className="integration-error">{error}</p> : null}<button disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button></form></main>;
}
