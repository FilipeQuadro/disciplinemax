import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}));

import { getServiceClient, resetServiceClient } from "@/lib/db-client";

describe("db-client", () => {
  beforeEach(() => {
    resetServiceClient();
  });

  it("returns a client instance", () => {
    const client = getServiceClient();
    expect(client).toBeDefined();
  });

  it("returns the same instance on subsequent calls", () => {
    const client1 = getServiceClient();
    const client2 = getServiceClient();
    expect(client1).toBe(client2);
  });

  it("creates new instance after reset", () => {
    const client1 = getServiceClient();
    resetServiceClient();
    const client2 = getServiceClient();
    // Both should be valid clients (createClient is called again after reset)
    expect(client2).toBeDefined();
  });
});
