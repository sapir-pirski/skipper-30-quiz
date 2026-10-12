import type { Metadata } from "next";
import QuizApp from "./quiz-app";

export const metadata: Metadata = {
  title: "מתכוננים לים — תרגול משיט 30",
  description: "תרגול חכם מתוך 1,024 שאלות במכונה, ניווט ומכשירים, ימאות והכנה למעשי.",
};

export default function Home() {
  return <QuizApp />;
}
