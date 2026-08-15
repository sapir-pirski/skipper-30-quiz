"use client";

import { useEffect, useMemo, useState } from "react";
import bank from "./questions.json";

type Answer = { text: string; correct: boolean };
type TopicId = "engine" | "navigation" | "seamanship";
type Question = { id: string; topic: TopicId; topicName: string; topicDescription: string; question: string; answers: Answer[]; images: string[] };
type History = Record<string, { attempts: number; correct: number; lastCorrect: boolean }>;

const QUESTIONS = bank.questions as Question[];
const TOPICS: { id: TopicId; number: string; name: string; description: string; accent: string }[] = [
  { id: "engine", number: "01", name: "מכונה", description: "מערכות מנוע, משאבות ותחזוקה", accent: "#087ebc" },
  { id: "navigation", number: "02", name: "ניווט ומכשירים", description: "מפות, קשר ומכשירי ניווט", accent: "#2c94c4" },
  { id: "seamanship", number: "03", name: "ימאות", description: "חוקי דרך, מפרשנות, מזג אוויר ובטיחות", accent: "#19a7a0" },
];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export default function QuizApp() {
  const [screen, setScreen] = useState<"home" | "quiz" | "summary">("home");
  const [history, setHistory] = useState<History>({});
  const [topic, setTopic] = useState<TopicId | null>(null);
  const [session, setSession] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [sessionWrong, setSessionWrong] = useState<string[]>([]);

  useEffect(() => {
    localStorage.removeItem("sea-quiz-history");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const current = session[index];

  const start = (topicId: TopicId, onlyIds?: string[]) => {
    let pool = onlyIds ? QUESTIONS.filter((question) => onlyIds.includes(question.id)) : QUESTIONS.filter((question) => question.topic === topicId);
    if (!pool.length) pool = QUESTIONS.filter((question) => question.topic === topicId);
    const nextSession = shuffle(pool);
    setTopic(topicId); setSession(nextSession); setIndex(0); setScore(0); setSessionWrong([]); setSelected(null);
    setAnswers(shuffle(nextSession[0]?.answers || [])); setScreen("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const choose = (answerIndex: number) => {
    if (selected !== null || !current) return;
    setSelected(answerIndex);
    const isCorrect = answers[answerIndex].correct;
    if (isCorrect) setScore((value) => value + 1); else setSessionWrong((ids) => [...ids, current.id]);
    const old = history[current.id] || { attempts: 0, correct: 0, lastCorrect: false };
    setHistory({ ...history, [current.id]: { attempts: old.attempts + 1, correct: old.correct + (isCorrect ? 1 : 0), lastCorrect: isCorrect } });
  };

  const next = () => {
    if (index + 1 >= session.length) { setScreen("summary"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const nextIndex = index + 1;
    setIndex(nextIndex); setSelected(null); setAnswers(shuffle(session[nextIndex].answers));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const topicStats = useMemo(() => Object.fromEntries(TOPICS.map((item) => {
    const questions = QUESTIONS.filter((question) => question.topic === item.id);
    return [item.id, { total: questions.length, answered: questions.filter((question) => history[question.id]).length }];
  })), [history]);

  if (screen === "quiz" && current) {
    const progress = ((index + (selected !== null ? 1 : 0)) / session.length) * 100;
    return <main className="quiz-shell">
      <header className="quiz-header">
        <button className="brand compact" onClick={() => setScreen("home")} aria-label="חזרה למסך הבית"><span className="brand-mark">מ</span><span>מתכוננים לים</span></button>
        <div className="quiz-meta"><span>{current.topicName}</span><b>{index + 1} / {session.length}</b></div>
      </header>
      <div className="progress-track" aria-label={`התקדמות ${Math.round(progress)} אחוז`}><span style={{ width: `${progress}%` }} /></div>
      <section className="question-card" key={current.id}>
        <div className="question-kicker"><span>שאלה {index + 1}</span><span>{score} נכונות</span></div>
        <h1>{current.question}</h1>
        {!!current.images.length && <div className={`image-gallery images-${Math.min(current.images.length, 5)}`}>{current.images.map((image, imageIndex) => <img key={`${image}-${imageIndex}`} src={image} alt={`איור לשאלה ${index + 1}, תמונה ${imageIndex + 1}`} />)}</div>}
        <div className="answers" role="group" aria-label="תשובות אפשריות">
          {answers.map((answer, answerIndex) => {
            const revealed = selected !== null;
            const state = revealed && answer.correct ? "correct" : revealed && selected === answerIndex ? "incorrect" : "";
            return <button key={`${answer.text}-${answerIndex}`} className={`answer ${state}`} onClick={() => choose(answerIndex)} disabled={revealed}>
              <span className="answer-letter">{String.fromCharCode(1488 + answerIndex)}</span><span>{answer.text}</span>
              {state === "correct" && <span className="answer-state">✓</span>}{state === "incorrect" && <span className="answer-state">×</span>}
            </button>;
          })}
        </div>
        {selected !== null && <div className={`feedback ${answers[selected].correct ? "is-correct" : "is-wrong"}`} role="status">
          <div><b>{answers[selected].correct ? "בדיוק!" : "כמעט. התשובה הנכונה מסומנת בירוק."}</b><span>{answers[selected].correct ? "ממשיכים לצבור תנופה." : "נפגוש את השאלה שוב בתרגול הטעויות."}</span></div>
          <button className="primary" onClick={next}>{index + 1 === session.length ? "לסיכום" : "לשאלה הבאה"}<span>←</span></button>
        </div>}
      </section>
    </main>;
  }

  if (screen === "summary" && topic) {
    const percent = Math.round((score / session.length) * 100);
    return <main className="summary-shell">
      <button className="brand compact" onClick={() => setScreen("home")}><span className="brand-mark">מ</span><span>מתכוננים לים</span></button>
      <section className="summary-card"><span className="eyebrow">התרגול הושלם</span>
        <div className="score-ring" style={{ "--score": `${percent * 3.6}deg` } as React.CSSProperties}><div><b>{percent}%</b><span>{score} מתוך {session.length}</span></div></div>
        <h1>{percent >= 80 ? "עבודה מצוינת." : percent >= 60 ? "כיוון טוב." : "ממשיכים לתרגל."}</h1>
        <p>{sessionWrong.length ? `${sessionWrong.length} שאלות מחכות לסיבוב תיקון קצר.` : "ענית נכון על כל השאלות בתרגול הזה."}</p>
        <div className="summary-actions">{!!sessionWrong.length && <button className="primary" onClick={() => start(topic, sessionWrong)}>תרגול טעויות <span>←</span></button>}<button className="secondary" onClick={() => start(topic)}>סיבוב חדש</button><button className="text-button" onClick={() => setScreen("home")}>בחירת נושא אחר</button></div>
      </section>
    </main>;
  }

  return <main>
    <section className="hero">
      <div className="hero-grid"><div className="hero-copy"><h1>כל הדרך<br />אל <em>הים.</em></h1></div>
        <div className="fish-scene" aria-hidden="true"><span className="bubble bubble-one" /><span className="bubble bubble-two" /><span className="bubble bubble-three" /><img className="tuna" src="/tuna.png" alt="" /></div>
      </div><div className="wave-line" aria-hidden="true" />
    </section>
    <section className="topics-section" id="topics">
      <div className="topic-grid">{TOPICS.map((item) => { const stats = topicStats[item.id]; return <article className="topic-card" key={item.id} style={{ "--accent": item.accent } as React.CSSProperties}><div className="topic-top"><span className="topic-number">{item.number}</span><span className="topic-count">{stats.total} שאלות</span></div><div><h3>{item.name}</h3><p>{item.description}</p></div><div className="topic-progress"><div><span>התקדמות</span><b>{stats.answered}/{stats.total}</b></div><div className="mini-track"><span style={{ width: `${(stats.answered / stats.total) * 100}%` }} /></div></div><button className="topic-button" onClick={() => start(item.id)}>התחלת תרגול <span>←</span></button></article>; })}</div>
    </section>
  </main>;
}
