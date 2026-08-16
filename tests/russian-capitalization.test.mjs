import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lowercaseRussianSentenceStart =
  /(^|[.!?…](?:["'»”’)\]]*)\s+)[а-яё]/u;

test("Russian questions and answers start every sentence with a capital", async () => {
  const translations = JSON.parse(
    await readFile(new URL("../app/questions.ru.json", import.meta.url), "utf8"),
  );
  const failures = [];

  for (const [id, translation] of Object.entries(translations)) {
    const values = [
      ["question", translation.question],
      ...Object.values(translation.answers).map((answer, index) => [
        `answer ${index + 1}`,
        answer,
      ]),
    ];

    for (const [field, value] of values) {
      if (lowercaseRussianSentenceStart.test(value)) failures.push(`${id} ${field}: ${value}`);
    }
  }

  assert.deepEqual(failures, []);
});
