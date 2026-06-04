#!/usr/bin/env tsx
// Uso: ADMIN_USER_EMAIL=admin@cadernim.com.br ADMIN_USER_PASSWORD=NOVA_SENHA npx tsx scripts/reset-admin-password.ts
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const email = process.env.ADMIN_USER_EMAIL ?? "admin@cadernim.com.br";
  const password = process.env.ADMIN_USER_PASSWORD;

  if (!password) {
    console.error("ADMIN_USER_PASSWORD não definida.");
    process.exit(1);
  }

  const result = await prisma.user.updateMany({
    where: { email: email.toLowerCase() },
    data: { passwordHash: hashPassword(password) }
  });

  if (result.count === 0) {
    console.log(`Usuário ${email} não encontrado. Criando...`);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: email.toLowerCase(),
        role: "ADMIN",
        passwordHash: hashPassword(password)
      }
    });
    console.log(`Admin criado: ${email}`);
  } else {
    console.log(`Senha atualizada para: ${email}`);
  }
}

main().finally(() => prisma.$disconnect());
