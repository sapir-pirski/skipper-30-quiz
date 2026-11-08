import assert from "node:assert/strict";
import test from "node:test";

test("server-renders the Hebrew quiz with all five topic cards", async () => {
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
  assert.equal((html.match(/class="topic-card"/g) ?? []).length, 5);
  for (const name of ["מכונה", "ניווט ומכשירים", "ימאות", "הכנה למעשי", "GMDSS"]) {
    assert.ok(html.includes(name), `Missing topic: ${name}`);
  }
  assert.match(html, /class="topic-number">04</);
  assert.match(html, /class="topic-count">210(?:<!-- -->)? שאלות</);
  assert.match(html, /class="topic-number">05</);
  assert.match(html, /class="topic-count">216(?:<!-- -->)? שאלות</);
  assert.match(html, /--accent:#7161a8/);
  assert.doesNotMatch(html, /codex-preview|Building your site|Your site is taking shape/);
});
