import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

type AuthUser = { userId: number; role: string };

// get user from locals for use in routes
export function getUser(res: Response): AuthUser | undefined {
  return (res.locals as { user?: AuthUser }).user;
}

// auth middleware
export function auth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (token == null) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const payload = validateTokenPayload(jwt.verify(token, env.jwtSecret));
    if (payload == null) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    setUser(res, payload);
    next();
  } catch {
    return res.status(401).json({ message: "Token expired or invalid" });
  }
}

// admin only middleware
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (getUser(res)?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// auth optional middleware
export function authOptional(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);

  // guest -- pass
  if (!token) return next();

  try {
    const payload = validateTokenPayload(jwt.verify(token, env.jwtSecret));
    // user -- set in locals
    if (payload != null) {
      setUser(res, payload);
    }
  } catch {
    // guest
  }
  // pass
  next();
}

// is userId and role in payload
function validateTokenPayload(payload: unknown): AuthUser | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("userId" in payload) ||
    !("role" in payload)
  ) {
    return null;
  }
  return payload as AuthUser;
}

// get token from request
function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

// add user to locals for use in routes
function setUser(res: Response, user: AuthUser) {
  (res.locals as { user: AuthUser }).user = user;
}