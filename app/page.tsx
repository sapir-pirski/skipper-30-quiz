import type { Metadata } from "next";
import QuizApp from "./quiz-app";

export const metadata: Metadata = {
  title: "מתכוננים לים — תרגול משיט 30",
  description: "תרגול חכם מתוך 909 שאלות במכונה, ניווט ומכשירים וימאות.",
};

export default function Home() {
  return <QuizApp />;
}
