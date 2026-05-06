/**
 * Redefine a senha de um usuário por email.
 * Uso: node scripts/reset-password.mjs <email> <nova-senha>
 * Exemplo: node scripts/reset-password.mjs admin@hinario.local novaSenha123
 */
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Uso: node scripts/reset-password.mjs <email> <nova-senha>");
  process.exit(1);
}

if (password.length < 8) {
  console.error("A senha deve ter pelo menos 8 caracteres.");
  process.exit(1);
}

function hashPassword(pwd) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pwd, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: hashPassword(password) }
  });

  console.log(`Senha redefinida com sucesso para: ${email}`);
} finally {
  await prisma.$disconnect();
}
