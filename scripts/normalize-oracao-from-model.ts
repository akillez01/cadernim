import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

type AnyObj = Record<string, any>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: false
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function hasEndingNumberOne(endingNode: AnyObj | string | undefined) {
  if (!endingNode || typeof endingNode !== "object") return false;
  const raw = String(endingNode["@_number"] ?? "");
  if (!raw) return false;
  return raw
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .includes("1");
}

function getEndingType(endingNode: AnyObj | string | undefined) {
  if (!endingNode || typeof endingNode !== "object") return "";
  return String(endingNode["@_type"] ?? "").toLowerCase();
}

function cleanBarlines(measure: AnyObj) {
  const barlines = asArray(measure.barline)
    .map((barline) => {
      const next = { ...barline };

      delete next.ending;
      delete next.repeat;

      if (typeof next["bar-style"] === "string") {
        const value = next["bar-style"];
        if (value === "light-heavy" || value === "heavy-light" || value === "heavy-heavy") {
          next["bar-style"] = "light";
        }
      }

      const keys = Object.keys(next).filter((key) => key !== "@_location");
      return keys.length ? next : null;
    })
    .filter(Boolean);

  if (!barlines.length) {
    delete measure.barline;
    return;
  }

  measure.barline = barlines.length === 1 ? barlines[0] : barlines;
}

function normalizeFirstMeasureImplicit(measures: AnyObj[]) {
  if (!measures.length) return;

  const first = measures[0];
  if (first["@_implicit"] === "yes") return;

  const divisions = Number(first?.attributes?.divisions ?? 1) || 1;
  const beats = Number(first?.attributes?.time?.beats ?? 4) || 4;
  const beatType = Number(first?.attributes?.time?.["beat-type"] ?? 4) || 4;
  const expected = divisions * beats * (4 / beatType);

  let actual = 0;
  const notes = asArray(first.note);
  const primary = notes.filter(
    (note) =>
      !note?.chord &&
      String(note?.voice ?? "1") === "1" &&
      String(note?.staff ?? "1") === "1"
  );
  const noteSource = primary.length ? primary : notes.filter((note) => !note?.chord);

  for (const note of noteSource) {
    actual += Number(note?.duration ?? 0) || 0;
  }

  if (actual > 0 && actual < expected * 0.75) {
    first["@_implicit"] = "yes";
  }
}

function transformFile(filePath: string) {
  const xml = readFileSync(filePath, "utf8");
  const doc = parser.parse(xml) as AnyObj;
  const scoreKey = doc["score-partwise"] ? "score-partwise" : doc["score-timewise"] ? "score-timewise" : "";
  if (!scoreKey) {
    throw new Error(`Formato nao suportado em ${filePath}`);
  }

  const score = doc[scoreKey] as AnyObj;
  const parts = asArray(score.part);
  const nextParts = parts.map((part) => {
    const measures = asArray(part.measure);
    let inFirstEnding = false;
    const kept: AnyObj[] = [];

    for (const measure of measures) {
      const barlines = asArray(measure.barline);
      const endings = barlines.flatMap((barline) => asArray(barline.ending));

      const hasStartOne = endings.some(
        (ending) => hasEndingNumberOne(ending) && getEndingType(ending) === "start"
      );
      const hasStopOne = endings.some(
        (ending) => hasEndingNumberOne(ending) && (getEndingType(ending) === "stop" || getEndingType(ending) === "discontinue")
      );
      const hasAnyOne = endings.some((ending) => hasEndingNumberOne(ending));

      if (hasStartOne) inFirstEnding = true;

      const dropMeasure = inFirstEnding || hasAnyOne;
      if (!dropMeasure) {
        const cloned = JSON.parse(JSON.stringify(measure)) as AnyObj;
        cleanBarlines(cloned);
        kept.push(cloned);
      }

      if (hasStopOne) inFirstEnding = false;
    }

    kept.forEach((measure, index) => {
      measure["@_number"] = String(index + 1);
    });

    normalizeFirstMeasureImplicit(kept);

    return {
      ...part,
      measure: kept.length === 1 ? kept[0] : kept
    };
  });

  score.part = nextParts.length === 1 ? nextParts[0] : nextParts;
  doc[scoreKey] = score;
  writeFileSync(filePath, builder.build(doc), "utf8");
}

function main() {
  const root = join(process.cwd(), "docs/Arquivos XML/Oração/XML");
  if (!existsSync(root)) {
    throw new Error(`Pasta nao encontrada: ${root}`);
  }

  const targets = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name, "score.xml"))
    .filter((filePath) => existsSync(filePath))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  for (const target of targets) {
    transformFile(target);
    console.log(`OK ${target}`);
  }

  console.log(`\\nTransformados: ${targets.length} arquivos.`);
}

main();
