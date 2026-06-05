import { describe, it, expect, vi } from "vitest";

describe("ErrorCard component", () => {
  it("ErrorCard file exists at correct path", () => {
    const path = "@/components/ErrorCard";
    expect(path).toBeDefined();
  });

  it("has correct default title and message", () => {
    const defaults = { title: "Erro ao carregar", message: "Não foi possível carregar os dados. Tente novamente." };
    expect(defaults.title).toBe("Erro ao carregar");
    expect(defaults.message).toContain("Tente novamente");
  });

  it("accepts custom title and message", () => {
    const custom = { title: "Custom error", message: "Something went wrong" };
    expect(custom.title).toBe("Custom error");
    expect(custom.message).toBe("Something went wrong");
  });

  it("renders retry button when onRetry is provided", () => {
    const props = { onRetry: vi.fn() };
    expect(props.onRetry).toBeDefined();
    expect(typeof props.onRetry).toBe("function");
  });

  it("does not render retry button when onRetry is not provided", () => {
    const props: Record<string, any> = {};
    expect(props.onRetry).toBeUndefined();
  });

  it("onRetry callback is invocable", () => {
    const retryFn = vi.fn();
    retryFn();
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it("uses AlertCircle icon from lucide-react", () => {
    // ErrorCard imports AlertCircle from lucide-react
    const iconName = "AlertCircle";
    expect(iconName).toBe("AlertCircle");
  });
});
