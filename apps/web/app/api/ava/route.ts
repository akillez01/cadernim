import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest, isAdmin } from "@/lib/auth-user";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

const videoLessonSchema = z.object({
  module: z.string().min(1).max(120),
  order: z.coerce.number().int().min(0).default(0),
  title: z.string().min(1).max(200),
  teacher: z.string().min(1).max(120),
  level: z.enum(["iniciante", "intermediario", "avancado"]).default("iniciante"),
  durationLabel: z.string().max(20).default(""),
  description: z.string().max(2000).default(""),
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().max(500).default(""),
  sourceUrl: z.string().max(500),
  sourceType: z.enum(["youtube", "direct"]).default("youtube"),
  materials: z.array(z.object({ label: z.string(), url: z.string() })).optional()
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const module_ = searchParams.get("module")?.trim();
    const level = searchParams.get("level")?.trim();

    const lessons = await prisma.videoLesson.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { teacher: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } }
            ]
          } : {},
          module_ ? { module: { equals: module_, mode: "insensitive" } } : {},
          level ? { level: { equals: level } } : {}
        ]
      },
      orderBy: [{ module: "asc" }, { order: "asc" }]
    });

    return NextResponse.json({ data: lessons });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel listar as aulas.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden("Somente administradores podem cadastrar aulas.");

    const body = await request.json();
    const parsed = videoLessonSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten().formErrors.join(", ") || "Dados invalidos.");

    const lesson = await prisma.videoLesson.create({ data: parsed.data });
    return NextResponse.json({ data: lesson }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel cadastrar a aula.");
  }
}
