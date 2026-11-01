import request from "supertest";
import app from "../app.ts";

describe("auth rate limiting", () => {
  it("allows 10 requests and returns 429 on the 11th", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(app).post("/auth/login").send({});
      expect(response.status).toBe(422);
    }

    const response = await request(app).post("/auth/login").send({});

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: "Too many requests, please try again later",
    });
  });

  it("does not limit non-auth routes", async () => {
    const response = await request(app).get("/announcements/abc");

    expect(response.status).toBe(400);
  });
});
