import Link from "next/link";

export default function HomePage() {
  return (
    <section className="forest-shell relative overflow-hidden rounded-3xl border border-moss-100/80 bg-white/92 p-6 shadow-soft sm:p-10 lg:p-12">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-sand-200/80 to-moss-100/70 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-tr from-moss-200/80 to-sand-100/70 blur-3xl" />

      <div className="relative max-w-4xl">
        <p className="mb-3 inline-flex rounded-full border border-moss-200 bg-moss-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-moss-700">
          Escola da Floresta • MVP
        </p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold leading-tight text-moss-900 sm:text-5xl">
          Hinario digital para estudo vivo: partitura, escuta, tom e ritmo no seu tempo.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-moss-700 sm:text-lg">
          Um ambiente simples e acolhedor para aprender os hinos: ler partitura, ouvir, ajustar andamento, transpor tom
          e praticar com metrônomo.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-br from-moss-700 to-moss-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-moss-800 hover:to-moss-900"
          >
            Entrar na Plataforma
          </Link>
          <Link
            href="/hymns/new"
            className="rounded-xl border border-sand-300 bg-sand-200 px-5 py-2.5 text-sm font-semibold text-moss-900 transition hover:bg-sand-300"
          >
            Cadastrar Primeiro Hino
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-moss-100 bg-white/75 p-4">
            <p className="text-xs uppercase tracking-wide text-moss-500">Estudo Visual</p>
            <p className="mt-1 text-sm text-moss-700">Partitura responsiva com leitura clara para prática em sala e em casa.</p>
          </article>
          <article className="rounded-2xl border border-moss-100 bg-white/75 p-4">
            <p className="text-xs uppercase tracking-wide text-moss-500">Escuta Ativa</p>
            <p className="mt-1 text-sm text-moss-700">Playback com controle de andamento e metrônomo para consolidar pulsação.</p>
          </article>
          <article className="rounded-2xl border border-moss-100 bg-white/75 p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-xs uppercase tracking-wide text-moss-500">Adaptação de Tom</p>
            <p className="mt-1 text-sm text-moss-700">Transposição rápida para adequar canto e instrumento a cada contexto.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
