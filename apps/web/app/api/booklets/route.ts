import { NextRequest, NextResponse } from "next/server";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { unauthorized } from "@/lib/http";

export type BookletItem = {
  id: string;
  title: string;
  collection: string;
  url: string;
};

export type BookletCollection = {
  id: string;
  name: string;
  items: BookletItem[];
};

const COLLECTION_LABELS: Record<string, string> = {
  "ceu-das-matas": "Céu das Matas",
};

const PDF_TITLES: Record<string, string> = {
  "hinario-lua-branca-madrinha-rita":       "Hinário Lua Branca — Madrinha Rita",
  "hinario-nova-era":                        "Hinário Nova Era",
  "hinario-santa-missa-mestre-irineu":       "Hinário Santa Missa — Mestre Irineu",
  "madrinha-brilhante-estrela-brilhante":    "Estrela Brilhante — Madrinha Brilhante",
  "mestre-irineu-o-cruzeiro-tablet":         "O Cruzeiro — Mestre Irineu",
  "oracao-corrigida-mad-julia":              "Oração — Revisão Mad. Júlia",
  "pad-alfredo-cruzeirinho-nova-era":        "Cruzeirinho, Nova Era, Nova Dimensão — Pad. Alfredo",
  "padrinho-corrente-caboclo-guerreiro":     "Caboclo Guerreiro — Padrinho Corrente",
  "padrinho-sebastiao-o-justiceiro":         "O Justiceiro e Nova Jerusalém — Padrinho Sebastião",
  "teteo-o-assessor-tablet":                 "O Assessor — Teteo",
};

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return unauthorized();

  const publicDir = join(process.cwd(), "public", "booklets");
  if (!existsSync(publicDir)) {
    return NextResponse.json({ data: [] });
  }

  const collections: BookletCollection[] = [];

  for (const collectionSlug of readdirSync(publicDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)) {
    const collectionDir = join(publicDir, collectionSlug);
    const files = readdirSync(collectionDir).filter((f) => f.endsWith(".pdf"));

    const items: BookletItem[] = files.map((file) => {
      const slug = file.replace(/\.pdf$/, "");
      return {
        id: `${collectionSlug}/${slug}`,
        title: PDF_TITLES[slug] ?? slug.replace(/-/g, " "),
        collection: collectionSlug,
        url: `/booklets/${collectionSlug}/${file}`,
      };
    });

    collections.push({
      id: collectionSlug,
      name: COLLECTION_LABELS[collectionSlug] ?? collectionSlug,
      items,
    });
  }

  return NextResponse.json({ data: collections });
}
