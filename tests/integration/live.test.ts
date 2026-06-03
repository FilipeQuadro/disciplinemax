import { describe, it, expect } from "vitest";
import { GET as liveHandler } from "@/app/api/live/route";

describe("GET /api/live", () => {
  it("always returns 200 with uptime", async () => {
    const res = await liveHandler();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.uptime_ms).toBeGreaterThan(0);
  });
});
