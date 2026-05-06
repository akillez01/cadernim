import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { serverError, unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    const sessions = await prisma.hymnSession.findMany({
      where: { userId: user.id },
      include: {
        hymn: {
          select: {
            id: true,
            title: true,
            number: true,
            author: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 50
    });

    return NextResponse.json({ data: sessions });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel carregar o historico.");
  }
}
