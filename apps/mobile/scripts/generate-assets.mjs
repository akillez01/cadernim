/**
 * Gera icon.png (1024x1024) e splash.png (2732x2732) para o Capacitor Assets.
 * Usa apenas módulos nativos do Node — sem dependências externas.
 *
 * Paleta Cadernim:
 *   moss  #3a5a40  (verde floresta)
 *   sand  #f5f1ea  (areia)
 */

import { createCanvas } from "canvas";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resourcesDir = join(__dirname, "..", "resources");

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function drawLeafLogo(ctx, cx, cy, size) {
  const moss = "#3a5a40";
  const sand = "#f5f1ea";

  // Folha estilizada — forma de gota rotacionada 45°
  ctx.save();
  ctx.translate(cx, cy);

  const r = size * 0.38;

  // Fundo circular
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = moss;
  ctx.fill();

  // Folha branca dentro
  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.bezierCurveTo(r * 0.45, -r * 0.55, r * 0.45, r * 0.45, 0, r * 0.55);
  ctx.bezierCurveTo(-r * 0.45, r * 0.45, -r * 0.45, -r * 0.55, 0, -r * 0.55);
  ctx.fillStyle = sand;
  ctx.fill();

  // Nervura central
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5);
  ctx.lineTo(0, r * 0.5);
  ctx.strokeStyle = moss;
  ctx.lineWidth = r * 0.06;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ── icon 1024×1024 ──────────────────────────────────────────────────────────
function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Fundo areia
  ctx.fillStyle = "#f5f1ea";
  ctx.fillRect(0, 0, size, size);

  drawLeafLogo(ctx, size / 2, size / 2, size);

  writeFileSync(join(resourcesDir, "icon.png"), canvas.toBuffer("image/png"));
  console.log("✓ resources/icon.png gerado (1024×1024)");
}

// ── splash 2732×2732 ─────────────────────────────────────────────────────────
function generateSplash() {
  const size = 2732;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Fundo areia
  ctx.fillStyle = "#f5f1ea";
  ctx.fillRect(0, 0, size, size);

  // Logo centralizado (menor que no ícone)
  drawLeafLogo(ctx, size / 2, size / 2 - size * 0.04, size * 0.5);

  // Nome do app abaixo do logo
  ctx.fillStyle = "#3a5a40";
  ctx.font = `bold ${size * 0.07}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Cadernim", size / 2, size / 2 + size * 0.22);

  // Subtítulo
  ctx.font = `${size * 0.03}px sans-serif`;
  ctx.fillStyle = "#6b8f71";
  ctx.fillText("Escola da Floresta", size / 2, size / 2 + size * 0.30);

  writeFileSync(join(resourcesDir, "splash.png"), canvas.toBuffer("image/png"));
  console.log("✓ resources/splash.png gerado (2732×2732)");
}

generateIcon();
generateSplash();
