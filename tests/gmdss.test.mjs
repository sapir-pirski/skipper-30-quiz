import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSession, TOPICS } from "../app/quiz-session.ts";

const bank = JSON.parse(await readFile(new URL("../app/questions.json", import.meta.url), "utf8"));
const questions = bank.questions.filter((q) => q.topic === "gmdss");
const removed = [46, 48, 49, 80, 81, 84, 86, 97, 101, 102, 108, 140, 145, 149, 151, 227, ...Array.from({ length: 19 }, (_, i) => 232 + i)];
const indices = Array.from({ length: 251 }, (_, i) => i + 1).filter((i) => !removed.includes(i));
const locked = [1, 3, 8, 32, 41, 51, 53, 58, 61, 65, 69, 70, 82, 85, 91, 95, 98, 118, 132, 148, 158, 173, 176, 178, 179, 193, 203, 207, 220];

test("section 05 contains deduplicated GMDSS questions in their original source positions", () => {
  assert.equal(TOPICS[4].id, "gmdss");
  assert.equal(TOPICS[4].number, "05");
  assert.equal(TOPICS[4].accent, "#7161a8");
  assert.equal(questions.length, 216);
  assert.deepEqual(questions.map((q) => q.sourceIndex), indices);
  assert.deepEqual(questions.map((q) => q.id), indices.map((i) => `gmdss-${i}`));
  for (const question of questions) {
    assert.equal(question.answers.length, 4, question.id);
    assert.equal(question.answers.filter((a) => a.correct).length, 1, question.id);
  }
  assert.match(questions.find((q) => q.sourceIndex === 43).question, /TR/);
  assert.match(questions.find((q) => q.sourceIndex === 112).question, /x-band/);
});

test("GMDSS keeps source order in new sessions, reversed input and mistake retries", () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    assert.deepEqual(buildSession([...bank.questions].reverse(), "gmdss", undefined, random).map((q) => q.sourceIndex), indices);
  }
  const retry = buildSession(bank.questions, "gmdss", ["gmdss-251", "engine-1", "gmdss-3", "gmdss-1"], () => 0);
  assert.deepEqual(retry.map((q) => q.sourceIndex), [1, 3, 251]);
});

test("all GMDSS positional references retain order, including incorrect combined choices", () => {
  assert.deepEqual(questions.filter((q) => q.preserveAnswerOrder).map((q) => q.sourceIndex), locked);
  const before = JSON.stringify(bank);
  const session = buildSession(bank.questions, "gmdss", undefined, () => 0);
  for (const question of session) {
    if (locked.includes(question.sourceIndex)) assert.deepEqual(question.sessionAnswers, question.answers, question.id);
    else assert.notDeepEqual(question.sessionAnswers, question.answers, question.id);
    assert.equal(question.sessionAnswers.filter((a) => a.correct).length, 1);
    assert.ok(question.sessionAnswers.every((answer) => question.answers.includes(answer)));
  }
  assert.equal(session.find((q) => q.sourceIndex === 32).answers[3].correct, false);
  assert.equal(session.find((q) => q.sourceIndex === 69).answers[2].correct, false);
  const saved = session.map((q) => [...q.sessionAnswers]);
  buildSession(bank.questions, "gmdss", undefined, () => 0.5);
  assert.deepEqual(session.map((q) => q.sessionAnswers), saved);
  assert.equal(JSON.stringify(bank), before);
});

test("translated letter references use the displayed numbered choices", async () => {
  for (const language of ["en", "ru"]) {
    const translations = JSON.parse(await readFile(new URL(`../app/questions.${language}.json`, import.meta.url), "utf8"));
    for (const question of questions) {
      for (const answer of question.answers) {
        const match = answer.text.match(/^תשוב(?:ות|ה)\s+([אבגד])['׳’]?\s*(?:ו[-־–]?\s*|\+\s*)([אבגד])/u);
        if (!match) continue;
        const numbers = [match[1], match[2]].map((letter) => "אבגד".indexOf(letter) + 1);
        const translated = translations[question.id].answers[answer.text];
        assert.ok(translated.includes(String(numbers[0])) && translated.includes(String(numbers[1])), `${language} ${question.id}: ${translated}`);
      }
    }
  }
});
