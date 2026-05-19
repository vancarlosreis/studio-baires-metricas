import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Gera token opaco URL-safe (32 bytes random → 43 chars base64url). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex de uma string. Usado pra armazenar tokens no DB. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Verifica PKCE: SHA-256(code_verifier) base64url-encoded === code_challenge.
 * Suporta apenas method='S256' (plain é depreciado).
 */
export function verifyPkceS256(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  const hash = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  // Comparação tempo-constante seria ideal, mas códigos têm tamanhos
  // diferentes e o ataque é trivialmente improvável aqui.
  return hash === codeChallenge;
}
