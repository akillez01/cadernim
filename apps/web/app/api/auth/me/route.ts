import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-user";
import { unauthorized, serverError } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return unauthorized();
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error(error);
    return serverError("Nao foi possivel verificar sessao.");
  }
}
