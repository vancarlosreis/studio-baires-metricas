import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY não configurada. Gere uma com:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
        "E adicione ao .env.local",
    );
  }
  if (key.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY precisa ser hex de 64 chars (32 bytes / 256 bits).",
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Criptografa um token OAuth com AES-256-GCM.
 * Retorna um Buffer no layout: iv(12) | tag(16) | ciphertext.
 * Pronto pra inserir num campo `bytea` do Postgres.
 */
export function encryptToken(plaintext: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

/**
 * Descriptografa um token previamente cifrado por encryptToken.
 * Aceita Buffer ou Uint8Array (formato bytea vindo do Postgres).
 */
export function decryptToken(blob: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
