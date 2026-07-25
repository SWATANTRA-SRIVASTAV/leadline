import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  canAssignLeads,
} from "@/lib/auth";

describe("password hashing", () => {
  it("hashes a password and verifies the correct plaintext against it", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toBe("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(
      true
    );
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession({
      sub: "user_123",
      email: "amara@leadline.dev",
      role: "ADMIN",
    });
    const decoded = await verifySession(token);
    expect(decoded).toEqual({
      sub: "user_123",
      email: "amara@leadline.dev",
      role: "ADMIN",
    });
  });

  it("returns null for a missing token", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession(null)).toBeNull();
    expect(await verifySession("")).toBeNull();
  });

  it("returns null for a garbage/tampered token instead of throwing", async () => {
    await expect(verifySession("not.a.jwt")).resolves.toBeNull();
    const token = await signSession({
      sub: "user_123",
      email: "amara@leadline.dev",
      role: "ADMIN",
    });
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifySession(tampered)).resolves.toBeNull();
  });
});

describe("role gates", () => {
  it("only admins can assign leads", () => {
    expect(canAssignLeads("ADMIN")).toBe(true);
    expect(canAssignLeads("MEMBER")).toBe(false);
  });
});
