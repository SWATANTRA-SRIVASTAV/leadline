import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "MEMBER";

export type SessionPayload = {
  sub: string; // user id
  email: string;
  role: Role;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to your .env file (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const SESSION_TTL = "7d";
export const SESSION_COOKIE = "leadline_session";

// jose (not jsonwebtoken) deliberately: middleware runs in the Edge runtime,
// which doesn't have Node's `crypto` module that jsonwebtoken depends on.
// jose works in both Edge and Node, so the same code verifies sessions in
// middleware and in API routes without a runtime split.
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecretKey());
}

/**
 * Returns null instead of throwing on any invalid/expired/tampered token.
 * Callers treat null as "not authenticated" — never as "authenticated as nobody".
 */
export async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      (payload.role === "ADMIN" || payload.role === "MEMBER")
    ) {
      return { sub: payload.sub, email: payload.email, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

/** Central place role gates are decided, so route handlers can't drift out of sync with each other. */
export function canAssignLeads(role: Role): boolean {
  return role === "ADMIN";
}
