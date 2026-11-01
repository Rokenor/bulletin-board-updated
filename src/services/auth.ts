import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../../prisma/client.ts";
import {
  ACCESS_TOKEN_LIFETIME,
  REFRESH_TOKEN_LIFETIME,
} from "../constants/time.ts";

export const createTokens = async (userId: number) => {
  const accessToken = jwt.sign(
    { sub: String(userId), type: "access" },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_LIFETIME / 1000 },
  );

  const refreshToken = jwt.sign(
    { sub: String(userId), type: "refresh" },
    process.env.JWT_SECRET!,
    {
      expiresIn: REFRESH_TOKEN_LIFETIME / 1000,
      jwtid: crypto.randomUUID(),
    },
  );

  await prisma.refreshToken.create({
    data: { userId, token: refreshToken },
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as jwt.JwtPayload;
    return decoded.type === "refresh" ? decoded : null;
  } catch {
    return null;
  }
};
