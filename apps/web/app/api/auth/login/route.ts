import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, unauthorized, serverError } from "@/lib/http";
import { loginPayloadSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Email ou senha invalido.");
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() }
    });

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return unauthorized("Credenciais invalidas.");
    }

    const token = createSessionToken({ userId: user.id, role: user.role });
    const response = NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel autenticar.");
  }
}
