import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(":");
  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  if (candidate.length !== hash.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}
