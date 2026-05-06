import { mkdir, readFile, rm, writeFile as fsWriteFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export interface StorageAdapter {
  saveXml(content: string, originalFileName: string): Promise<string>;
  readText(relativePath: string): Promise<string>;
  writeText(relativePath: string, content: string): Promise<void>;
  remove(relativePath: string): Promise<void>;
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

class LocalStorageAdapter implements StorageAdapter {
  private rootDir = resolveProjectRoot(process.cwd());
  private uploadsDir = join(this.rootDir, "uploads", "hymns");

  async saveXml(content: string, originalFileName: string) {
    await mkdir(this.uploadsDir, { recursive: true });
    const safeName = sanitizeFileName(originalFileName.replace(/\.(mxl|musicxml|xml)$/i, ""));
    const fileName = `${Date.now()}-${safeName || "hymn"}.musicxml`;
    const absolutePath = join(this.uploadsDir, fileName);

    await fsWriteFile(absolutePath, content, "utf8");

    return join("uploads", "hymns", fileName);
  }

  async readText(relativePath: string) {
    const absolutePath = join(this.rootDir, relativePath);
    return readFile(absolutePath, "utf8");
  }

  async writeText(relativePath: string, content: string) {
    const absolutePath = join(this.rootDir, relativePath);
    await fsWriteFile(absolutePath, content, "utf8");
  }

  async remove(relativePath: string) {
    const absolutePath = join(this.rootDir, relativePath);
    await rm(absolutePath, { force: true });
  }
}

function resolveProjectRoot(startDir: string) {
  let current = startDir;

  for (let depth = 0; depth < 6; depth += 1) {
    const hasPrismaSchema = existsSync(join(current, "prisma", "schema.prisma"));
    const hasUploadsDir = existsSync(join(current, "uploads"));
    if (hasPrismaSchema || hasUploadsDir) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return startDir;
}

class FutureS3StorageAdapter implements StorageAdapter {
  async saveXml(): Promise<string> {
    throw new Error("S3/R2 storage ainda nao implementado no MVP.");
  }

  async readText(): Promise<string> {
    throw new Error("S3/R2 storage ainda nao implementado no MVP.");
  }

  async writeText(): Promise<void> {
    throw new Error("S3/R2 storage ainda nao implementado no MVP.");
  }

  async remove(): Promise<void> {
    throw new Error("S3/R2 storage ainda nao implementado no MVP.");
  }
}

const localStorageAdapter = new LocalStorageAdapter();
const futureS3StorageAdapter = new FutureS3StorageAdapter();

export function getStorageAdapter() {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  return provider === "s3" ? futureS3StorageAdapter : localStorageAdapter;
}

export function fileBaseName(path: string) {
  return basename(path);
}
