import { HistoryPanel } from "@/components/history-panel";

export default function HistoryPage() {
  return (
    <section className="space-y-5">
      <div className="forest-shell rounded-3xl border border-moss-100/80 bg-white/90 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Jornada</p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900 sm:text-4xl">Historico de Estudos</h1>
        <p className="mt-1 text-sm text-moss-600">Ultimas praticas registradas por tom, BPM e configuracao de estudo.</p>
      </div>

      <HistoryPanel />
    </section>
  );
}
