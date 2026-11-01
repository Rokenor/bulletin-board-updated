import { z } from "zod";
import { registry } from "../openapi.ts";

export const RegisterSchema = registry.register(
  "Register",
  z.object({
    username: z.string().min(3).max(30),
    email: z.email(),
    password: z.string().min(6),
    name: z.string().min(2),
  }),
);

export const LoginSchema = registry.register(
  "Login",
  z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
);

export const RefreshSchema = registry.register(
  "Refresh",
  z.object({
    refreshToken: z.string().min(1),
  }),
);

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type RefreshBody = z.infer<typeof RefreshSchema>;

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.number().int(),
    username: z.string(),
    email: z.email(),
    name: z.string(),
  }),
);

const TokensSchema = registry.register(
  "Tokens",
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
);

const AuthResponseSchema = registry.register(
  "AuthResponse",
  TokensSchema.extend({ user: UserSchema }),
);

const ProfileSchema = registry.register(
  "Profile",
  UserSchema.extend({ createdAt: z.iso.datetime() }),
);

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: {
      content: {
        "application/json": { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: {
      description: "User registered successfully",
      content: { "application/json": { schema: AuthResponseSchema } },
    },
    409: { description: "Username or email already taken" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login user",
  request: {
    body: {
      content: {
        "application/json": { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: { "application/json": { schema: AuthResponseSchema } },
    },
    401: { description: "Invalid credentials" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh token pair (token rotation)",
  request: {
    body: {
      content: {
        "application/json": { schema: RefreshSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Tokens refreshed successfully",
      content: { "application/json": { schema: TokensSchema } },
    },
    401: { description: "Invalid or expired refresh token" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Logout user (invalidate refresh token)",
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: "Logged out successfully" },
    401: { description: "Authentication required" },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get current user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: ProfileSchema } },
    },
    401: { description: "Authentication required" },
  },
});
