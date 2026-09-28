import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadCredentials, saveCredentials } from "./login";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  });
});

describe("credentials", () => {
  it("round-trips through storage", () => {
    saveCredentials({ url: "http://ha.local:8123", token: "abc" });
    expect(loadCredentials()).toEqual({ url: "http://ha.local:8123", token: "abc" });
  });

  it("returns null when nothing is stored", () => {
    expect(loadCredentials()).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    store.set("ha-hypertree-credentials", "{not json");
    expect(loadCredentials()).toBeNull();
  });
});
