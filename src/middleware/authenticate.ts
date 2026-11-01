import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
    }
  }
}

const authenticate = (
  req: Request<{}, {}, {}>,
  _res: Response,
  next: NextFunction,
) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Authentication required");
  }

  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  } catch {
    throw createHttpError(401, "Invalid or expired token");
  }

  if (decoded.type !== "access") {
    throw createHttpError(401, "Invalid or expired token");
  }

  req.user = decoded;
  next();
};

export default authenticate;
