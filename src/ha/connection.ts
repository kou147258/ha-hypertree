import {
  createConnection,
  createLongLivedTokenAuth,
  type Connection,
} from "home-assistant-js-websocket";

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function connect(url: string, token: string): Promise<Connection> {
  const auth = createLongLivedTokenAuth(normalizeUrl(url), token);
  return createConnection({ auth });
}
