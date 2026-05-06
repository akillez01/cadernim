export type VideoSourceType = "direct" | "youtube";

export type VideoLesson = {
  id: string;
  module: string;
  order: number;
  title: string;
  teacher: string;
  level: string;
  durationLabel: string;
  description: string;
  tags: string[];
  thumbnail: string;
  sourceUrl: string;
  sourceType?: VideoSourceType;
  materialUrl?: string;
  materialFileName?: string;
  materials?: Array<{ label: string; url: string }>;
};

export const avaChannelUrl = "https://www.youtube.com/@rafaelmendoncaviolao/videos";

function ytThumb(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export const avaLessons: VideoLesson[] = [
  {
    id: "video-01",
    module: "Video Aulas",
    order: 1,
    title: "Tonalidade Maior e Menor - Vídeo Aula #4",
    teacher: "Rafael Mendonca",
    level: "iniciante",
    durationLabel: "YouTube",
    description: "Aula real do canal.",
    tags: ["video-aula", "tonalidade"],
    thumbnail: ytThumb("ipKomKxhb5A"),
    sourceUrl: "https://youtu.be/ipKomKxhb5A?si=sUl6oZ2DWsjHmhDs",
    sourceType: "youtube",
    materials: [{ label: "Canal principal", url: avaChannelUrl }]
  },
  {
    id: "video-02",
    module: "Video Aulas",
    order: 2,
    title: "Tonalismo X Modalismo - Vídeo Aula #3",
    teacher: "Rafael Mendonca",
    level: "iniciante",
    durationLabel: "YouTube",
    description: "Aula real do canal.",
    tags: ["video-aula", "modalismo"],
    thumbnail: ytThumb("JUIPCeBgzeg"),
    sourceUrl: "https://youtu.be/JUIPCeBgzeg?si=qNQ4yQV-C_wAgBrO",
    sourceType: "youtube"
  },
  {
    id: "video-03",
    module: "Video Aulas",
    order: 3,
    title: "Nomenclatura e Cifragem de Tríades - Vídeo Aula #2",
    teacher: "Rafael Mendonca",
    level: "iniciante",
    durationLabel: "YouTube",
    description: "Aula real do canal.",
    tags: ["video-aula", "cifragem"],
    thumbnail: ytThumb("Udo-dsh150E"),
    sourceUrl: "https://youtu.be/Udo-dsh150E?si=-dOCjXCMr2I69TI7",
    sourceType: "youtube"
  },
  {
    id: "video-04",
    module: "Video Aulas",
    order: 1,
    title: "Teoria explicada no violão - Vídeo Aula #1",
    teacher: "Rafael Mendonca",
    level: "intermediario",
    durationLabel: "YouTube",
    description: "Aula real do canal.",
    tags: ["video-aula", "teoria"],
    thumbnail: ytThumb("IVd1CjQGBH4"),
    sourceUrl: "https://youtu.be/IVd1CjQGBH4?si=NMR-LALU5JaFkLoM",
    sourceType: "youtube"
  },
  {
    id: "video-05",
    module: "Dicas de Estudo",
    order: 2,
    title: "Estude assim e evolua muito mais!",
    teacher: "Rafael Mendonca",
    level: "intermediario",
    durationLabel: "YouTube",
    description: "Aula real do canal.",
    tags: ["dicas", "estudo"],
    thumbnail: ytThumb("h7PneXC35tQ"),
    sourceUrl: "https://youtu.be/h7PneXC35tQ?si=MUMl13-zXod7IthB",
    sourceType: "youtube"
  },
  {
    id: "video-06",
    module: "Trocação de Ideia",
    order: 3,
    title: "Preciso estudar teoria musical? - Trocação de Ideia #4",
    teacher: "Rafael Mendonca",
    level: "avancado",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["trocacao", "teoria"],
    thumbnail: ytThumb("ak4yn_RR9MA"),
    sourceUrl: "https://youtu.be/ak4yn_RR9MA?si=_vsIafV51yKopxmJ",
    sourceType: "youtube"
  },
  {
    id: "video-07",
    module: "Hinos e Arranjos",
    order: 1,
    title: "Do Sol vos nasce a Luz - Germano Guilherme",
    teacher: "Rafael Mendonca",
    level: "intermediario",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["hino", "arranjo"],
    thumbnail: ytThumb("aq61nOJ37FE"),
    sourceUrl: "https://youtu.be/aq61nOJ37FE?si=Z4z_4ZmskWPddqbW",
    sourceType: "youtube"
  },
  {
    id: "video-08",
    module: "Trocação de Ideia",
    order: 2,
    title: "Música e Autoconhecimento - Trocação de ideia #3",
    teacher: "Rafael Mendonca",
    level: "intermediario",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["trocacao", "autoconhecimento"],
    thumbnail: ytThumb("heJQu5S6l6g"),
    sourceUrl: "https://youtu.be/heJQu5S6l6g?si=qiv2I0TCO2GSITx9",
    sourceType: "youtube"
  },
  {
    id: "video-09",
    module: "Hinos e Arranjos",
    order: 3,
    title: "Esta estrela que nos guia - Antônio Gomes",
    teacher: "Rafael Mendonca",
    level: "avancado",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["hino", "arranjo"],
    thumbnail: ytThumb("hvlpw0t1Tgo"),
    sourceUrl: "https://youtu.be/hvlpw0t1Tgo?si=UYroyHuW3NrcIh3O",
    sourceType: "youtube"
  },
  {
    id: "video-10",
    module: "Hinos e Arranjos",
    order: 1,
    title: "Lua Branca - Passo a passo arranjo Simples",
    teacher: "Rafael Mendonca",
    level: "iniciante",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["hino", "passo-a-passo"],
    thumbnail: ytThumb("dkmqfRXEQRE"),
    sourceUrl: "https://youtu.be/dkmqfRXEQRE?si=GuvV2qi8xjx2zYsy",
    sourceType: "youtube"
  },
  {
    id: "video-11",
    module: "Harmonia de Hinos",
    order: 2,
    title: "Passo a passo - Harmonia para Devo Amar Aquela Luz",
    teacher: "Rafael Mendonca",
    level: "intermediario",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["harmonia", "passo-a-passo"],
    thumbnail: ytThumb("MUJMh2xKGLg"),
    sourceUrl: "https://youtu.be/MUJMh2xKGLg?si=mn2MblOFBCGXG_Ps",
    sourceType: "youtube"
  },
  {
    id: "video-12",
    module: "Harmonia de Hinos",
    order: 3,
    title: "Devo Amar Aquela Luz - Dicas de Música",
    teacher: "Rafael Mendonca",
    level: "intermediario",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["harmonia", "dicas"],
    thumbnail: ytThumb("x2Bc0JvpL-c"),
    sourceUrl: "https://youtu.be/x2Bc0JvpL-c?si=psBB4BMQQCkb9hM2",
    sourceType: "youtube"
  },
  {
    id: "video-13",
    module: "Hinos e Arranjos",
    order: 4,
    title: "O Daime é - Dicas de Música",
    teacher: "Rafael Mendonca",
    level: "avancado",
    durationLabel: "YouTube",
    description: "Video real do canal.",
    tags: ["hino", "dicas"],
    thumbnail: ytThumb("omh7-571iXY"),
    sourceUrl: "https://youtu.be/omh7-571iXY?si=aGI6EMdrzGzp2sOk",
    sourceType: "youtube"
  }
];

export function detectVideoSource(url: string, preferred?: VideoSourceType): VideoSourceType {
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
