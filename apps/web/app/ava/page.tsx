import { AvaLearningHub } from "@/components/ava-learning-hub";

export default function AvaPage() {
  return (
    <section className="space-y-5">
      <div className="forest-shell rounded-3xl border border-moss-100/80 bg-white/90 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-moss-500">Ambiente Virtual de Aprendizagem</p>
        <h1 className="font-[var(--font-cormorant)] text-3xl font-semibold text-moss-900 sm:text-4xl">
          Videoaulas e trilhas de estudo
        </h1>
        <p className="mt-1 text-sm text-moss-600">
          Plataforma preparada para receber links de aulas e organizar estudos por modulo, progresso e anotacoes.
        </p>
      </div>

      <AvaLearningHub />
    </section>
  );
}
