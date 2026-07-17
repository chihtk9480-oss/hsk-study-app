import test from "node:test";
import assert from "node:assert/strict";
import {
  LESSONS,
  VOCABULARY,
  WRITING_WORDS,
  getLessonWords,
  getWord,
} from "../js/data.js";

test("lộ trình có đủ HSK 1–3, mỗi cấp 15 bài", () => {
  assert.equal(LESSONS.length, 45);
  assert.ok(VOCABULARY.length >= 220);
  for (const level of [1, 2, 3]) {
    assert.equal(LESSONS.filter((lesson) => lesson.level === level).length, 15);
  }
  for (const lesson of LESSONS) {
    assert.ok(getLessonWords(lesson.id).length >= 4, `Bài ${lesson.id} phải có từ mới`);
    assert.equal(lesson.dialogue.length, 2, `Bài ${lesson.id} phải có hội thoại`);
    assert.ok(lesson.grammar, `Bài ${lesson.id} phải có trọng tâm ngữ pháp`);
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

test("mọi từ vựng đều có trong phòng luyện viết theo bài", () => {
  assert.equal(WRITING_WORDS.length, VOCABULARY.length);
  assert.ok(WRITING_WORDS.every((word) => Array.from(word.hanzi).length >= 1));
});
