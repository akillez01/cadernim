import { NextRequest, NextResponse } from "next/server";
import { parseMusicXmlMetadata } from "@cadernim/music-engine";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/storage";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";
import { hymnPayloadSchema } from "@/lib/validation";
import { getAuthUserFromRequest, isAdmin } from "@/lib/auth-user";
import { importScoreFileAsMusicXml } from "@/lib/score-import";

export const runtime = "nodejs";

function isFileLike(
  value: FormDataEntryValue | null
): value is File {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { name?: unknown }).name === "string" &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

function parseTags(rawValue: FormDataEntryValue | null) {
  if (!rawValue || typeof rawValue !== "string") {
    return [];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category")?.trim();
    const tag = searchParams.get("tag")?.trim();

    const hymns = await prisma.hymn.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { title: { contains: search, mode: "insensitive" } },
                  { author: { contains: search, mode: "insensitive" } }
                ]
              }
            : {},
          category ? { category: { equals: category, mode: "insensitive" } } : {},
          tag ? { tags: { has: tag } } : {}
        ]
      },
      orderBy: [{ number: "asc" }, { title: "asc" }]
    });

    return NextResponse.json({ data: hymns });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel listar os hinos.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    if (!isAdmin(user)) {
      return forbidden("Somente administradores podem cadastrar hinos.");
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!isFileLike(file)) {
      return badRequest("Arquivo MusicXML ou MXL e obrigatorio.");
    }

    const xmlContent = await importScoreFileAsMusicXml(file as unknown as File);
    const metadata = parseMusicXmlMetadata(xmlContent);
    const tags = parseTags(formData.get("tags"));

    const parsedPayload = hymnPayloadSchema.safeParse({
      title: (formData.get("title") as string | null) ?? metadata.title,
      number: formData.get("number"),
      author: (formData.get("author") as string | null) ?? metadata.composer ?? "Desconhecido",
      originalKey: (formData.get("originalKey") as string | null) ?? metadata.key ?? "C",
      defaultBpm: formData.get("defaultBpm") ?? metadata.tempo ?? 80,
      timeSignature: (formData.get("timeSignature") as string | null) ?? metadata.timeSignature ?? "4/4",
      category: (formData.get("category") as string | null) ?? "Geral",
      tags
    });

    if (!parsedPayload.success) {
      return badRequest(parsedPayload.error.flatten().formErrors.join(", ") || "Dados invalidos.");
    }

    const storage = getStorageAdapter();
    const savedFilePath = await storage.saveXml(xmlContent, file.name);

    const created = await prisma.hymn.create({
      data: {
        ...parsedPayload.data,
        xmlFilePath: savedFilePath
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      const message = error.message || "";
      if (
        message.includes("Formato nao suportado") ||
        message.includes("Conversao PDF") ||
        message.includes("MusicXML") ||
        message.includes("Audiveris")
      ) {
        return badRequest(message);
      }
    }
    return serverError("Nao foi possivel cadastrar o hino.");
  }
}
