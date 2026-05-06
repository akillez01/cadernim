import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest, isAdmin } from "@/lib/auth-user";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

const podcastSchema = z.object({
  series: z.string().min(1).max(120),
  order: z.coerce.number().int().min(0).default(0),
  title: z.string().min(1).max(200),
  host: z.string().min(1).max(120),
  level: z.enum(["iniciante", "intermediario", "avancado"]).default("iniciante"),
  durationLabel: z.string().max(20).default(""),
  publishedLabel: z.string().max(60).default(""),
  description: z.string().max(2000).default(""),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().max(500).default(""),
  sourceUrl: z.string().max(500).default(""),
  sourceType: z.enum(["youtube", "direct"]).default("direct")
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const series = searchParams.get("series")?.trim();
    const level = searchParams.get("level")?.trim();

    const episodes = await prisma.podcastEpisode.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { host: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } }
            ]
          } : {},
          series ? { series: { equals: series, mode: "insensitive" } } : {},
          level ? { level: { equals: level } } : {}
        ]
      },
      orderBy: [{ series: "asc" }, { order: "asc" }]
    });

    return NextResponse.json({ data: episodes });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel listar os episodios.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden("Somente administradores podem cadastrar episodios.");

    const body = await request.json();
    const parsed = podcastSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten().formErrors.join(", ") || "Dados invalidos.");

    const episode = await prisma.podcastEpisode.create({ data: parsed.data });
    return NextResponse.json({ data: episode }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel cadastrar o episodio.");
  }
}
