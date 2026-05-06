export type StudentLevel = "beginner" | "intermediate" | "advanced";

export type HymnContext = {
  title: string;
  originalKey: string;
  currentKey: string;
  defaultBpm: number;
  selectedBpm: number;
  timeSignature: string;
  transpositionSemitones: number;
  accompanimentType: string;
  loopStart?: number;
  loopEnd?: number;
  noteDensity: number;
};

export type Recommendation = {
  type: "difficulty" | "tempo" | "loop" | "accompaniment" | "progression" | "key";
  content: string;
  priority: "low" | "medium" | "high";
};

export type AssistantAnswer = {
  summary: string;
  recommendations: Recommendation[];
};

function difficultyScore(ctx: HymnContext) {
  let score = 0;

  if (ctx.selectedBpm >= 110) {
    score += 2;
  } else if (ctx.selectedBpm >= 90) {
    score += 1;
  }

  if (!["2/4", "3/4", "4/4"].includes(ctx.timeSignature)) {
    score += 2;
  }

  if (Math.abs(ctx.transpositionSemitones) >= 3) {
    score += 2;
  }

  if (ctx.noteDensity > 30) {
    score += 2;
  } else if (ctx.noteDensity > 18) {
    score += 1;
  }

  return Math.min(7, score);
}

function targetTempoByLevel(level: StudentLevel, defaultBpm: number) {
  if (level === "advanced") {
    return defaultBpm;
  }
  if (level === "intermediate") {
    return Math.round(defaultBpm * 0.85);
  }
  return Math.round(defaultBpm * 0.7);
}

export function generatePedagogicalRecommendations(
  context: HymnContext,
  level: StudentLevel = "beginner"
): AssistantAnswer {
  const recommendations: Recommendation[] = [];
  const score = difficultyScore(context);
  const targetTempo = targetTempoByLevel(level, context.defaultBpm);

  if (context.selectedBpm > targetTempo) {
    recommendations.push({
      type: "tempo",
      priority: "high",
      content: `Para ${level === "beginner" ? "iniciante" : level === "intermediate" ? "intermediario" : "avancado"}, experimente praticar em ${targetTempo} BPM antes do andamento atual.`
    });
  }

  if (!context.loopStart || !context.loopEnd || context.loopEnd <= context.loopStart) {
    recommendations.push({
      type: "loop",
      priority: "medium",
      content: "Defina um loop curto (ex.: compassos 4 a 8) para consolidar passagens antes da execucao completa."
    });
  } else {
    recommendations.push({
      type: "loop",
      priority: "low",
      content: `Continue no loop dos compassos ${context.loopStart} a ${context.loopEnd} ate manter estabilidade ritmica e afinacao.`
    });
  }

  if (Math.abs(context.transpositionSemitones) >= 2) {
    recommendations.push({
      type: "key",
      priority: "medium",
      content: `O tom atual esta ${Math.abs(context.transpositionSemitones)} semitons ${context.transpositionSemitones > 0 ? "acima" : "abaixo"} do original. Reavalie conforto vocal e digitacao.`
    });
  }

  if (context.accompanimentType === "melody_guitar" && level === "beginner") {
    recommendations.push({
      type: "accompaniment",
      priority: "medium",
      content: "Se a levada de violao estiver dificil, troque para melodia + acordes basicos por alguns ciclos."
    });
  }

  recommendations.push({
    type: "progression",
    priority: "low",
    content: "Sequencia sugerida: leitura ritmica -> melodia lenta -> acompanhamento simples -> andamento completo."
  });

  const summary =
    score >= 5
      ? `Este hino esta em uma faixa de estudo desafiadora para o nivel ${level}. Foque em blocos curtos e andamento reduzido.`
      : score >= 3
        ? `Este hino possui dificuldade moderada para o nivel ${level}. Com loops e controle de BPM, a evolucao tende a ser consistente.`
        : `Este hino e acessivel para o nivel ${level}. Aproveite para trabalhar expressao e constancia ritmica.`;

  return { summary, recommendations };
}

export function answerPedagogicalQuestion(
  question: string,
  context: HymnContext,
  level: StudentLevel = "beginner"
) {
  const normalized = question.toLowerCase();

  if (normalized.includes("tom")) {
    return `Tom original: ${context.originalKey}. Tom atual: ${context.currentKey}. Diferenca: ${context.transpositionSemitones} semitons.`;
  }

  if (normalized.includes("andamento") || normalized.includes("bpm") || normalized.includes("velocidade")) {
    const suggested = targetTempoByLevel(level, context.defaultBpm);
    return `Andamento atual: ${context.selectedBpm} BPM. Para nivel ${level}, voce pode comecar em ${suggested} BPM.`;
  }

  if (normalized.includes("compasso")) {
    return `O compasso do hino e ${context.timeSignature}. Pratique marcando os tempos com palmas antes de tocar inteiro.`;
  }

  if (normalized.includes("dificuldade")) {
    const score = difficultyScore(context);
    return `Dificuldade estimada: ${score}/7 para nivel ${level}. Ajustes de BPM e loop podem reduzir a carga tecnica.`;
  }

  if (normalized.includes("violao")) {
    return "Para violao, inicie com troca lenta de acordes em semibreves e depois avance para a levada do acompanhamento simples.";
  }

  if (normalized.includes("canto") || normalized.includes("voz")) {
    return "Para canto, mantenha respiracoes em finais de frase e valide se o tom atual esta confortavel antes de subir o andamento.";
  }

  return "Sugestao geral: pratique por blocos curtos, mantenha BPM controlado e avance apenas quando o trecho estiver estavel duas vezes seguidas.";
}
