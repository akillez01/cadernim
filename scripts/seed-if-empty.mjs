import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

async function shouldRunSeed() {
  try {
    await prisma.$connect();
    const hymnsCount = await prisma.hymn.count();
    const oracaoCount = await prisma.hymn.count({
      where: {
        id: { startsWith: "oracao-" }
      }
    });
    const studentEmail = (process.env.STUDENT_USER_EMAIL ?? process.env.DEFAULT_USER_EMAIL ?? "aluno@cadernim.local").toLowerCase();
    const adminEmail = (process.env.ADMIN_USER_EMAIL ?? "admin@cadernim.local").toLowerCase();

    const usersCount = await prisma.user.count({
      where: { email: { in: [studentEmail, adminEmail] } }
    });

    return hymnsCount === 0 || usersCount < 2 || oracaoCount === 0;
  } catch (error) {
    console.warn("Nao foi possivel consultar hinos para decidir seed automaticamente.");
    console.warn(error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

const runSeed = await shouldRunSeed();

if (!runSeed) {
  console.log("Seed automatico ignorado: biblioteca ja possui hinos e colecao Oração.");
  process.exit(0);
}

console.log("Seed necessario detectado. Executando sincronizacao inicial...");
const result = spawnSync(npmCmd, ["run", "prisma:seed"], { stdio: "inherit" });

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
