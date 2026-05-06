import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const webDir = join(rootDir, "apps", "web");
const standaloneDir = join(webDir, ".next", "standalone");
const staticDir = join(webDir, ".next", "static");
const publicDir = join(webDir, "public");
const uploadsDir = join(rootDir, "uploads");
const distDir = join(rootDir, "dist", "plesk");
const standaloneWebDir = join(distDir, "apps", "web");

async function ensureBuildExists() {
  if (!existsSync(standaloneDir)) {
    throw new Error("Build standalone nao encontrado. Execute `npm run build --workspace @cadernim/web` primeiro.");
  }

  if (!existsSync(staticDir)) {
    throw new Error("Assets estaticos nao encontrados em apps/web/.next/static.");
  }
}

async function buildPleskBundle() {
  await ensureBuildExists();

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await cp(standaloneDir, distDir, { recursive: true });
  await mkdir(join(standaloneWebDir, ".next"), { recursive: true });
  await cp(staticDir, join(standaloneWebDir, ".next", "static"), { recursive: true });

  if (existsSync(publicDir)) {
    await cp(publicDir, join(standaloneWebDir, "public"), { recursive: true });
  }

  if (existsSync(uploadsDir)) {
    await cp(uploadsDir, join(distDir, "uploads"), { recursive: true });
  } else {
    await mkdir(join(distDir, "uploads", "hymns"), { recursive: true });
  }

  // Prisma: schema + migrations necessarios para `prisma migrate deploy` no servidor
  await cp(join(rootDir, "prisma"), join(distDir, "prisma"), { recursive: true });

  // O Next.js standalone copia apenas library.js do runtime do Prisma.
  // Copia o runtime completo (WASM engines) do node_modules raiz.
  await cp(
    join(rootDir, "node_modules", "@prisma", "client", "runtime"),
    join(distDir, "node_modules", "@prisma", "client", "runtime"),
    { recursive: true, force: true }
  );

  // Script de seed condicional
  await mkdir(join(distDir, "scripts"), { recursive: true });
  await cp(join(rootDir, "scripts", "seed-if-empty.mjs"), join(distDir, "scripts", "seed-if-empty.mjs"));
  await cp(join(rootDir, "scripts", "reset-password.mjs"), join(distDir, "scripts", "reset-password.mjs"));

  await writeFile(
    join(distDir, "server.js"),
    ['"use strict";', "", "require('./apps/web/server.js');", ""].join("\n"),
    "utf8"
  );

  // package.json SEM dependencies — o standalone ja tem node_modules bundlado.
  // Rodar "npm install" (sem args) no root pruning os pacotes bundlados.
  // Os scripts usam npx para nao precisar de npm install.
  await writeFile(
    join(distDir, "package.json"),
    JSON.stringify(
      {
        name: "cadernim",
        private: true,
        scripts: {
          "prisma:generate": "npx --yes prisma@6 generate",
          "prisma:deploy": "npx --yes prisma@6 migrate deploy",
          "seed": "node scripts/seed-if-empty.mjs",
        },
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  await writeFile(
    join(distDir, ".env.example"),
    [
      "# ATENCAO: se a senha contiver '@', substitua por '%40' na URL abaixo",
      'DATABASE_URL="postgresql://USER:SENHA@HOST:5432/NOME_DO_BANCO?schema=public"',
      'SESSION_SECRET="troque-esta-chave-em-producao"',
      'ADMIN_USER_EMAIL="admin@cadernim.com.br"',
      'ADMIN_USER_PASSWORD="troque-senha-admin"',
      'STUDENT_USER_EMAIL="aluno@cadernim.com.br"',
      'STUDENT_USER_PASSWORD="troque-senha-aluno"',
      'STORAGE_PROVIDER="local"',
      'PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"',
      ""
    ].join("\n"),
    "utf8"
  );
}

await buildPleskBundle();
console.log("Pacote pronto em dist/plesk");
console.log("Startup file: server.js");
console.log("");
console.log("Lembre-se: se a senha do banco contem '@', use '%40' na DATABASE_URL");
