import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loadJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

for (const language of ["ru", "en"]) {
  test(`${language} translations cover every question and answer`, async () => {
    const [bank, translations] = await Promise.all([
      loadJson("../app/questions.json"),
      loadJson(`../app/questions.${language}.json`),
    ]);

    assert.equal(Object.keys(translations).length, bank.questions.length);
    for (const question of bank.questions) {
      const translation = translations[question.id];
      assert.ok(translation?.question, `Missing ${language} question: ${question.id}`);
      for (const answer of question.answers) {
        assert.ok(
          translation.answers[answer.text],
          `Missing ${language} answer: ${question.id} / ${answer.text}`,
        );
      }
    }
  });
}
