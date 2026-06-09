// Minimal stubs for Cloudflare Workers globals needed to resolve api/AppType.
// These are only used for type-level resolution; they are never executed in the browser.
declare class D1Database {}
declare class Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}
declare class ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props: unknown;
}
