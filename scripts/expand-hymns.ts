/**
 * Reads each original .mxl file from docs/Arquivos XML/Oração/XML/,
 * extracts the score.xml, applies expandRepeatsInMusicXml, and writes
 * the result to uploads/hymns/*.musicxml
 */
import * as path from "path";
import * as fs from "fs";
import JSZip from "jszip";
import { expandRepeatsInMusicXml } from "../packages/music-engine/src/musicxml";

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "docs/Arquivos XML/Oração/XML");
const OUT_DIR = path.join(ROOT, "uploads/hymns");

// Map: original file number prefix → output filename slug
const FILE_MAP: Record<string, string> = {
  "1 Examine a Conciência.mxl":                         "oracao-001-examine-a-conciencia.musicxml",
  "2 A meu pai peço firmeza.mxl":                        "oracao-002-a-meu-pai-peco-firmeza.musicxml",
  "3 Eu vivo com meu Mestre.mxl":                        "oracao-003-eu-vivo-com-meu-mestre.musicxml",
  "4 É pedindo e rogando.mxl":                           "oracao-004-e-pedindo-e-rogando.musicxml",
  "5 Dem Dum.mxl":                                       "oracao-005-dem-dum.musicxml",
  "6 Aqui eu vou expor.mxl":                             "oracao-006-aqui-eu-vou-expor.musicxml",
  "7 Eu vou rezar.mxl":                                  "oracao-007-eu-vou-rezar.musicxml",
  "8 Para estar junto a este cruzeiro.mxl":              "oracao-008-para-estar-junto-a-este-cruzeiro.musicxml",
  "9 Não creia nos mestres que te aparecem.mxl":         "oracao-009-nao-creia-nos-mestres-que-te-aparecem.musicxml",
  "10 Meu pai peço que vós me ouça.mxl":                 "oracao-010-meu-pai-peco-que-vos-me-ouca.musicxml",
  "11 O amor.mxl":                                       "oracao-011-o-amor.musicxml",
  "12 Eu não sou Deus.mxl":                              "oracao-012-eu-nao-sou-deus.musicxml",
  "13 Eu pedi e tive o toque.mxl":                       "oracao-013-eu-pedi-e-tive-o-toque.musicxml",
  "14 A magia da oração.mxl":                            "oracao-014-a-magia-da-oracao.musicxml",
  "Recebendo.mxl":                                       "oracao-015-recebendo.musicxml",
};

async function processFile(mxlName: string, outName: string) {
  const mxlPath = path.join(SRC_DIR, mxlName);
  const outPath = path.join(OUT_DIR, outName);

  const buf = fs.readFileSync(mxlPath);
  const zip = await JSZip.loadAsync(buf);

  // Find score.xml or the first .xml file
  let xmlEntry = zip.file("score.xml");
  if (!xmlEntry) {
    const entries = Object.keys(zip.files).filter(
      (n) => n.endsWith(".xml") && !n.startsWith("META-INF")
    );
    if (!entries.length) throw new Error(`No XML in ${mxlName}`);
    xmlEntry = zip.file(entries[0])!;
  }

  const xmlContent = await xmlEntry.async("string");
  const expanded = expandRepeatsInMusicXml(xmlContent);

  // Count repeats before/after
  const repeatsBefore = (xmlContent.match(/<repeat\b/g) || []).length;
  const endingsBefore = (xmlContent.match(/<ending\b/g) || []).length;
  const repeatsAfter  = (expanded.match(/<repeat\b/g) || []).length;
  const endingsAfter  = (expanded.match(/<ending\b/g) || []).length;

  const mBefore = (xmlContent.match(/<measure\b/g) || []).length;
  const mAfter  = (expanded.match(/<measure\b/g) || []).length;

  fs.writeFileSync(outPath, expanded, "utf8");

  console.log(
    `✓ ${outName.padEnd(55)} measures: ${mBefore}→${mAfter}  ` +
    `repeats: ${repeatsBefore}→${repeatsAfter}  endings: ${endingsBefore}→${endingsAfter}`
  );
}

async function main() {
  for (const [mxl, out] of Object.entries(FILE_MAP)) {
    try {
      await processFile(mxl, out);
    } catch (e) {
      console.error(`✗ ${mxl}: ${e}`);
    }
  }
  console.log("\nDone.");
}

main();
