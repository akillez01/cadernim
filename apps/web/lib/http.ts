import { NextResponse } from "next/server";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Sessao invalida ou expirada.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Voce nao tem permissao para esta acao.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
