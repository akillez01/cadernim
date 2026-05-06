"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Button } from "@cadernim/ui";
import { MainNav } from "@/components/main-nav";

type MePayload = {
  data: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "STUDENT";
  };
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "STUDENT" | null>(null);
  const [name, setName] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);
  const onLoginPage = pathname === "/login";

  useEffect(() => {
    let mounted = true;
    async function loadMe() {
      if (onLoginPage) {
        setLoadingMe(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          if (mounted) {
            setRole(null);
            setName("");
          }
          return;
        }
        const payload = (await response.json()) as MePayload;
        if (mounted) {
          setRole(payload.data.role);
          setName(payload.data.name);
        }
      } catch {
        if (mounted) {
          setRole(null);
          setName("");
        }
      } finally {
        if (mounted) {
          setLoadingMe(false);
        }
      }
    }

    void loadMe();
    return () => {
      mounted = false;
    };
  }, [onLoginPage]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-moss-100/80 bg-white/78 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-600 to-moss-800 text-sm font-semibold text-white shadow-soft">
            CA
          </span>
          <div>
            <p className="font-[var(--font-cormorant)] text-xl font-semibold leading-none text-moss-900">Cadernim</p>
            <p className="text-xs text-moss-600">Escola da Floresta • estudo musical guiado</p>
          </div>
        </Link>

        {!onLoginPage && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <MainNav role={role} />
            <div className="flex flex-wrap items-center gap-2">
              {!loadingMe && role && (
                <>
                  <Badge className="bg-moss-100 text-moss-700">{name}</Badge>
                  <Badge className="bg-sand-100 text-sand-800">{role === "ADMIN" ? "Admin" : "Aluno"}</Badge>
                  <Button type="button" variant="ghost" onClick={() => void handleLogout()}>
                    Sair
                  </Button>
                </>
              )}
              {!loadingMe && !role && (
                <Link href="/login">
                  <Button type="button" variant="soft">
                    Entrar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
