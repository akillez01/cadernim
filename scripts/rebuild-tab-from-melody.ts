import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STRINGS = [
  { string: 1, openMidi: 64 }, // E4
  { string: 2, openMidi: 59 }, // B3
  { string: 3, openMidi: 55 }, // G3
  { string: 4, openMidi: 50 }, // D3
  { string: 5, openMidi: 45 }, // A2
  { string: 6, openMidi: 40 }  // E2
];

function pitchToMidi(step: string, alter: number, octave: number) {
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (octave + 1) * 12 + (base[step] ?? 0) + alter;
}

function toTabPosition(noteXml: string) {
  const step = noteXml.match(/<step>\s*([A-G])\s*<\/step>/)?.[1];
  const octaveRaw = noteXml.match(/<octave>\s*(-?\d+)\s*<\/octave>/)?.[1];
  const alterRaw = noteXml.match(/<alter>\s*(-?\d+)\s*<\/alter>/)?.[1];
  if (!step || octaveRaw === undefined) return null;

  const octave = Number(octaveRaw);
  const alter = alterRaw === undefined ? 0 : Number(alterRaw);
  const midi = pitchToMidi(step, alter, octave);

  const candidates = STRINGS
    .map((s) => ({ string: s.string, fret: midi - s.openMidi }))
    .filter((c) => c.fret >= 0 && c.fret <= 24)
    .sort((a, b) => (a.fret - b.fret) || (a.string - b.string));

  if (candidates.length) return candidates[0];

  // Fallback defensivo (evita nota sem posição de TAB)
  const fallback = STRINGS
    .map((s) => ({ string: s.string, fret: Math.max(0, midi - s.openMidi) }))
    .sort((a, b) => (a.fret - b.fret) || (a.string - b.string))[0];
  return fallback;
}

function replaceOrInsertTag(noteXml: string, tag: string, value: string) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`);
  if (re.test(noteXml)) {
    return noteXml.replace(re, `<${tag}>${value}</${tag}>`);
  }

  if (/<type>/.test(noteXml)) {
    return noteXml.replace(/<type>/, `<${tag}>${value}</${tag}>\n        <type>`);
  }
  if (/<duration>/.test(noteXml)) {
    return noteXml.replace(/<duration>[\s\S]*?<\/duration>/, (m) => `${m}\n        <${tag}>${value}</${tag}>`);
  }
  return noteXml.replace(/<\/note>/, `        <${tag}>${value}</${tag}>\n      </note>`);
}

function melodyToTabNote(noteXml: string) {
  let tab = noteXml;

  // TAB não leva letra
  tab = tab.replace(/\s*<lyric\b[\s\S]*?<\/lyric>/g, "");
  // Evita que agrupamentos/accidentals da pauta melódica "vazem" para a TAB.
  tab = tab.replace(/\s*<beam\b[\s\S]*?<\/beam>/g, "");
  tab = tab.replace(/\s*<accidental\b[\s\S]*?<\/accidental>/g, "");
  // Remove notações prévias para evitar conflito
  tab = tab.replace(/\s*<notations\b[\s\S]*?<\/notations>/g, "");

  tab = replaceOrInsertTag(tab, "voice", "5");
  tab = replaceOrInsertTag(tab, "staff", "2");
  tab = replaceOrInsertTag(tab, "stem", "none");

  if (!/<rest\b/.test(tab)) {
    const pos = toTabPosition(tab);
    if (pos) {
      tab = tab.replace(
        /<\/note>/,
        `        <notations>\n          <technical>\n            <string>${pos.string}</string>\n            <fret>${pos.fret}</fret>\n          </technical>\n        </notations>\n      </note>`
      );
    }
  }

  return tab;
}

function isTabNote(noteXml: string) {
  return /<voice>\s*5\s*<\/voice>/.test(noteXml) || /<staff>\s*2\s*<\/staff>/.test(noteXml);
}

function isValidNote(noteXml: string) {
  return /<rest\b/.test(noteXml) || /<pitch>[\s\S]*?<\/pitch>/.test(noteXml);
}

function noteDuration(noteXml: string) {
  const raw = noteXml.match(/<duration>\s*(\d+)\s*<\/duration>/)?.[1];
  return raw ? Number(raw) : 0;
}

function rebuildMeasure(measureXml: string) {
  const open = measureXml.match(/^<measure\b[^>]*>/)?.[0];
  const close = "</measure>";
  if (!open || !measureXml.endsWith(close)) return measureXml;

  const inner = measureXml.slice(open.length, -close.length);
  const itemRe = /<note\b[\s\S]*?<\/note>|<backup\b[\s\S]*?<\/backup>/g;
  const items = Array.from(inner.matchAll(itemRe));
  if (!items.length) return measureXml;

  const firstIndex = items[0].index ?? 0;
  const last = items[items.length - 1];
  const lastEnd = (last.index ?? 0) + last[0].length;

  const prefix = inner.slice(0, firstIndex);
  const suffix = inner.slice(lastEnd);

  const noteItems = items.map((m) => m[0]).filter((x) => x.startsWith("<note"));
  const melodyNotes = noteItems.filter((note) => !isTabNote(note) && isValidNote(note));
  if (!melodyNotes.length) return measureXml;

  let durationSum = 0;
  for (const note of melodyNotes) {
    const isChord = /<chord\s*\/>/.test(note);
    if (!isChord) durationSum += noteDuration(note);
  }

  const tabNotes = melodyNotes.map(melodyToTabNote);
  const backup = `      <backup>\n        <duration>${durationSum}</duration>\n      </backup>`;

  const rebuiltBody = `${prefix}${melodyNotes.join("\n")}\n${backup}\n${tabNotes.join("\n")}${suffix}`;
  return `${open}${rebuiltBody}${close}`;
}

function rebuildFile(filePath: string) {
  const xml = readFileSync(filePath, "utf8");
  let updated = xml.replace(/<measure\b[^>]*>[\s\S]*?<\/measure>/g, (m) => rebuildMeasure(m));

  // Remove barlines à esquerda (visualmente "linha de separação" duplicada).
  updated = updated.replace(/\s*<barline\b[^>]*location="left"[^>]*>[\s\S]*?<\/barline>/g, "");
  updated = updated.replace(/\s*<barline>\s*<\/barline>/g, "");

  writeFileSync(filePath, updated, "utf8");
}

function targets() {
  const out: string[] = [];

  const oracaoRoot = join(process.cwd(), "docs/Arquivos XML/Oração/XML");
  if (existsSync(oracaoRoot)) {
    const dirs = readdirSync(oracaoRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const dir of dirs) {
      const score = join(oracaoRoot, dir.name, "score.xml");
      if (existsSync(score)) out.push(score);
    }
  }

  const uploadsRoot = join(process.cwd(), "uploads/hymns");
  if (existsSync(uploadsRoot)) {
    const files = readdirSync(uploadsRoot).filter((f) => /^oracao-\d{3}-.*\.musicxml$/i.test(f));
    for (const file of files) out.push(join(uploadsRoot, file));
  }

  return out.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function main() {
  const files = targets();
  for (const file of files) {
    rebuildFile(file);
    console.log(`OK ${file}`);
  }
  console.log(`\\nTAB rebuilt from melody in ${files.length} files.`);
}

main();
