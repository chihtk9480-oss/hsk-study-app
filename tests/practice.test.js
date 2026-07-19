import test from "node:test";
import assert from "node:assert/strict";
import { alignChinese, normalizeChinese, similarityScore } from "../js/practice.js";

test("chuẩn hóa đáp án bỏ khoảng trắng và dấu câu", () => {
  assert.equal(normalizeChinese(" 你好，朋友！ "), "你好朋友");
});

test("đối chiếu chỉ ra chữ bị thiếu trong câu chính tả", () => {
  const result = alignChinese("我喜欢汉语", "我喜欢语");
  const missing = result.operations.find((operation) => operation.type === "missing");
  assert.equal(missing?.expected, "汉");
  assert.equal(result.distance, 1);
});

test("điểm speaking phản ánh độ khớp văn bản nhận diện", () => {
  assert.equal(similarityScore("你好", "你好"), 100);
  assert.equal(similarityScore("你好", "您好"), 50);
  assert.equal(similarityScore("我喜欢汉语", "我喜欢语"), 80);
});
