import { HymnDashboard } from "@/components/hymn-dashboard";

export default function DashboardPage() {
  return (
    <section className="space-y-5">
      <div className="forest-shell rounded-3xl border border-moss-100/80 bg-white/90 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Biblioteca</p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900 sm:text-4xl">Hinário da Escola da Floresta</h1>
        <p className="mt-1 text-sm text-moss-600">Busque, filtre e abra o modo de estudo de cada hino.</p>
      </div>
      <HymnDashboard />
    </section>
  );
}
