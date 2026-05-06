import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import { sessionPayloadSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const parsed = sessionPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Dados de sessao invalidos.");
    }

    const hymn = await prisma.hymn.findUnique({ where: { id: parsed.data.hymnId } });
    if (!hymn) {
      return badRequest("Hino nao encontrado.");
    }

    const session = await prisma.hymnSession.create({
      data: {
        userId: user.id,
        ...parsed.data
      }
    });

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel registrar a sessao.");
  }
}
