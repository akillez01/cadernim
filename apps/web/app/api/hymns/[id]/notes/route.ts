import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import { notePayloadSchema } from "@/lib/validation";

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

    const notes = await prisma.hymnNote.findMany({
      where: { hymnId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel listar as anotacoes.");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }
    const body = await request.json();

    const parsed = notePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Conteudo da anotacao invalido.");
    }

    const hymnExists = await prisma.hymn.findUnique({ where: { id } });
    if (!hymnExists) {
      return badRequest("Hino nao encontrado.");
    }

    const note = await prisma.hymnNote.create({
      data: {
        userId: user.id,
        hymnId: id,
        content: parsed.data.content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel salvar a anotacao.");
  }
}
