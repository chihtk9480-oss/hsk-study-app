import test from "node:test";
import assert from "node:assert/strict";
import {
  LESSONS,
  VOCABULARY,
  WRITING_WORDS,
  getLessonWords,
  getWord,
} from "../js/data.js";

test("bộ khởi động có đúng 6 bài và 72 mục từ", () => {
  assert.equal(LESSONS.length, 6);
  assert.equal(VOCABULARY.length, 72);
  for (const lesson of LESSONS) {
    assert.equal(getLessonWords(lesson.id).length, 12, `Bài ${lesson.id} phải có 12 từ`);
  }
});

test("id từ vựng là duy nhất và có thể tra cứu", () => {
  const ids = VOCABULARY.map((word) => word.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const word of VOCABULARY) assert.equal(getWord(word.id), word);
});

test("mỗi mục từ có đủ trường cần cho flashcard và quiz", () => {
  const required = [
    "id",
    "lesson",
    "hanzi",
    "pinyin",
    "meaning",
    "example",
    "examplePinyin",
    "exampleMeaning",
  ];

  for (const word of VOCABULARY) {
    assert.ok(LESSONS.some((lesson) => lesson.id === word.lesson));
    for (const field of required) {
      assert.ok(String(word[field]).trim(), `${word.id} thiếu ${field}`);
    }
  }
});

test("danh sách luyện viết chỉ chứa chữ Hán đơn", () => {
  assert.ok(WRITING_WORDS.length >= 20);
  for (const word of WRITING_WORDS) {
    assert.equal(Array.from(word.hanzi).length, 1);
  }
});
