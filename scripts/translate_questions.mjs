import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../app/questions.json", import.meta.url), "utf8"));
const outputUrl = new URL("../app/questions.ru.json", import.meta.url);

function capitalizeRussianSentences(text) {
  return text.replace(
    /(^|[.!?…](?:["'»”’)\]]*)\s+)([а-яё])/gu,
    (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("ru-RU")}`,
  );
}

async function translate(text) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "iw", tl: "ru", dt: "t", q: text });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const body = await response.json();
        return capitalizeRussianSentences(body[0].map((part) => part[0]).join(""));
      }
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }
  throw new Error(`Translation failed: ${text.slice(0, 60)}`);
}

const translations = {};
let cursor = 0;
async function worker() {
  while (cursor < source.questions.length) {
    const question = source.questions[cursor++];
    const parts = await Promise.all([question.question, ...question.answers.map((answer) => answer.text)].map(translate));
    translations[question.id] = {
      question: parts[0],
      answers: Object.fromEntries(question.answers.map((answer, index) => [answer.text, parts[index + 1]])),
    };
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
await writeFile(outputUrl, `${JSON.stringify(translations)}\n`);
console.log(`Translated ${Object.keys(translations).length} questions.`);
