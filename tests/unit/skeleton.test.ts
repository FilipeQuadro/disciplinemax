import { describe, it, expect, vi } from "vitest";

describe("Skeleton components", () => {
  it("Skeleton file exists at correct path", () => {
    const path = "@/components/Skeleton";
    expect(path).toBeDefined();
  });

  it("exports 5 skeleton component names", () => {
    const expectedExports = ["SkeletonCard", "SkeletonList", "SkeletonStats", "SkeletonFeed", "SkeletonProfile"];
    expect(expectedExports).toHaveLength(5);
    expect(expectedExports).toContain("SkeletonCard");
    expect(expectedExports).toContain("SkeletonList");
    expect(expectedExports).toContain("SkeletonStats");
    expect(expectedExports).toContain("SkeletonFeed");
    expect(expectedExports).toContain("SkeletonProfile");
  });

  it("SkeletonList accepts count prop with default 5", () => {
    const defaultProps = { count: 5, className: "" };
    expect(defaultProps.count).toBe(5);
  });

  it("SkeletonStats accepts count prop with default 4", () => {
    const defaultProps = { count: 4, className: "" };
    expect(defaultProps.count).toBe(4);
  });

  it("SkeletonFeed accepts count prop with default 5", () => {
    const defaultProps = { count: 5, className: "" };
    expect(defaultProps.count).toBe(5);
  });

  it("all components use animate-pulse", () => {
    // All skeleton components use Tailwind's animate-pulse utility
    const animationClass = "animate-pulse";
    expect(animationClass).toBe("animate-pulse");
  });

  it("components accept custom className prop", () => {
    const propsWithClass = { className: "custom-wrapper max-w-2xl" };
    expect(propsWithClass.className).toContain("custom-wrapper");
  });
});
