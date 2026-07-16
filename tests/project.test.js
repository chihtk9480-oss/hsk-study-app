import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("các tệp quan trọng để chạy và cài PWA đều tồn tại", () => {
  const files = [
    "index.html",
    "styles.css",
    "js/app.js",
    "js/data.js",
    "js/curriculum.js",
    "manifest.webmanifest",
    "sw.js",
    "assets/mascot.svg",
    "assets/icons/icon-192.png",
    "assets/icons/icon-512.png",
  ];
  for (const file of files) assert.ok(existsSync(resolve(root, file)), `Thiếu ${file}`);
});

test("manifest có icon 192 và 512, start URL nằm trong scope", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "./");
  assert.match(manifest.start_url, /^\.\//);
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
});

test("service worker cache đầy đủ các tài nguyên cốt lõi", () => {
  const worker = readFileSync(resolve(root, "sw.js"), "utf8");
  for (const asset of ["index.html", "styles.css", "js/app.js", "js/data.js", "js/curriculum.js", "manifest.webmanifest"]) {
    assert.ok(worker.includes(asset), `Cache chưa có ${asset}`);
  }
});
