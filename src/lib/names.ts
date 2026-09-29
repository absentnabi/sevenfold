import { CODE_PATTERN } from "./types";

export function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 18) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'_-]*$/u.test(name)) return null;
  return name;
}

export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}
