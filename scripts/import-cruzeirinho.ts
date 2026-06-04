#!/usr/bin/env tsx
/**
 * Extrai os .mxl do Cruzeirinho para docs/Arquivos XML/Mestre Irineu - Cruzeirinho/XML/
 * Uso: npx tsx scripts/import-cruzeirinho.ts [--src <pasta>]
 * O src padrão é CADERNIM-20260604T115057Z-3-001/CADERNIM/Mestre Irineu - Cruzeirinho/Cruzeirinho XML
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import JSZip from "jszip";

const ROOT = resolve(__dirname, "..");
const DEFAULT_SRC = join(
  ROOT,
  "CADERNIM-20260604T115057Z-3-001/CADERNIM/Mestre Irineu - Cruzeirinho/Cruzeirinho XML"
);
const DEST_ROOT = join(ROOT, "docs/Arquivos XML/Mestre Irineu - Cruzeirinho/XML");

const srcArg = process.argv.indexOf("--src");
const srcDir = srcArg !== -1 ? resolve(process.argv[srcArg + 1]) : DEFAULT_SRC;

if (!existsSync(srcDir)) {
  console.error(`Pasta de origem não encontrada: ${srcDir}`);
  process.exit(1);
}

function cleanFolderName(filename: string): string {
  // "1- Dou viva a Deus nas Alturas.mxl" → "1 Dou viva a Deus nas Alturas"
  return filename
    .replace(/\.mxl$/i, "")
    .replace(/^(\d+)-\s*/, (_, n) => `${n} `)
    .trim();
}

async function extractMxl(mxlPath: string, destFolder: string) {
  const buf = readFileSync(mxlPath);
  const zip = await JSZip.loadAsync(buf);

  let xmlEntry = zip.file("score.xml");
  if (!xmlEntry) {
    const entries = Object.keys(zip.files).filter(
      (n) => n.endsWith(".xml") && !n.startsWith("META-INF")
    );
    if (!entries.length) throw new Error(`Nenhum XML encontrado em ${mxlPath}`);
    xmlEntry = zip.file(entries[0])!;
  }

  mkdirSync(destFolder, { recursive: true });
  const xmlContent = await xmlEntry.async("string");
  writeFileSync(join(destFolder, "score.xml"), xmlContent, "utf8");

  // Preserva META-INF se existir
  const metaEntry = zip.file("META-INF/container.xml");
  if (metaEntry) {
    mkdirSync(join(destFolder, "META-INF"), { recursive: true });
    const metaContent = await metaEntry.async("string");
    writeFileSync(join(destFolder, "META-INF/container.xml"), metaContent, "utf8");
  }
}

async function main() {
  const mxlFiles = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".mxl"));
  if (!mxlFiles.length) {
    console.error("Nenhum arquivo .mxl encontrado na pasta de origem.");
    process.exit(1);
  }

  console.log(`Importando ${mxlFiles.length} hinos do Cruzeirinho...`);

  for (const file of mxlFiles) {
    const folderName = cleanFolderName(file);
    const destFolder = join(DEST_ROOT, folderName);
    try {
      await extractMxl(join(srcDir, file), destFolder);
      console.log(`  ✓ ${folderName}`);
    } catch (e) {
      console.error(`  ✗ ${file}: ${e}`);
    }
  }

  console.log(`\nFeito! Arquivos em: ${DEST_ROOT}`);
  console.log("Agora execute: npm run prisma:seed  (ou use deploy.sh)");
}

main();
