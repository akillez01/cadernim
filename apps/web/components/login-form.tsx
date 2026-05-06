"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@cadernim/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel autenticar.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha de rede ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-xl space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.12em] text-moss-500">Acesso da Plataforma</p>
        <h1 className="font-[var(--font-cormorant)] text-4xl font-semibold text-moss-900">Entrar no Cadernim</h1>
        <p className="text-sm text-moss-600">
          Aluno: visualizacao, download e comentarios. Admin: controle total de edicao e conteudos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Email</span>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-moss-700">Senha</span>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>

    </Card>
  );
}
