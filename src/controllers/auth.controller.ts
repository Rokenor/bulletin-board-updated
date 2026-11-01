import bcrypt from "bcrypt";
import createHttpError from "http-errors";
import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import { createTokens, verifyRefreshToken } from "../services/auth.ts";
import type {
  RegisterBody,
  LoginBody,
  RefreshBody,
} from "../validators/auth.validator.ts";

export const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
) => {
  const { username, email, password, name } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    throw createHttpError(409, "Username or email already taken");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      name,
    },
    select: userSelect,
  });

  const tokens = await createTokens(user.id);

  res.status(201).json({ user, ...tokens });
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  const tokens = await createTokens(user.id);

  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  });
};

export const refresh = async (
  req: Request<{}, {}, RefreshBody>,
  res: Response,
) => {
  const { refreshToken } = req.body;

  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    throw createHttpError(401, "Invalid refresh token");
  }

  const { count } = await prisma.refreshToken.deleteMany({
    where: { token: refreshToken, userId: Number(decoded.sub) },
  });

  if (count === 0) {
    throw createHttpError(401, "Invalid refresh token");
  }

  const tokens = await createTokens(Number(decoded.sub));

  res.status(200).json(tokens);
};

export const logout = async (req: Request, res: Response) => {
  await prisma.refreshToken.deleteMany({
    where: { userId: Number(req.user!.sub) },
  });

  res.status(204).end();
};

export const me = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user!.sub) },
    select: { ...userSelect, createdAt: true },
  });

  if (!user) {
    throw createHttpError(401, "User not found");
  }

  res.status(200).json(user);
};
