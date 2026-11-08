import type { Metadata } from "next";
import QuizApp from "./quiz-app";

export const metadata: Metadata = {
  title: "מתכוננים לים — הכנה למשיט 30 ו־60",
  description: "הכנה למשיט 30 ולמשיט 60: מכונה, ניווט ומכשירים, ימאות והכנה למעשי למשיט 30, ו־GMDSS למשיט 60, עם תרגום לאנגלית ולרוסית.",
};

export default function Home() {
  return <QuizApp />;
}
