"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@cadernim/ui";
import { PrintableMusicScore } from "@/components/printable-music-score";
import type { BookletHymn } from "@/lib/booklet-types";

export function BookletPreview({
  title,
  hymns,
}: {
  title: string;
  hymns: BookletHymn[];
  specEncoded: string;
}) {
  const [printing, setPrinting] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  function handlePrint() {
    setPrinting(true);
    // Pequeno delay para garantir que OSMD terminou de renderizar
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 400);
  }

  return (
    <section className="space-y-5">
      {/* Barra de ação — some na impressão */}
      <div className="print-hidden forest-shell rounded-2xl border border-moss-100 bg-white/90 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-moss-500">
              Pré-visualização de Impressão
            </p>
            <h1 className="text-2xl font-semibold text-moss-900 sm:text-3xl">{title}</h1>
            <p className="mt-0.5 text-sm text-moss-600">
              {hymns.length} {hymns.length === 1 ? "hino" : "hinos"} — partitura completa com notação musical
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/booklets">
              <Button variant="ghost" className="w-full sm:w-auto">
                ← Editar seleção
              </Button>
            </Link>
            <Button
              onClick={handlePrint}
              disabled={printing}
              className="w-full sm:w-auto"
            >
              {printing ? "Preparando..." : "⬇ Baixar / Imprimir PDF"}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-moss-500">
          Na janela de impressão do navegador, escolha <strong>Salvar como PDF</strong> para baixar o arquivo.
        </p>
      </div>

      {/* Conteúdo imprimível */}
      <article ref={articleRef} className="space-y-6">
        {hymns.map((hymn, index) => (
          <section
            key={`${hymn.hymnId}-${index}`}
            className="booklet-page rounded-2xl border border-moss-100 bg-white p-4 shadow-soft sm:p-6 print:shadow-none"
          >
            {/* Cabeçalho do hino */}
            <header className="booklet-hymn-header mb-4 border-b border-moss-100 pb-3">
              <p className="text-xs uppercase tracking-wide text-moss-500">
                Hino #{hymn.number}
              </p>
              <h2 className="text-2xl font-semibold text-moss-900 sm:text-3xl">
                {hymn.title}
              </h2>
              <p className="mt-0.5 text-sm text-moss-600">{hymn.author}</p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-moss-500">
                <span>Tom original: <strong className="text-moss-700">{hymn.originalKey}</strong></span>
                <span>Tom selecionado: <strong className="text-moss-700">{hymn.selectedKey}</strong></span>
                <span>BPM: <strong className="text-moss-700">{hymn.defaultBpm}</strong></span>
                <span>Compasso: <strong className="text-moss-700">{hymn.timeSignature}</strong></span>
              </div>
            </header>

            {/* Partitura OSMD */}
            <PrintableMusicScore xmlContent={hymn.xmlContent} />
          </section>
        ))}
      </article>
    </section>
  );
}
