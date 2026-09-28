import { describe, it, expect, vi } from "vitest";

const KEY = "ha-hypertree-colors";

async function freshModule(stored?: string) {
  vi.resetModules();
  const store = new Map<string, string>();
  if (stored !== undefined) store.set(KEY, stored);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  });
  const mod = await import("./colors");
  return { mod, store };
}

describe("nodeColor", () => {
  it("falls back to the default for empty or unknown domains", async () => {
    const { mod } = await freshModule();
    const fallback = mod.nodeColor("entity", "no_such_domain");
    expect(mod.nodeColor("entity", "")).toBe(fallback);
    expect(mod.nodeColor("entity")).toBe(fallback);
    expect(mod.nodeColor("unknown_kind")).toBe(fallback);
  });

  it("uses the domain color for entities and domains", async () => {
    const { mod } = await freshModule();
    expect(mod.nodeColor("entity", "light")).toBe("#ffca28");
    expect(mod.nodeColor("domain", "light")).toBe("#ffca28");
  });
});

describe("loadColors", () => {
  it("keeps known string values and drops unknown keys and non-strings", async () => {
    const { mod } = await freshModule(JSON.stringify({ light: "#000000", bogus: "#111111", switch: 5 }));
    const colors = mod.getDomainColors();
    expect(colors.light).toBe("#000000");
    expect(colors.switch).toBe("#66bb6a");
    expect("bogus" in colors).toBe(false);
  });

  it("ignores corrupt storage", async () => {
    const { mod } = await freshModule("{nope");
    expect(mod.getDomainColors().light).toBe("#ffca28");
  });
});

describe("setDomainColors", () => {
  it("ignores non-string values", async () => {
    const { mod } = await freshModule();
    mod.setDomainColors({ light: 42 as unknown as string, sensor: "#123456" });
    expect(mod.getDomainColors().light).toBe("#ffca28");
    expect(mod.getDomainColors().sensor).toBe("#123456");
  });
});
