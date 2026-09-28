import type { Connection } from "home-assistant-js-websocket";
import { setRootElement } from "./rootElement";
import { normalizeUrl } from "./ha/connection";
import { startSession, showLoading } from "./session";
import { initDebugConsole, debugLog } from "./debug";
import type { HaState } from "./ha/types";
import styles from "./style.css?inline";

interface HassAuth {
  data: { hassUrl: string };
}

interface Hass {
  connection: Connection;
  states: Record<string, HaState>;
  auth: HassAuth;
}

class HypertreePanel extends HTMLElement {
  private initialized = false;
  private initGeneration = 0;
  private teardown: (() => void) | null = null;
  private states = new Map<string, HaState>();
  private container!: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = styles;
    shadow.appendChild(style);

    this.container = document.createElement("div");
    this.container.id = "app";
    const tree = document.createElement("div");
    tree.id = "tree";
    showLoading(tree, "Loading...");
    this.container.appendChild(tree);
    shadow.appendChild(this.container);

    setRootElement(this.container);
  }

  set hass(hass: Hass) {
    if (!this.initialized) {
      this.initialized = true;
      this.initPanel(hass);
    }
  }

  disconnectedCallback() {
    // Invalidates any initPanel still awaiting the registry fetch.
    this.initGeneration++;
    this.teardown?.();
    this.teardown = null;
    this.initialized = false;
  }

  private async initPanel(hass: Hass) {
    const generation = ++this.initGeneration;
    initDebugConsole();

    const haUrl = normalizeUrl(hass.auth.data.hassUrl);
    debugLog("auth", "Panel connected to " + haUrl);

    const treeContainer = this.container.querySelector("#tree") as HTMLDivElement;
    for (const [entityId, state] of Object.entries(hass.states ?? {})) {
      if (isHaState(state)) this.states.set(entityId, state);
    }

    try {
      // The connection outlives this panel (it belongs to the HA frontend),
      // so the teardown only detaches our subscription and listeners.
      const teardown = await startSession({
        connection: hass.connection,
        container: treeContainer,
        states: this.states,
        haUrl,
        isCurrent: () => generation === this.initGeneration,
      });
      if (teardown) this.teardown = teardown;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      debugLog("system", "Init failed: " + message);
      const wrapper = document.createElement("div");
      wrapper.className = "loading";
      const span = document.createElement("span");
      span.textContent = message;
      wrapper.appendChild(span);
      treeContainer.replaceChildren(wrapper);
    }
  }
}

function isHaState(value: unknown): value is HaState {
  const state = value as HaState | null;
  return (
    typeof state === "object" && state !== null &&
    typeof state.entity_id === "string" &&
    typeof state.state === "string" &&
    typeof state.last_changed === "string"
  );
}

customElements.define("ha-panel-hypertree", HypertreePanel);
