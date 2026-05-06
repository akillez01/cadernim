import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { XMLParser } from "fast-xml-parser";

type AuditRow = {
  file: string;
  status: "ok" | "sem-score" | "sem-part" | "sem-measures" | "xml-invalido";
  measures?: number;
  hasTab?: boolean;
  backupCount?: number;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function walkFiles(
  root: string,
  predicate: (absPath: string, name: string) => boolean,
  out: string[] = []
) {
  if (!existsSync(root)) return out;

  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, predicate, out);
      continue;
    }
    if (predicate(abs, entry.name)) out.push(abs);
  }
  return out;
}

function pickPartNode(score: Record<string, unknown>) {
  if (score.part) return asArray(score.part as any)[0] as Record<string, unknown>;

  for (const key of Object.keys(score)) {
    if (!key.startsWith("part") || key === "part-list") continue;
    const candidate = asArray((score as any)[key])[0] as Record<string, unknown> | undefined;
    if (candidate?.measure) return candidate;
  }
  return null;
}

function auditFile(file: string): AuditRow {
  const rel = relative(process.cwd(), file);
  let doc: Record<string, unknown>;

  try {
    doc = parser.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return { file: rel, status: "xml-invalido" };
  }

  const score =
    (doc["score-partwise"] as Record<string, unknown> | undefined) ??
    (doc["score-timewise"] as Record<string, unknown> | undefined);
  if (!score) return { file: rel, status: "sem-score" };

  const part = pickPartNode(score);
  if (!part) return { file: rel, status: "sem-part" };

  const measures = asArray((part as any).measure);
  if (!measures.length) return { file: rel, status: "sem-measures" };

  let backupCount = 0;
  let hasTab = false;

  for (const measure of measures) {
    const notes = asArray((measure as any).note);
    for (const note of notes) {
      const staff = String((note as any)?.staff ?? "");
      const voice = String((note as any)?.voice ?? "");
      if (staff === "2" || voice === "5") hasTab = true;
    }

    const backups = asArray((measure as any).backup);
    backupCount += backups.length;
    if (backups.length > 0) hasTab = true;
  }

  return {
    file: rel,
    status: "ok",
    measures: measures.length,
    hasTab,
    backupCount
  };
}

function main() {
  const files = [
    ...walkFiles(join(process.cwd(), "docs/Arquivos XML/Oração/XML"), (_, name) => name === "score.xml"),
    ...walkFiles(join(process.cwd(), "docs/Arquivos XML/outrosxml"), (_, name) =>
      /\.(musicxml|xml)$/i.test(name)
    ),
    ...walkFiles(join(process.cwd(), "uploads/hymns"), (_, name) => /\.musicxml$/i.test(name))
  ];

  const rows = files
    .map((file) => auditFile(file))
    .sort((a, b) => a.file.localeCompare(b.file, "pt-BR"));

  const broken = rows.filter((row) => row.status !== "ok");
  const ok = rows.filter((row) => row.status === "ok");
  const tabLike = ok.filter((row) => row.hasTab).length;

  console.log(
    `TOTAL ${rows.length} | OK ${ok.length} | QUEBRADOS ${broken.length} | TAB-LIKE ${tabLike}`
  );

  if (broken.length) {
    console.log("\nArquivos com problema estrutural:");
    for (const row of broken) {
      console.log(`- ${row.file} (${row.status})`);
    }
  }

  const highlights = ok.filter((row) => row.hasTab || (row.backupCount ?? 0) > 0);
  if (highlights.length) {
    console.log("\nArquivos com dupla pauta/TAB:");
    for (const row of highlights) {
      console.log(`- ${row.file} | measures:${row.measures} | backups:${row.backupCount}`);
    }
  }

  if (broken.length) {
    process.exitCode = 1;
  }
}

main();
