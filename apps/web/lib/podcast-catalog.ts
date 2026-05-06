export type PodcastSourceType = "direct" | "youtube";

export type PodcastEpisode = {
  id: string;
  series: string;
  order: number;
  title: string;
  host: string;
  level: string;
  durationLabel: string;
  publishedLabel: string;
  description: string;
  tags: string[];
  coverImage: string;
  sourceUrl: string;
  sourceType?: PodcastSourceType;
};

export const podcastEpisodes: PodcastEpisode[] = [
  {
    id: "podcast-01",
    series: "Fundamentos do Hinario",
    order: 1,
    title: "Episodio 01 - Inserir titulo real",
    host: "Escola da Floresta",
    level: "iniciante",
    durationLabel: "00:00",
    publishedLabel: "Aguardando link",
    description: "Episodio preparado para receber o link oficial do podcast.",
    tags: ["fundamentos", "hinario"],
    coverImage: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: ""
  },
  {
    id: "podcast-02",
    series: "Fundamentos do Hinario",
    order: 2,
    title: "Episodio 02 - Inserir titulo real",
    host: "Escola da Floresta",
    level: "iniciante",
    durationLabel: "00:00",
    publishedLabel: "Aguardando link",
    description: "Episodio preparado para receber o link oficial do podcast.",
    tags: ["fundamentos", "estudo"],
    coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: ""
  },
  {
    id: "podcast-03",
    series: "Pratica Musical",
    order: 1,
    title: "Episodio 03 - Inserir titulo real",
    host: "Escola da Floresta",
    level: "intermediario",
    durationLabel: "00:00",
    publishedLabel: "Aguardando link",
    description: "Episodio preparado para receber o link oficial do podcast.",
    tags: ["pratica", "ritmo"],
    coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: ""
  },
  {
    id: "podcast-04",
    series: "Pratica Musical",
    order: 2,
    title: "Episodio 04 - Inserir titulo real",
    host: "Escola da Floresta",
    level: "intermediario",
    durationLabel: "00:00",
    publishedLabel: "Aguardando link",
    description: "Episodio preparado para receber o link oficial do podcast.",
    tags: ["pratica", "harmonia"],
    coverImage: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: ""
  },
  {
    id: "podcast-05",
    series: "Troca de Experiencias",
    order: 1,
    title: "Episodio 05 - Inserir titulo real",
    host: "Escola da Floresta",
    level: "intermediario",
    durationLabel: "00:00",
    publishedLabel: "Aguardando link",
    description: "Episodio preparado para receber o link oficial do podcast.",
    tags: ["conversa", "vivencia"],
    coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: ""
  },
  {
    id: "podcast-06",
    series: "Troca de Experiencias",
    order: 2,
    title: "Episodio 06 - Inserir titulo real",
    host: "Escola da Floresta",
    level: "avancado",
    durationLabel: "00:00",
    publishedLabel: "Aguardando link",
    description: "Episodio preparado para receber o link oficial do podcast.",
    tags: ["conversa", "interpretacao"],
    coverImage: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: ""
  }
];

export function detectPodcastSource(url: string, preferred?: PodcastSourceType): PodcastSourceType {
  if (preferred) {
    return preferred;
  }
  const normalized = url.toLowerCase();
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
    return "youtube";
  }
  return "direct";
}

export function toYoutubeEmbedUrl(url: string) {
  const normalized = url.trim();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("/embed/")) {
    return normalized;
  }
  const shortMatch = normalized.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1`;
  }
  const watchMatch = normalized.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?rel=0&modestbranding=1`;
  }
  return normalized;
}
