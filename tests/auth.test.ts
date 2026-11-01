import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import app from "../app.ts";
import prisma from "../prisma/client.ts";
import { createTokens } from "../src/services/auth.ts";

vi.mock("../prisma/client.ts", () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const existingUser = {
  id: 1,
  username: "ivan_petrenko",
  email: "ivan@example.com",
  name: "Іван",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTokens", () => {
  it("generates access and refresh tokens and stores the refresh token", async () => {
    const { accessToken, refreshToken } = await createTokens(42);

    const access = jwt.verify(accessToken, "test-secret") as jwt.JwtPayload;
    const refresh = jwt.verify(refreshToken, "test-secret") as jwt.JwtPayload;

    expect(access).toMatchObject({ sub: "42", type: "access" });
    expect(refresh).toMatchObject({ sub: "42", type: "refresh" });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: { userId: 42, token: refreshToken },
    });
  });
});

describe("password hashing", () => {
  it("hashes the password and verifies it with bcrypt", async () => {
    const hash = await bcrypt.hash("secret123", 10);

    expect(hash).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", hash)).toBe(true);
    expect(await bcrypt.compare("wrong", hash)).toBe(false);
  });
});

describe("POST /auth/register", () => {
  it("returns 201 with user and tokens for valid data", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(existingUser as never);

    const response = await request(app).post("/auth/register").send({
      username: "ivan_petrenko",
      email: "ivan@example.com",
      password: "secret123",
      name: "Іван",
    });

    expect(response.status).toBe(201);
    expect(response.body.user.username).toBe("ivan_petrenko");
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");

    const { data } = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(data.password).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", data.password)).toBe(true);
  });

  it("returns 422 for invalid data", async () => {
    const response = await request(app).post("/auth/register").send({
      username: "ok",
      email: "invalid-email",
      password: "123",
      name: "",
    });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty("details");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("POST /auth/login", () => {
  it("returns 401 for a wrong password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...existingUser,
      password: await bcrypt.hash("secret123", 10),
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ username: "ivan_petrenko", password: "wrong_password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials" });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe("security", () => {
  it("sets secure HTTP headers via helmet", async () => {
    const response = await request(app).get("/announcements/abc");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers).toHaveProperty("content-security-policy");
    expect(response.headers).not.toHaveProperty("x-powered-by");
  });

  it("allows CORS for origins from ALLOWED_ORIGINS", async () => {
    const response = await request(app)
      .get("/announcements/abc")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("rejects requests from a disallowed origin with 403", async () => {
    const response = await request(app)
      .get("/announcements/abc")
      .set("Origin", "http://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });

});
