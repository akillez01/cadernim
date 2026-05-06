import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { join } from "node:path";
import { PrismaClient, type Hymn } from "@prisma/client";
import { parseMusicXmlMetadata } from "@cadernim/music-engine";

const prisma = new PrismaClient();
const SCRYPT_KEY_LENGTH = 64;
const OBRIGATORY_TAGS = ["hinario", "oracao", "escola-da-floresta"];
const LEGACY_SAMPLE_HYMN_IDS = ["sample-hymn-1", "sample-hymn-2", "sample-hymn-3"];

type HymnSeedEntry = {
  id: string;
  title: string;
  number: number;
  author: string;
  originalKey: string;
  defaultBpm: number;
  timeSignature: string;
  category: string;
  tags: string[];
  xmlFilePath: string;
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(value: string) {
  const ascii = normalizeLabel(value);
  return ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function inferNumberAndTitle(folderName: string) {
  const parsed = folderName.match(/^(\d+)\s+(.+)$/u);
  if (!parsed) {
    return {
      explicitNumber: undefined,
      fallbackTitle: folderName.trim()
    };
  }

  return {
    explicitNumber: Number(parsed[1]),
    fallbackTitle: parsed[2].trim()
  };
}

function toSafeBpm(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 20) {
    return 80;
  }
  return Math.round(value);
}

function resolveOracaoXmlRoot() {
  const collectionsRoot = join(process.cwd(), "docs", "Arquivos XML");
  if (!existsSync(collectionsRoot)) {
    return null;
  }

  const collectionDir = readdirSync(collectionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .find((entry) => normalizeLabel(entry.name) === "oracao");

  if (!collectionDir) {
    return null;
  }

  const xmlRoot = join(collectionsRoot, collectionDir.name, "XML");
  return existsSync(xmlRoot) ? xmlRoot : null;
}

function loadOracaoHymns(uploadsDir: string): HymnSeedEntry[] {
  const xmlRoot = resolveOracaoXmlRoot();
  if (!xmlRoot) {
    return [];
  }

  const rawEntries = readdirSync(xmlRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const scorePath = join(xmlRoot, entry.name, "score.xml");
      if (!existsSync(scorePath)) {
        return [];
      }

      const xmlContent = readFileSync(scorePath, "utf8");
      const metadata = parseMusicXmlMetadata(xmlContent);
      const inferred = inferNumberAndTitle(entry.name);
      const metadataTitle = typeof metadata.title === "string" ? metadata.title.trim() : "";
      const title = metadataTitle || inferred.fallbackTitle || entry.name;
      const author = typeof metadata.composer === "string" ? metadata.composer.trim() : "";

      return [
        {
          folderName: entry.name,
          explicitNumber: inferred.explicitNumber,
          title,
          author: author || "Desconhecido",
          originalKey: metadata.key ?? "C",
          defaultBpm: toSafeBpm(metadata.tempo),
          timeSignature: metadata.timeSignature ?? "4/4",
          xmlContent
        }
      ];
    });

  if (!rawEntries.length) {
    return [];
  }

  rawEntries.sort((a, b) => {
    if (a.explicitNumber !== undefined && b.explicitNumber !== undefined) {
      return a.explicitNumber - b.explicitNumber;
    }
    if (a.explicitNumber !== undefined) {
      return -1;
    }
    if (b.explicitNumber !== undefined) {
      return 1;
    }
    return a.title.localeCompare(b.title, "pt-BR");
  });

  const maxExplicitNumber = rawEntries.reduce((max, entry) => {
    if (entry.explicitNumber === undefined) {
      return max;
    }
    return Math.max(max, entry.explicitNumber);
  }, 0);

  let nextAutoNumber = maxExplicitNumber + 1;
  const result = [] as HymnSeedEntry[];

  rawEntries.forEach((entry) => {
    const number = entry.explicitNumber ?? nextAutoNumber++;
    const slug = slugify(entry.title) || slugify(entry.folderName) || `hino-${number}`;
    const id = `oracao-${String(number).padStart(3, "0")}-${slug}`;
    const fileName = `${id}.musicxml`;

    writeFileSync(join(uploadsDir, fileName), entry.xmlContent, "utf8");

    result.push({
      id,
      title: entry.title,
      number,
      author: entry.author,
      originalKey: entry.originalKey,
      defaultBpm: entry.defaultBpm,
      timeSignature: entry.timeSignature,
      category: "Oração",
      tags: OBRIGATORY_TAGS,
      xmlFilePath: `uploads/hymns/${fileName}`
    });
  });

  return result;
}

async function upsertUsers() {
  const studentEmail =
    process.env.STUDENT_USER_EMAIL ?? process.env.DEFAULT_USER_EMAIL ?? "aluno@cadernim.local";
  const studentPassword = process.env.STUDENT_USER_PASSWORD ?? "aluno123456";
  const adminEmail = process.env.ADMIN_USER_EMAIL ?? "admin@cadernim.local";
  const adminPassword = process.env.ADMIN_USER_PASSWORD ?? "admin123456";

  const student = await prisma.user.upsert({
    where: { email: studentEmail.toLowerCase() },
    update: {
      name: "Aluno Demo",
      role: "STUDENT"
    },
    create: {
      name: "Aluno Demo",
      email: studentEmail.toLowerCase(),
      role: "STUDENT",
      passwordHash: hashPassword(studentPassword)
    }
  });

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: "Administrador",
      role: "ADMIN"
    },
    create: {
      name: "Administrador",
      email: adminEmail.toLowerCase(),
      role: "ADMIN",
      passwordHash: hashPassword(adminPassword)
    }
  });

  return student;
}

async function upsertHymns(entries: HymnSeedEntry[]) {
  const hymns = [] as Hymn[];

  for (const entry of entries) {
    const hymn = await prisma.hymn.upsert({
      where: { id: entry.id },
      update: {
        title: entry.title,
        number: entry.number,
        author: entry.author,
        originalKey: entry.originalKey,
        defaultBpm: entry.defaultBpm,
        timeSignature: entry.timeSignature,
        category: entry.category,
        tags: entry.tags,
        xmlFilePath: entry.xmlFilePath
      },
      create: entry
    });

    hymns.push(hymn);
  }

  return hymns;
}

async function seedPracticeData(studentId: string, hymns: Hymn[]) {
  const studyHymns = hymns.slice(0, 3);
  if (!studyHymns.length) {
    return;
  }

  const studyIds = studyHymns.map((item) => item.id);

  await prisma.hymnSession.deleteMany({
    where: {
      userId: studentId,
      hymnId: { in: studyIds }
    }
  });

  const accompanimentCycle = ["melody_metronome", "melody_chords", "melody_pad"] as const;

  await prisma.hymnSession.createMany({
    data: studyHymns.map((hymn, index) => ({
      userId: studentId,
      hymnId: hymn.id,
      selectedKey: hymn.originalKey,
      selectedBpm: Math.max(50, hymn.defaultBpm - (index + 1) * 4),
      accompanimentType: accompanimentCycle[index % accompanimentCycle.length],
      loopStart: 1,
      loopEnd: 2
    }))
  });

  await prisma.hymnNote.deleteMany({
    where: {
      userId: studentId,
      hymnId: { in: studyIds }
    }
  });

  const noteTemplates = [
    "Treinar devagar no inicio e aumentar o BPM em blocos pequenos.",
    "Estudar a troca de acordes antes de tocar a musica inteira.",
    "Praticar o fraseado com respiracao curta e constante."
  ];

  await prisma.hymnNote.createMany({
    data: studyHymns.map((hymn, index) => ({
      userId: studentId,
      hymnId: hymn.id,
      content: `${hymn.title}: ${noteTemplates[index % noteTemplates.length]}`
    }))
  });
}

async function seedAvaLessons() {
  const count = await prisma.videoLesson.count();
  if (count > 0) return;

  await prisma.videoLesson.createMany({
    data: [
      { module: "Video Aulas", order: 1, title: "Tonalidade Maior e Menor - Video Aula #4", teacher: "Rafael Mendonca", level: "iniciante", durationLabel: "YouTube", description: "Aula real do canal.", tags: ["video-aula", "tonalidade"], thumbnail: "https://i.ytimg.com/vi/ipKomKxhb5A/hqdefault.jpg", sourceUrl: "https://youtu.be/ipKomKxhb5A?si=sUl6oZ2DWsjHmhDs", sourceType: "youtube", materials: [{ label: "Canal principal", url: "https://www.youtube.com/@rafaelmendoncaviolao/videos" }] },
      { module: "Video Aulas", order: 2, title: "Tonalismo X Modalismo - Video Aula #3", teacher: "Rafael Mendonca", level: "iniciante", durationLabel: "YouTube", description: "Aula real do canal.", tags: ["video-aula", "modalismo"], thumbnail: "https://i.ytimg.com/vi/JUIPCeBgzeg/hqdefault.jpg", sourceUrl: "https://youtu.be/JUIPCeBgzeg?si=qNQ4yQV-C_wAgBrO", sourceType: "youtube" },
      { module: "Video Aulas", order: 3, title: "Nomenclatura e Cifragem de Triades - Video Aula #2", teacher: "Rafael Mendonca", level: "iniciante", durationLabel: "YouTube", description: "Aula real do canal.", tags: ["video-aula", "cifragem"], thumbnail: "https://i.ytimg.com/vi/Udo-dsh150E/hqdefault.jpg", sourceUrl: "https://youtu.be/Udo-dsh150E?si=-dOCjXCMr2I69TI7", sourceType: "youtube" },
      { module: "Video Aulas", order: 4, title: "Teoria explicada no violao - Video Aula #1", teacher: "Rafael Mendonca", level: "intermediario", durationLabel: "YouTube", description: "Aula real do canal.", tags: ["video-aula", "teoria"], thumbnail: "https://i.ytimg.com/vi/IVd1CjQGBH4/hqdefault.jpg", sourceUrl: "https://youtu.be/IVd1CjQGBH4?si=NMR-LALU5JaFkLoM", sourceType: "youtube" },
      { module: "Dicas de Estudo", order: 1, title: "Estude assim e evolua muito mais!", teacher: "Rafael Mendonca", level: "intermediario", durationLabel: "YouTube", description: "Aula real do canal.", tags: ["dicas", "estudo"], thumbnail: "https://i.ytimg.com/vi/h7PneXC35tQ/hqdefault.jpg", sourceUrl: "https://youtu.be/h7PneXC35tQ?si=MUMl13-zXod7IthB", sourceType: "youtube" },
      { module: "Trocacao de Ideia", order: 1, title: "Preciso estudar teoria musical? - Trocacao de Ideia #4", teacher: "Rafael Mendonca", level: "avancado", durationLabel: "YouTube", description: "Video real do canal.", tags: ["trocacao", "teoria"], thumbnail: "https://i.ytimg.com/vi/ak4yn_RR9MA/hqdefault.jpg", sourceUrl: "https://youtu.be/ak4yn_RR9MA?si=_vsIafV51yKopxmJ", sourceType: "youtube" },
      { module: "Hinos e Arranjos", order: 1, title: "Do Sol vos nasce a Luz - Germano Guilherme", teacher: "Rafael Mendonca", level: "intermediario", durationLabel: "YouTube", description: "Video real do canal.", tags: ["hino", "arranjo"], thumbnail: "https://i.ytimg.com/vi/aq61nOJ37FE/hqdefault.jpg", sourceUrl: "https://youtu.be/aq61nOJ37FE?si=Z4z_4ZmskWPddqbW", sourceType: "youtube" },
      { module: "Trocacao de Ideia", order: 2, title: "Musica e Autoconhecimento - Trocacao de ideia #3", teacher: "Rafael Mendonca", level: "intermediario", durationLabel: "YouTube", description: "Video real do canal.", tags: ["trocacao", "autoconhecimento"], thumbnail: "https://i.ytimg.com/vi/heJQu5S6l6g/hqdefault.jpg", sourceUrl: "https://youtu.be/heJQu5S6l6g?si=qiv2I0TCO2GSITx9", sourceType: "youtube" },
      { module: "Hinos e Arranjos", order: 2, title: "Esta estrela que nos guia - Antonio Gomes", teacher: "Rafael Mendonca", level: "avancado", durationLabel: "YouTube", description: "Video real do canal.", tags: ["hino", "arranjo"], thumbnail: "https://i.ytimg.com/vi/hvlpw0t1Tgo/hqdefault.jpg", sourceUrl: "https://youtu.be/hvlpw0t1Tgo?si=UYroyHuW3NrcIh3O", sourceType: "youtube" },
      { module: "Hinos e Arranjos", order: 3, title: "Lua Branca - Passo a passo arranjo Simples", teacher: "Rafael Mendonca", level: "iniciante", durationLabel: "YouTube", description: "Video real do canal.", tags: ["hino", "passo-a-passo"], thumbnail: "https://i.ytimg.com/vi/dkmqfRXEQRE/hqdefault.jpg", sourceUrl: "https://youtu.be/dkmqfRXEQRE?si=GuvV2qi8xjx2zYsy", sourceType: "youtube" },
      { module: "Harmonia de Hinos", order: 1, title: "Passo a passo - Harmonia para Devo Amar Aquela Luz", teacher: "Rafael Mendonca", level: "intermediario", durationLabel: "YouTube", description: "Video real do canal.", tags: ["harmonia", "passo-a-passo"], thumbnail: "https://i.ytimg.com/vi/MUJMh2xKGLg/hqdefault.jpg", sourceUrl: "https://youtu.be/MUJMh2xKGLg?si=mn2MblOFBCGXG_Ps", sourceType: "youtube" },
      { module: "Harmonia de Hinos", order: 2, title: "Devo Amar Aquela Luz - Dicas de Musica", teacher: "Rafael Mendonca", level: "intermediario", durationLabel: "YouTube", description: "Video real do canal.", tags: ["harmonia", "dicas"], thumbnail: "https://i.ytimg.com/vi/x2Bc0JvpL-c/hqdefault.jpg", sourceUrl: "https://youtu.be/x2Bc0JvpL-c?si=psBB4BMQQCkb9hM2", sourceType: "youtube" },
      { module: "Hinos e Arranjos", order: 4, title: "O Daime e - Dicas de Musica", teacher: "Rafael Mendonca", level: "avancado", durationLabel: "YouTube", description: "Video real do canal.", tags: ["hino", "dicas"], thumbnail: "https://i.ytimg.com/vi/omh7-571iXY/hqdefault.jpg", sourceUrl: "https://youtu.be/omh7-571iXY?si=aGI6EMdrzGzp2sOk", sourceType: "youtube" }
    ]
  });

  console.log("AVA: 13 aulas de video sincronizadas.");
}

async function seedPodcastEpisodes() {
  const count = await prisma.podcastEpisode.count();
  if (count > 0) return;

  await prisma.podcastEpisode.createMany({
    data: [
      { series: "Fundamentos do Hinario", order: 1, title: "Episodio 01 — aguardando link", host: "Escola da Floresta", level: "iniciante", durationLabel: "00:00", publishedLabel: "Em breve", description: "Episodio preparado para receber o link oficial do podcast.", tags: ["fundamentos", "hinario"], coverImage: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80", sourceUrl: "", sourceType: "direct" },
      { series: "Fundamentos do Hinario", order: 2, title: "Episodio 02 — aguardando link", host: "Escola da Floresta", level: "iniciante", durationLabel: "00:00", publishedLabel: "Em breve", description: "Episodio preparado para receber o link oficial do podcast.", tags: ["fundamentos", "estudo"], coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80", sourceUrl: "", sourceType: "direct" },
      { series: "Pratica Musical", order: 1, title: "Episodio 03 — aguardando link", host: "Escola da Floresta", level: "intermediario", durationLabel: "00:00", publishedLabel: "Em breve", description: "Episodio preparado para receber o link oficial do podcast.", tags: ["pratica", "ritmo"], coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80", sourceUrl: "", sourceType: "direct" },
      { series: "Pratica Musical", order: 2, title: "Episodio 04 — aguardando link", host: "Escola da Floresta", level: "intermediario", durationLabel: "00:00", publishedLabel: "Em breve", description: "Episodio preparado para receber o link oficial do podcast.", tags: ["pratica", "harmonia"], coverImage: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=1200&q=80", sourceUrl: "", sourceType: "direct" },
      { series: "Troca de Experiencias", order: 1, title: "Episodio 05 — aguardando link", host: "Escola da Floresta", level: "intermediario", durationLabel: "00:00", publishedLabel: "Em breve", description: "Episodio preparado para receber o link oficial do podcast.", tags: ["conversa", "vivencia"], coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80", sourceUrl: "", sourceType: "direct" },
      { series: "Troca de Experiencias", order: 2, title: "Episodio 06 — aguardando link", host: "Escola da Floresta", level: "avancado", durationLabel: "00:00", publishedLabel: "Em breve", description: "Episodio preparado para receber o link oficial do podcast.", tags: ["conversa", "interpretacao"], coverImage: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80", sourceUrl: "", sourceType: "direct" }
    ]
  });

  console.log("Podcasts: 6 episodios sincronizados.");
}

async function main() {
  const uploadsDir = join(process.cwd(), "uploads/hymns");
  mkdirSync(uploadsDir, { recursive: true });

  const student = await upsertUsers();

  const oracaoEntries = loadOracaoHymns(uploadsDir);
  if (!oracaoEntries.length) {
    throw new Error("Nenhum score.xml foi encontrado em docs/Arquivos XML/Oração/XML.");
  }

  const hymns = await upsertHymns(oracaoEntries);

  await prisma.hymn.deleteMany({
    where: { id: { in: LEGACY_SAMPLE_HYMN_IDS } }
  });

  await seedPracticeData(student.id, hymns);
  await seedAvaLessons();
  await seedPodcastEpisodes();

  console.log(`Seed finalizado com sucesso. ${hymns.length} hinos da colecao Oração foram sincronizados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
