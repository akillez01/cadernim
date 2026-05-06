import Link from "next/link";
import { cookies } from "next/headers";
import { Card, Button } from "@cadernim/ui";
import { NewHymnForm } from "@/components/new-hymn-form";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export default async function NewHymnPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? verifySessionToken(token) : null;
  const user = payload
    ? await prisma.user.findUnique({
        where: { id: payload.uid },
        select: { role: true }
      })
    : null;

  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Permissao</p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900">Acesso restrito</h1>
        <p className="text-sm text-moss-600">Somente administradores podem cadastrar e editar conteudos.</p>
        <Link href="/dashboard">
          <Button type="button" variant="soft">
            Voltar ao dashboard
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <div className="forest-shell rounded-3xl border border-moss-100/80 bg-white/90 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Catalogacao</p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900 sm:text-4xl">Cadastro de Hino</h1>
        <p className="mt-1 text-sm text-moss-600">Preencha os metadados e envie um arquivo MusicXML/MXL.</p>
      </div>

      <NewHymnForm />
    </section>
  );
}
