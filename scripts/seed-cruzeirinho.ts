#!/usr/bin/env tsx
/**
 * Seed autônomo para o Cruzeirinho — sem dependência de @cadernim/music-engine.
 * Uso: DATABASE_URL=... npx tsx scripts/seed-cruzeirinho.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = resolve(__dirname, "..");
const SRC_DIR = join(ROOT, "docs/Arquivos XML/Mestre Irineu - Cruzeirinho/XML");
const UPLOADS_DIR = join(ROOT, "uploads/hymns");
const CRUZEIRINHO_TAGS = ["hinario", "cruzeirinho", "escola-da-floresta"];

const prisma = new PrismaClient();

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function inferNumber(folderName: string) {
  const m = folderName.match(/^(\d+)[-\s]/u);
  return m ? Number(m[1]) : undefined;
}

function extractXmlText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
  return m ? m[1].trim() : "";
}

function parseXmlMeta(xmlContent: string) {
  const title = extractXmlText(xmlContent, "work-title") || extractXmlText(xmlContent, "movement-title");
  const composer = extractXmlText(xmlContent, "creator");
  const tempoRaw = extractXmlText(xmlContent, "per-minute");
  const tempo = tempoRaw ? parseInt(tempoRaw, 10) : undefined;

  const keyM = xmlContent.match(/<fifths>(-?\d+)<\/fifths>/);
  const modeM = xmlContent.match(/<mode>(major|minor)<\/mode>/);
  const fifths = keyM ? parseInt(keyM[1], 10) : 0;
  const mode = modeM ? modeM[1] : "major";

  const KEY_MAJOR = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb"];
  const KEY_MINOR = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"];
  const keyMap = mode === "minor" ? KEY_MINOR : KEY_MAJOR;
  const keyIdx = ((fifths % 14) + 14) % 14;
  const key = keyMap[keyIdx] ?? "C";

  const tsM = xmlContent.match(/<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/);
  const timeSignature = tsM ? `${tsM[1]}/${tsM[2]}` : "4/4";

  return { title, composer, tempo, key, timeSignature };
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`Pasta não encontrada: ${SRC_DIR}`);
    process.exit(1);
  }

  mkdirSync(UPLOADS_DIR, { recursive: true });

  const folders = readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => {
      const na = inferNumber(a.name) ?? 999;
      const nb = inferNumber(b.name) ?? 999;
      return na - nb;
    });

  if (!folders.length) {
    console.error("Nenhuma pasta de hino encontrada.");
    process.exit(1);
  }

  console.log(`Importando ${folders.length} hinos do Cruzeirinho...`);

  let seeded = 0;
  for (const folder of folders) {
    const scorePath = join(SRC_DIR, folder.name, "score.xml");
    if (!existsSync(scorePath)) continue;

    const xmlContent = readFileSync(scorePath, "utf8");
    const meta = parseXmlMeta(xmlContent);
    const number = inferNumber(folder.name) ?? seeded + 1;
    const folderTitle = folder.name.replace(/^\d+[-\s]+/, "").trim();
    const title = meta.title || folderTitle;
    const author = meta.composer || "Mestre Irineu";
    const bpm = Number.isFinite(meta.tempo) && meta.tempo! >= 20 ? Math.round(meta.tempo!) : 80;

    const slug = slugify(title) || slugify(folderTitle) || `cruzeirinho-${number}`;
    const id = `cruzeirinho-${String(number).padStart(3, "0")}-${slug}`;
    const fileName = `${id}.musicxml`;

    writeFileSync(join(UPLOADS_DIR, fileName), xmlContent, "utf8");

    await prisma.hymn.upsert({
      where: { id },
      update: {
        title, number, author,
        originalKey: meta.key,
        defaultBpm: bpm,
        timeSignature: meta.timeSignature,
        category: "Mestre Irineu - Cruzeirinho",
        tags: CRUZEIRINHO_TAGS,
        xmlFilePath: `uploads/hymns/${fileName}`
      },
      create: {
        id, title, number, author,
        originalKey: meta.key,
        defaultBpm: bpm,
        timeSignature: meta.timeSignature,
        category: "Mestre Irineu - Cruzeirinho",
        tags: CRUZEIRINHO_TAGS,
        xmlFilePath: `uploads/hymns/${fileName}`
      }
    });

    console.log(`  ✓ [${number}] ${title} — ${meta.key} ${bpm}bpm ${meta.timeSignature}`);
    seeded++;
  }

  console.log(`\n✅ ${seeded} hinos do Cruzeirinho sincronizados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
