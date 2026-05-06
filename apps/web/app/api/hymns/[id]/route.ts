import { NextRequest, NextResponse } from "next/server";
import { parseMusicXml } from "@cadernim/music-engine";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/storage";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";
import { hymnPayloadSchema } from "@/lib/validation";
import { getAuthUserFromRequest, isAdmin } from "@/lib/auth-user";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;
    const hymn = await prisma.hymn.findUnique({ where: { id } });

    if (!hymn) {
      return NextResponse.json({ error: "Hino nao encontrado." }, { status: 404 });
    }

    const includeXml = new URL(request.url).searchParams.get("includeXml") === "1";

    if (!includeXml) {
      return NextResponse.json({ data: hymn });
    }

    const storage = getStorageAdapter();
    const xmlContent = await storage.readText(hymn.xmlFilePath);
    const parsed = parseMusicXml(xmlContent);

    return NextResponse.json({
      data: {
        ...hymn,
        xmlContent,
        noteCount: parsed.noteEvents.length,
        totalBeats: parsed.totalBeats,
        measures: parsed.measures.length
      }
    });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel carregar o hino.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }
    if (!isAdmin(user)) {
      return forbidden("Somente administradores podem editar hinos.");
    }

    const { id } = await params;
    const body = await request.json();

    const parsed = hymnPayloadSchema.partial().safeParse({
      ...body,
      tags: Array.isArray(body.tags) ? body.tags : undefined
    });

    if (!parsed.success) {
      return badRequest(parsed.error.flatten().formErrors.join(", ") || "Dados invalidos.");
    }

    const hymn = await prisma.hymn.findUnique({ where: { id } });
    if (!hymn) {
      return NextResponse.json({ error: "Hino nao encontrado." }, { status: 404 });
    }

    // If xmlContent is provided, validate and persist it to storage
    if (typeof body.xmlContent === "string" && body.xmlContent.trim().length > 0) {
      try {
        parseMusicXml(body.xmlContent);
      } catch {
        return badRequest("XML invalido: nao foi possivel interpretar como MusicXML.");
      }
      const storage = getStorageAdapter();
      await storage.writeText(hymn.xmlFilePath, body.xmlContent);
    }

    const updated = await prisma.hymn.update({
      where: { id },
      data: parsed.data
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel atualizar o hino.");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }
    if (!isAdmin(user)) {
      return forbidden("Somente administradores podem remover hinos.");
    }

    const { id } = await params;
    const hymn = await prisma.hymn.findUnique({ where: { id } });

    if (!hymn) {
      return badRequest("Hino nao encontrado.");
    }

    await prisma.hymn.delete({ where: { id } });

    const storage = getStorageAdapter();
    await storage.remove(hymn.xmlFilePath);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel remover o hino.");
  }
}
