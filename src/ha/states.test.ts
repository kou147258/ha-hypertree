import { describe, it, expect, vi } from "vitest";
import type { Connection } from "home-assistant-js-websocket";
import type { HaState } from "./types";

vi.mock("../debug", () => ({ debugLog: vi.fn() }));

import { fetchAllStates, subscribeToStates, watchConnection } from "./states";

function makeState(entityId: string, state = "on"): HaState {
  return { entity_id: entityId, state, attributes: {}, last_changed: "", last_updated: "" };
}

function consumer() {
  return { updateStates: vi.fn(), onEntityChanged: vi.fn() };
}

function fakeEventConnection() {
  const listeners = new Map<string, Set<() => void>>();
  const connection = {
    addEventListener: vi.fn((name: string, cb: () => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(cb);
    }),
    removeEventListener: vi.fn((name: string, cb: () => void) => {
      listeners.get(name)?.delete(cb);
    }),
  };
  const emit = (name: string) => listeners.get(name)?.forEach((cb) => cb());
  const count = () => [...listeners.values()].reduce((n, set) => n + set.size, 0);
  return { connection: connection as unknown as Connection, emit, count };
}

describe("fetchAllStates", () => {
  it("stores states and notifies the consumer", async () => {
    const connection = { sendMessagePromise: vi.fn().mockResolvedValue([makeState("light.a")]) } as unknown as Connection;
    const states = new Map<string, HaState>();
    const viz = consumer();
    await fetchAllStates(connection, states, viz);
    expect(states.get("light.a")?.state).toBe("on");
    expect(viz.updateStates).toHaveBeenCalledOnce();
  });

  it("swallows fetch errors", async () => {
    const connection = { sendMessagePromise: vi.fn().mockRejectedValue(new Error("gone")) } as unknown as Connection;
    const viz = consumer();
    await expect(fetchAllStates(connection, new Map(), viz)).resolves.toBeUndefined();
    expect(viz.updateStates).not.toHaveBeenCalled();
  });
});

describe("watchConnection", () => {
  it("forwards events and detaches all listeners", () => {
    const { connection, emit, count } = fakeEventConnection();
    const handlers = { onDisconnected: vi.fn(), onReady: vi.fn(), onAuthFailed: vi.fn() };
    const stop = watchConnection(connection, handlers);
    expect(count()).toBe(3);

    emit("disconnected");
    emit("ready");
    emit("reconnect-error");
    expect(handlers.onDisconnected).toHaveBeenCalledOnce();
    expect(handlers.onReady).toHaveBeenCalledOnce();
    expect(handlers.onAuthFailed).toHaveBeenCalledOnce();

    stop();
    expect(count()).toBe(0);
  });

  it("skips reconnect-error without onAuthFailed", () => {
    const { connection, count } = fakeEventConnection();
    const stop = watchConnection(connection, { onDisconnected: vi.fn(), onReady: vi.fn() });
    expect(count()).toBe(2);
    expect(connection.addEventListener).not.toHaveBeenCalledWith("reconnect-error", expect.anything());
    stop();
    expect(count()).toBe(0);
  });
});

describe("subscribeToStates", () => {
  // vitest fails the run on unhandled rejections, so settling is the assertion.
  it("does not throw when unsubscribing after a rejected subscribe", async () => {
    const connection = {
      subscribeMessage: vi.fn().mockRejectedValue(new Error("lost")),
      sendMessagePromise: vi.fn().mockResolvedValue([]),
    } as unknown as Connection;
    const unsubscribe = subscribeToStates(connection, new Map(), consumer());
    expect(() => unsubscribe()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("unsubscribes once the subscription resolves", async () => {
    const unsub = vi.fn();
    const connection = {
      subscribeMessage: vi.fn().mockResolvedValue(unsub),
      sendMessagePromise: vi.fn().mockResolvedValue([]),
    } as unknown as Connection;
    subscribeToStates(connection, new Map(), consumer())();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unsub).toHaveBeenCalledOnce();
  });
});
