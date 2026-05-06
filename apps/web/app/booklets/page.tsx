import { BookletBuilder } from "@/components/booklet-builder";
import { Suspense } from "react";

export default function BookletsPage() {
  return (
    <section className="space-y-5">
      <div className="forest-shell rounded-3xl border border-moss-100/80 bg-white/90 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Impressao</p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900 sm:text-4xl">Gerador de Caderninho</h1>
        <p className="mt-1 text-sm text-moss-600">
          Selecione os hinos, escolha o tom de cada um e gere uma versao pronta para impressao ou PDF.
        </p>
      </div>

      <Suspense fallback={null}>
        <BookletBuilder />
      </Suspense>
    </section>
  );
}
