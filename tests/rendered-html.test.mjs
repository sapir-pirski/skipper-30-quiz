import assert from "node:assert/strict";
import test from "node:test";

test("server-renders the Hebrew quiz with all four topic cards", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="he"[^>]*dir="rtl"/);
  assert.match(html, /מתכוננים לים/);
  assert.match(html, /1,024 שאלות/);
  assert.equal((html.match(/class="topic-card"/g) ?? []).length, 4);
  for (const name of ["מכונה", "ניווט ומכשירים", "ימאות", "הכנה למעשי"]) {
    assert.ok(html.includes(name), `Missing topic: ${name}`);
  }
  assert.match(html, /class="topic-number">04</);
  assert.match(html, /class="topic-count">210(?:<!-- -->)? שאלות</);
  assert.doesNotMatch(html, /codex-preview|Building your site|Your site is taking shape/);
});
