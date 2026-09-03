import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../app.js";

describe("health API", () => {
  it("returns the API health status", async () => {
    const response =
      await request(app)
        .get("/api/health")
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message)
      .toBe("KiteDesk API is running");
    expect(response.body.timestamp)
      .toEqual(expect.any(String));
  });

  it("connects to the dedicated test database", async () => {
    const response =
      await request(app)
        .get("/api/health/db")
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(
      String(response.body.database).toLowerCase()
    ).toContain("test");
  });
});
