import { createHmac } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  uid: string;
  role: UserRole;
  iat: number;
  exp: number;
};

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(content: string) {
  return createHmac("sha256", getSessionSecret()).update(content).digest("base64url");
}

export function createSessionToken(input: { userId: string; role: UserRole }) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: input.userId,
    role: input.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
    if (!payload.uid || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
}
