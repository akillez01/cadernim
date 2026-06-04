import { HymnDashboard } from "@/components/hymn-dashboard";

export default function DashboardPage() {
  return (
    <section className="space-y-5">
      <div className="forest-shell rounded-3xl border border-moss-100/80 bg-white/90 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Biblioteca</p>
            <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900 sm:text-4xl">Hinário da Escola da Floresta</h1>
            <p className="mt-1 text-sm text-moss-600">Busque, filtre e abra o modo de estudo de cada hino.</p>
          </div>
          <a
            href="/downloads/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-moss-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-moss-800 sm:self-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.414-3.707-3.707 1.414-1.414L11 13.586V8h2v5.586l2.293-2.293 1.414 1.414L12 16.414z"/>
            </svg>
            App Android
          </a>
        </div>
      </div>
      <HymnDashboard />
    </section>
  );
}
