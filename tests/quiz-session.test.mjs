import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSession, TOPICS } from "../app/quiz-session.ts";

const bank = JSON.parse(await readFile(new URL("../app/questions.json", import.meta.url), "utf8"));
const practical = bank.questions.filter((question) => question.topic === "practical");
const indices = Array.from({ length: 210 }, (_, index) => index + 1);
const lockedIndices = [13, 16, 20, 26, 34, 59, 67, 68, 72, 74, 84, 94, 97, 103, 109, 110, 151, 153, 155, 164, 166, 167, 173, 180];

test("the fourth topic contains every source question, including both three-choice questions", () => {
  assert.equal(TOPICS[3].id, "practical");
  assert.equal(TOPICS[3].number, "04");
  assert.equal(bank.questions.length, 1024);
  assert.deepEqual(bank.counts, { engine: 177, navigation: 264, seamanship: 373, practical: 210 });
  assert.deepEqual(practical.map((q) => q.sourceIndex), indices);
  assert.deepEqual(practical.map((q) => q.id), indices.map((n) => `practical-${n}`));
  assert.equal(new Set(bank.questions.map((q) => q.id)).size, bank.questions.length);
  for (const question of practical) {
    assert.equal(question.answers.length, [101, 102].includes(question.sourceIndex) ? 3 : 4);
    assert.equal(question.answers.filter((answer) => answer.correct).length, 1, question.id);
    assert.ok(question.question.trim());
    assert.ok(question.answers.every((answer) => answer.text.trim()));
  }
});

test("all 29 original illustrations remain attached to questions 117–145", async () => {
  const illustrated = practical.filter((q) => q.images.length);
  assert.deepEqual(illustrated.map((q) => q.sourceIndex), indices.slice(116, 145));
  const urls = illustrated.flatMap((q) => q.images);
  assert.equal(urls.length, 29);
  assert.equal(new Set(urls).size, 29);
  for (const url of urls) {
    const payload = await readFile(new URL(`../public${url}`, import.meta.url));
    assert.ok(payload.length > 0, url);
    assert.ok(url.includes(createHash("sha256").update(payload).digest("hex").slice(0, 18)), url);
  }
});

test("practical questions keep source order across sessions and reversed input", () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const session = buildSession([...bank.questions].reverse(), "practical", undefined, random);
    assert.deepEqual(session.map((q) => q.sourceIndex), indices);
  }
});

test("mistake retries keep document order and stay within the selected topic", () => {
  const session = buildSession(bank.questions, "practical", ["practical-180", "engine-1", "practical-13", "practical-1"], () => 0);
  assert.deepEqual(session.map((q) => q.id), ["practical-1", "practical-13", "practical-180"]);
});

test("all letter-dependent answers stay in place, including incorrect combined choices", () => {
  assert.deepEqual(practical.filter((q) => q.preserveAnswerOrder).map((q) => q.sourceIndex), lockedIndices);
  const session = buildSession(bank.questions, "practical", undefined, () => 0);
  for (const question of session) {
    if (lockedIndices.includes(question.sourceIndex)) {
      assert.deepEqual(question.sessionAnswers, question.answers, question.id);
    } else {
      assert.notDeepEqual(question.sessionAnswers, question.answers, question.id);
    }
  }
  const incorrectCombination = session.find((q) => q.id === "practical-13");
  assert.equal(incorrectCombination.answers[3].correct, false);
  assert.deepEqual(incorrectCombination.sessionAnswers, incorrectCombination.answers);
});

test("answer shuffling retains correctness, selection identity, and the source bank", () => {
  const before = JSON.stringify(bank);
  const session = buildSession(bank.questions, "practical", undefined, () => 0);
  for (const question of session) {
    assert.notEqual(question.sessionAnswers, question.answers);
    assert.equal(question.sessionAnswers.filter((answer) => answer.correct).length, 1);
    for (const answer of question.sessionAnswers) {
      const savedIndex = question.answers.indexOf(answer);
      assert.ok(savedIndex >= 0);
      assert.equal(question.sessionAnswers.indexOf(question.answers[savedIndex]), question.sessionAnswers.indexOf(answer));
    }
  }
  const snapshot = session.map((q) => [...q.sessionAnswers]);
  buildSession(bank.questions, "practical", undefined, () => 0.5);
  assert.deepEqual(session.map((q) => q.sessionAnswers), snapshot);
  assert.equal(JSON.stringify(bank), before);
});

test("the three existing topics still shuffle questions and retain their answer exceptions", () => {
  for (const topic of ["engine", "navigation", "seamanship"]) {
    const original = bank.questions.filter((q) => q.topic === topic);
    const session = buildSession(bank.questions, topic, undefined, () => 0);
    assert.equal(session.length, original.length);
    assert.notDeepEqual(session.map((q) => q.id), original.map((q) => q.id));
  }
  for (const id of ["engine-122", "navigation-3", "seamanship-6"]) {
    const question = bank.questions.find((q) => q.id === id);
    const [sessionQuestion] = buildSession(bank.questions, question.topic, [id], () => 0);
    assert.deepEqual(sessionQuestion.sessionAnswers, question.answers);
  }
});
