import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest, isAdmin } from "@/lib/auth-user";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

const updateSchema = z.object({
  series: z.string().min(1).max(120).optional(),
  order: z.coerce.number().int().min(0).optional(),
  title: z.string().min(1).max(200).optional(),
  host: z.string().min(1).max(120).optional(),
  level: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  durationLabel: z.string().max(20).optional(),
  publishedLabel: z.string().max(60).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  coverImage: z.string().max(500).optional(),
  sourceUrl: z.string().max(500).optional(),
  sourceType: z.enum(["youtube", "direct"]).optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden("Somente administradores podem editar episodios.");

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados invalidos.");

    const episode = await prisma.podcastEpisode.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ data: episode });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel atualizar o episodio.");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden("Somente administradores podem remover episodios.");

    const { id } = await params;
    await prisma.podcastEpisode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel remover o episodio.");
  }
}
