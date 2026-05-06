import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { extractMusicXmlFromFile, parseMusicXml } from "@cadernim/music-engine";

const execFileAsync = promisify(execFile);

function isMusicXmlExtension(fileName: string) {
  const ext = extname(fileName).toLowerCase();
  return ext === ".xml" || ext === ".musicxml" || ext === ".mxl";
}

function isPdfExtension(fileName: string) {
  return extname(fileName).toLowerCase() === ".pdf";
}

async function findFirstMusicXmlLikeFile(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFirstMusicXmlLikeFile(abs);
      if (found) return found;
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (ext === ".mxl" || ext === ".xml" || ext === ".musicxml") {
      return abs;
    }
  }

  return null;
}

async function convertPdfToMusicXml(file: File) {
  const audiverisBin = process.env.AUDIVERIS_BIN?.trim() || "audiveris";
  const runRoot = await mkdtemp(join(tmpdir(), "cadernim-omr-"));
  const inputPath = join(runRoot, "input.pdf");
  const outputDir = join(runRoot, "out");

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    await execFileAsync(
      audiverisBin,
      ["-batch", "-transcribe", "-export", "-output", outputDir, inputPath],
      { timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 }
    );

    const musicXmlPath = await findFirstMusicXmlLikeFile(outputDir);
    if (!musicXmlPath) {
      throw new Error("Nao foi possivel localizar o MusicXML gerado pelo OMR.");
    }

    const ext = extname(musicXmlPath).toLowerCase();
    if (ext === ".mxl") {
      const raw = await readFile(musicXmlPath);
      return extractMusicXmlFromFile(raw, musicXmlPath);
    }

    return readFile(musicXmlPath, "utf8");
  } catch (error) {
    const maybe = error as NodeJS.ErrnoException & { stderr?: string };
    if (maybe?.code === "ENOENT") {
      throw new Error(
        "Conversao PDF requer Audiveris instalado no servidor. Configure AUDIVERIS_BIN ou instale o comando `audiveris`."
      );
    }

    const stderr = maybe?.stderr?.toString().trim();
    if (stderr) {
      throw new Error(`Falha na conversao PDF->MusicXML: ${stderr}`);
    }

    throw error;
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
}

export async function importScoreFileAsMusicXml(file: File) {
  const name = file.name || "arquivo";
  let xmlContent: string;

  if (isMusicXmlExtension(name)) {
    xmlContent = await extractMusicXmlFromFile(file, name);
  } else if (isPdfExtension(name)) {
    xmlContent = await convertPdfToMusicXml(file);
  } else {
    throw new Error("Formato nao suportado. Envie .xml, .musicxml, .mxl ou .pdf.");
  }

  // Sempre valida a estrutura antes de salvar/usar.
  parseMusicXml(xmlContent);
  return xmlContent;
}
