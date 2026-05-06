import { NextRequest, NextResponse } from "next/server";
import { parseHymnAnalysisFromMusicXml } from "@cadernim/music-engine";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/storage";
import { serverError, unauthorized } from "@/lib/http";

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

    const storage = getStorageAdapter();
    const xmlContent = await storage.readText(hymn.xmlFilePath);
    const analysis = parseHymnAnalysisFromMusicXml(xmlContent);

    return NextResponse.json({
      data: {
        hymnId: hymn.id,
        ...analysis
      }
    });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel processar o hino.");
  }
}
