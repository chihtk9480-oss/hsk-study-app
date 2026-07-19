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
    "js/practice.js",
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

test("trung tâm thi thử khai báo đúng quy mô HSK 1–3", () => {
  const app = readFileSync(resolve(root, "js/app.js"), "utf8");
  for (const expected of [
    "total: 40, minutes: 40, testMinutes: 35, maxScore: 200, passScore: 120",
    "total: 60, minutes: 55, testMinutes: 50, maxScore: 200, passScore: 120",
    "total: 80, minutes: 90, testMinutes: 85, maxScore: 300, passScore: 180",
  ]) assert.ok(app.includes(expected), `Thiếu cấu trúc ${expected}`);
  assert.ok(app.includes("Array.from({ length: 10 }"), "Mỗi cấp chưa có 10 đề");
  assert.ok(app.includes("buildStandardExam"), "Thiếu bộ sinh đề thi thử");
  assert.ok(app.includes("write-reorder") && app.includes("write-character"), "HSK 3 thiếu hai dạng viết");
});

test("từ làm sai có thể ôn và mở thẳng phòng luyện viết", () => {
  const app = readFileSync(resolve(root, "js/app.js"), "utf8");
  assert.ok(app.includes("mistakeWords") && app.includes("recordMistake"), "Thiếu sổ từ sai");
  assert.ok(app.includes("start-session-mistakes"), "Thiếu luồng ôn từ sai sau đề");
  assert.ok(app.includes("open-writing-word"), "Thiếu nút luyện viết trực tiếp");
  assert.ok(app.includes("return-from-writing"), "Thiếu nút quay lại phiên ôn");
});

test("phòng luyện viết có bàn phím Pinyin và tra nét chữ tự do", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  const app = readFileSync(resolve(root, "js/app.js"), "utf8");
  assert.ok(html.includes('"pinyin-ime"') && html.includes("google_pinyin_dict"), "Thiếu bộ gõ Pinyin");
  assert.ok(app.includes("pinyin-ime-editor"), "Thiếu ô nhập Pinyin");
  assert.ok(app.includes("apply-pinyin-lookup"), "Thiếu thao tác tra chữ Hán");
  assert.ok(app.includes("select-lookup-character"), "Từ nhiều chữ chưa thể chọn từng chữ để luyện");
  assert.ok(app.includes("extractHanzi"), "Thiếu xử lý chữ Hán nhập tự do");
});

test("điều hướng có phòng nghe chính tả và Speaking Challenge", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  const app = readFileSync(resolve(root, "js/app.js"), "utf8");
  assert.ok(html.includes('data-page="practice"'), "Thiếu mục Nghe & nói trên điều hướng");
  assert.ok(app.includes("startDictationSession") && app.includes("submitDictation"), "Thiếu luồng nghe chép chính tả");
  assert.ok(app.includes("startSpeakingRecognition") && app.includes('recognition.lang = "zh-CN"'), "Thiếu chấm giọng nói tiếng Trung");
  assert.ok(app.includes("renderAlignmentRows"), "Thiếu phản hồi đúng sai từng chữ");
  assert.ok(app.includes("speaking-disclaimer"), "Thiếu lưu ý giới hạn của điểm speaking");
});
