export type Answer = { text: string; correct: boolean };
export type TopicId = "engine" | "navigation" | "seamanship" | "practical";
export type Question = {
  id: string;
  topic: TopicId;
  topicName: string;
  topicDescription: string;
  question: string;
  answers: Answer[];
  images: string[];
  sourceIndex: number;
  preserveAnswerOrder?: boolean;
};
export type SessionQuestion = Question & { sessionAnswers: Answer[] };

type Topic = {
  id: TopicId;
  number: string;
  name: string;
  description: string;
  accent: string;
  questionOrder: "random" | "source";
};

export const TOPICS: Topic[] = [
  { id: "engine", number: "01", name: "מכונה", description: "מערכות מנוע, משאבות ותחזוקה", accent: "#087ebc", questionOrder: "random" },
  { id: "navigation", number: "02", name: "ניווט ומכשירים", description: "מפות, קשר ומכשירי ניווט", accent: "#2c94c4", questionOrder: "random" },
  { id: "seamanship", number: "03", name: "ימאות", description: "חוקי דרך, מפרשנות, מזג אוויר ובטיחות", accent: "#19a7a0", questionOrder: "random" },
  { id: "practical", number: "04", name: "הכנה למעשי", description: "הכרת היאכטה, תמרונים והכנה למבחן המעשי", accent: "#c47530", questionOrder: "source" },
];

// Preserve the existing subjects' audited exceptions. New questions carry their
// answer-order policy alongside the source content, including incorrect choices.
const ORDER_DEPENDENT_QUESTION_IDS = new Set([
  "engine-122",
  "navigation-3", "navigation-13", "navigation-15", "navigation-21", "navigation-24",
  "navigation-61", "navigation-86", "navigation-89", "navigation-154", "navigation-178",
  "navigation-186", "navigation-187", "navigation-254", "navigation-267", "navigation-268",
  "navigation-270",
  "seamanship-6", "seamanship-21", "seamanship-145", "seamanship-271", "seamanship-311",
  "seamanship-319", "seamanship-325", "seamanship-467",
]);

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function buildSession(
  questions: Question[],
  topicId: TopicId,
  onlyIds?: string[],
  random: () => number = Math.random,
): SessionQuestion[] {
  const topicQuestions = questions.filter((question) => question.topic === topicId);
  const requestedIds = onlyIds ? new Set(onlyIds) : null;
  let pool = requestedIds ? topicQuestions.filter((question) => requestedIds.has(question.id)) : topicQuestions;
  if (!pool.length) pool = topicQuestions;
  const ordered = TOPICS.find((topic) => topic.id === topicId)?.questionOrder === "source"
    ? [...pool].sort((a, b) => a.sourceIndex - b.sourceIndex)
    : shuffle(pool, random);
  return ordered.map((question) => ({
    ...question,
    sessionAnswers: question.preserveAnswerOrder || ORDER_DEPENDENT_QUESTION_IDS.has(question.id)
      ? [...question.answers]
      : shuffle(question.answers, random),
  }));
}
