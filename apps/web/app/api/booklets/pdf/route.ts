import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { decodeBookletSpec } from "@/lib/booklet-spec";
import { buildBookletHymns } from "@/lib/booklet-data";
import type { BookletHymn } from "@/lib/booklet-types";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

type PdfPayload = {
  title: string;
  spec: string;
};

const requestSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  spec: z.string().min(1)
});

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMeasureGrid(hymn: BookletHymn) {
  const rows = hymn.measures
    .filter((measure) => measure.syllables.length > 0 || measure.chords.length > 0 || measure.lyric.length > 0)
    .map((measure) => {
      if (measure.syllables.length > 0) {
        return `
          <section class=\"measure\">
            <p class=\"measure-title\">Compasso ${measure.number}</p>
            <p class=\"line-label\">1a estrofe (melodia)</p>
            <div class=\"measure-grid\">${measure.syllables
              .map((syllable, index) => `<div class=\"cell\"><span class=\"top\">${escapeHtml(measure.melodyTokens[index] ?? "-")}</span><span class=\"bottom\">${escapeHtml(syllable)}</span></div>`)
              .join("")}</div>
            <p class=\"line-label\">2a estrofe (harmonia)</p>
            <div class=\"measure-grid\">${measure.syllables
              .map((syllable, index) => {
                const chord = measure.chords.length ? measure.chords[Math.min(index, measure.chords.length - 1)] : "-";
                return `<div class=\"cell harmony\"><span class=\"top\">${escapeHtml(chord)}</span><span class=\"bottom\">${escapeHtml(syllable)}</span></div>`;
              })
              .join("")}</div>
          </section>
        `;
      }

      return `
        <section class=\"measure\">
          <p class=\"measure-title\">Compasso ${measure.number}</p>
          <p class=\"fallback\">Cifras: ${measure.chords.length ? escapeHtml(measure.chords.join(" • ")) : "(sem cifras)"}</p>
          <p class=\"fallback\">Letra: ${measure.lyric ? escapeHtml(measure.lyric) : "(sem letra)"}</p>
        </section>
      `;
    })
    .join("");

  return rows || `<p class=\"fallback\">Sem dados suficientes de letra/cifra para este hino.</p>`;
}

function buildPdfHtml(title: string, hymns: BookletHymn[]) {
  const sections = hymns
    .map(
      (hymn) => `
      <section class=\"page\">
        <header class=\"header\">
          <p class=\"hymn-number\">Hino #${hymn.number}</p>
          <h2>${escapeHtml(hymn.title)}</h2>
          <p class=\"meta\">${escapeHtml(hymn.author)}</p>
          <p class=\"meta\">Tom original: ${escapeHtml(hymn.originalKey)} | Tom selecionado: ${escapeHtml(hymn.selectedKey)} | BPM: ${hymn.defaultBpm} | Compasso: ${escapeHtml(hymn.timeSignature)}</p>
        </header>
        ${renderMeasureGrid(hymn)}
      </section>
    `
    )
    .join("");

  return `
    <!doctype html>
    <html lang=\"pt-BR\">
      <head>
        <meta charset=\"utf-8\" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 14mm 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1f2d26; margin: 0; }
          h1, h2, p { margin: 0; }
          .cover { margin-bottom: 12mm; border-bottom: 1px solid #d9e4dc; padding-bottom: 6mm; }
          .cover h1 { font-size: 24px; margin-bottom: 4px; }
          .cover p { font-size: 12px; color: #4f6f5d; }
          .page { page-break-after: always; padding-top: 4mm; }
          .page:last-child { page-break-after: auto; }
          .header { margin-bottom: 6mm; border-bottom: 1px solid #d9e4dc; padding-bottom: 3mm; }
          .hymn-number { font-size: 11px; color: #4f6f5d; text-transform: uppercase; letter-spacing: .06em; }
          .header h2 { font-size: 22px; margin: 4px 0 2px; }
          .meta { font-size: 12px; color: #4f6f5d; margin-top: 2px; }
          .measure { margin-bottom: 4mm; border: 1px solid #e4efe6; border-radius: 8px; padding: 3mm; }
          .measure-title { font-size: 11px; text-transform: uppercase; color: #4f6f5d; margin-bottom: 2mm; }
          .line-label { font-size: 11px; color: #4f6f5d; margin-bottom: 1mm; }
          .measure-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18mm, 1fr)); gap: 1.5mm; margin-bottom: 2mm; }
          .cell { border: 1px solid #dfc9ab; border-radius: 6px; background: #fbf6ef; min-height: 12mm; padding: 1.5mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .cell.harmony { border-color: #cde0d2; background: #f3f7f3; }
          .cell .top { font-size: 11px; font-weight: 700; }
          .cell .bottom { font-size: 10px; margin-top: .8mm; }
          .fallback { font-size: 12px; margin-top: 1mm; }
        </style>
      </head>
      <body>
        <header class=\"cover\">
          <h1>${escapeHtml(title)}</h1>
          <p>${hymns.length} hinos selecionados para caderninho</p>
        </header>
        ${sections}
      </body>
    </html>
  `;
}

async function generatePdfFromHtml(html: string) {
  const puppeteer = await import("puppeteer");
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    const body = (await request.json()) as PdfPayload;
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Payload invalido para gerar PDF." }, { status: 400 });
    }

    const title = (parsed.data.title ?? "Caderninho de Hinos").trim() || "Caderninho de Hinos";
    const spec = decodeBookletSpec(parsed.data.spec);

    if (!spec) {
      return NextResponse.json({ error: "Nao foi possivel decodificar a selecao do caderninho." }, { status: 400 });
    }

    const hymns = await buildBookletHymns(spec);

    if (!hymns.length) {
      return NextResponse.json({ error: "Nenhum hino valido encontrado para gerar o PDF." }, { status: 400 });
    }

    const html = buildPdfHtml(title, hymns);
    const pdf = await generatePdfFromHtml(html);
    const fileName = `${sanitizeFileName(title) || "caderninho"}.pdf`;
    const pdfBytes = new Uint8Array(pdf);
    const pdfArrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Falha interna ao gerar PDF." }, { status: 500 });
  }
}
