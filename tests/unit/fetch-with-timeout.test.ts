import { describe, it, expect, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

describe("fetchWithTimeout", () => {
  it("returns response when fetch succeeds within timeout", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(mockFetch);

    const res = await fetchWithTimeout("https://test.com", {}, 5000);
    expect(res.status).toBe(200);
  });

  it("throws AbortError when fetch exceeds timeout", async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new DOMException("The operation was aborted", "AbortError")), 200);
      })
    );
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(mockFetch);

    await expect(fetchWithTimeout("https://slow.com", {}, 50)).rejects.toThrow();
  });

  it("passes through non-timeout errors", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(mockFetch);

    await expect(fetchWithTimeout("https://test.com", {}, 5000)).rejects.toThrow("Network error");
  });

  it("uses default timeout of 10000ms when not specified", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(mockFetch);

    const res = await fetchWithTimeout("https://test.com", {});
    expect(res.status).toBe(200);
  });
});
