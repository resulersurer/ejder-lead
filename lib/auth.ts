import { createHmac, timingSafeEqual } from "node:crypto";

export const LEAD_COOKIE = "ejder_lead_admin";

function secret() { return process.env.ADMIN_COOKIE_SECRET || ""; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }

export function createAdminToken() {
  const payload = `admin.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token?: string) {
  if (!token || !secret()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  try { return timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected)); } catch { return false; }
}
