import { describe, it, expect } from "vitest";
import { createTransform, screenToWorld, wheelZoomFactor, zoomAt } from "./zoom";

describe("zoomAt", () => {
  it("keeps the world point under the zoom center fixed", () => {
    const t = { x: 30, y: -20, k: 1.5 };
    const before = screenToWorld(t, 200, 150);
    zoomAt(t, 2, 200, 150);
    const after = screenToWorld(t, 200, 150);
    expect(t.k).toBe(3);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps the zoom level", () => {
    const t = createTransform();
    zoomAt(t, 1000, 0, 0);
    expect(t.k).toBe(20);
    zoomAt(t, 0.00001, 0, 0);
    expect(t.k).toBe(0.1);
  });
});

describe("wheelZoomFactor", () => {
  it("zooms in on scroll up and out on scroll down", () => {
    expect(wheelZoomFactor(-100, 0)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100, 0)).toBeLessThan(1);
  });

  it("scales with scroll distance so small trackpad deltas zoom gently", () => {
    const small = wheelZoomFactor(-4, 0);
    const notch = wheelZoomFactor(-100, 0);
    expect(small).toBeGreaterThan(1);
    expect(Math.log(notch) / Math.log(small)).toBeCloseTo(25);
  });

  it("treats line-mode deltas as pixels and clamps large jumps", () => {
    expect(wheelZoomFactor(-3, 1)).toBeCloseTo(wheelZoomFactor(-48, 0));
    expect(wheelZoomFactor(-10000, 0)).toBeCloseTo(wheelZoomFactor(-150, 0));
  });
});
