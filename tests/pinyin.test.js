import test from "node:test";
import assert from "node:assert/strict";
import { VOCABULARY } from "../js/data.js";
import { createPinyinDictionary, normalizePinyinKey } from "../js/pinyin.js";

test("chuẩn hóa Pinyin có dấu thành khóa không dấu", () => {
  assert.equal(normalizePinyinKey("Nǐ hǎo"), "nihao");
  assert.equal(normalizePinyinKey("lǚ"), "lv");
});

test("bộ gõ cục bộ hiện ứng viên Hán tự ngay khi gõ ba", () => {
  const dictionary = createPinyinDictionary(VOCABULARY);
  const candidates = dictionary.ba.map((item) => item.w);
  assert.deepEqual(candidates.slice(0, 3), ["八", "爸", "吧"]);
  assert.ok(candidates.includes("爸爸"));
});

test("bộ gõ chứa từ ghép HSK theo tiền tố", () => {
  const dictionary = createPinyinDictionary(VOCABULARY);
  assert.ok(dictionary.ni.some((item) => item.w === "你好"));
  assert.ok(dictionary.xue.some((item) => item.w === "学习"));
});
