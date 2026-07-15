import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * Node cannot reach api.telegram.org directly in this environment, so all Telegram traffic must
 * go through an HTTP proxy. grammy's Node client uses node-fetch (honours an http(s) `agent`),
 * while file downloads use undici's fetch (honours a ProxyAgent dispatcher) — this module builds
 * both from one proxy URL, including Basic-auth credentials embedded in the URL userinfo.
 */

/** Agent for grammy's `client.baseFetchConfig.agent`. */
export function createGrammyProxyAgent(proxyUrl: string): HttpsProxyAgent<string> {
  return new HttpsProxyAgent(proxyUrl);
}

/** Dispatcher for undici `fetch` used to download the uploaded document from Telegram. */
export function createUndiciProxyDispatcher(proxyUrl: string): ProxyAgent {
  const url = new URL(proxyUrl);
  const uri = `${url.protocol}//${url.host}`;
  if (!url.username) return new ProxyAgent({ uri });
  const creds = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
  const token = `Basic ${Buffer.from(creds).toString('base64')}`;
  return new ProxyAgent({ uri, token });
}

/** Downloads a URL to a Buffer, optionally via the given proxy dispatcher. */
export async function fetchBuffer(url: string, dispatcher?: ProxyAgent): Promise<Buffer> {
  const res = await undiciFetch(url, dispatcher ? { dispatcher } : {});
  if (!res.ok) throw new Error(`Не удалось загрузить файл (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
