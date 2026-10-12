<div align="center">

# Skipper 30 Quiz 🌊

### Interactive preparation for Israel's Skipper 30 exam

A complete Hebrew question bank with Russian and English translation help and a mobile-first practice experience.

[**Open the app**](https://mitkonenim-layam.sapirp.chatgpt.site)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Offline cache](https://img.shields.io/badge/Offline-cache-5A0FC8)
![RTL](https://img.shields.io/badge/RTL-Hebrew-0B6E75)
![Russian help](https://img.shields.io/badge/Help-Russian-13A7A1)
![English help](https://img.shields.io/badge/Help-English-087EBC)

</div>

![Skipper 30 Quiz home screen with animated tuna](docs/app-preview.png)

---

## About

**Skipper 30 Quiz** is a web application for practicing questions for Israel's Skipper 30 exam. Choose a subject, work through every question (theory topics are randomized; practical preparation follows the source document), and use optional Russian or English translations beneath each question when needed.

Progress resets whenever the page is refreshed. The three theory topics shuffle questions once at the beginning of each new session. Practical preparation always follows the document order, including the relative order in mistake retries. Answer choices are also shuffled, except for questions whose answers refer to their original letter positions or to labeled elements in an image. Their order remains stable while navigating backward and forward through that session.

## Features

- **1,024 questions** across four subjects
- **177** engine questions
- **264** navigation and instruments questions
- **373** seamanship questions
- **210** practical-preparation questions (הכנה למעשי), in document order
- **171 unique question images** referenced by the current bank
- Correct and incorrect answers highlighted immediately after selection
- Optional, non-interactive Russian and English translations for all questions and answers
- Previous and Next navigation available throughout a session
- Selected answers and answer order preserved when revisiting questions
- Answer randomization at the start of each session, with source order preserved for 49 order-dependent questions (25 existing and 24 practical)
- Unrestricted access to every question in the selected subject
- Tap-to-enlarge question images with lazy loading
- Complete Hebrew and right-to-left interface support
- Responsive layouts for iPhone, iPad, and Android devices
- Landscape orientation and safe-area support
- Accessible touch targets and accidental-exit protection
- Service Worker caching for repeat use on slow or interrupted connections

## How It Works

1. Select one of the four exam subjects.
2. The app keeps practical questions in document order and shuffles theory questions. Most answer choices shuffle once per session; order-dependent choices retain their source order.
3. Open **Перевод на русский** or **Translation to English** when translation help is useful.
4. Select an answer to reveal whether it is correct.
5. Use Previous and Next to move through the stable session order.
6. Continue until you have completed the entire subject bank.

## Local Development

### Requirements

- Node.js `22.13.0` or later
- npm

### Setup

```bash
npm install
npm run dev
```

The development URL will be displayed in your terminal.

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production-ready build |
| `npm test` | Build and run the project tests |
| `npm run lint` | Check code quality |

## Project Structure

```text
app/
├── quiz-app.tsx        # Quiz interface and application logic
├── quiz-session.ts     # Topic configuration and session ordering
├── questions.json     # Complete 1,024-question bank
├── questions.en.json  # English question and answer translations
├── questions.ru.json  # Russian question and answer translations
├── globals.css        # Responsive styling and animations
└── layout.tsx         # Application shell and viewport metadata
public/
├── question-images/   # Images used by the questions
├── tuna.png           # Animated tuna illustration
└── sw.js              # Offline cache service worker
tests/                 # Rendering and translation coverage tests
scripts/
├── import_practical_questions.py # Import or verify the practical DOCX
└── translate_questions.mjs # Regenerate Russian or English translations
```

## Technology

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [vinext](https://github.com/cloudflare/vinext)
- [Vite](https://vite.dev/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Question Data

The question bank was extracted from four Word documents. Answers highlighted with a green background in the source documents were recorded as correct. Duplicate questions were removed from the three theory topics. All 210 practical questions are retained in source order, including the two three-choice questions and 29 original illustrations. The practical importer reads numbered question paragraphs and green shading (`#92D050`), because both questions and correct answers can be bold.

Import practical preparation with `python3 scripts/import_practical_questions.py "/path/to/qa maasi.docx"`. This updates only the practical topic and its image assets. Add `--check` to verify the stored questions and image bytes against the document without changing files. Ambiguous answer markings stop the import instead of dropping questions.

The practical question data carries `sourceIndex` and `preserveAnswerOrder`. All 24 questions with letter-dependent choices preserve the entire answer list, even when the dependent choice is incorrect. Practical English/Russian help uses numbered choice references to match the translated lists.

Translations are stored in `app/questions.ru.json` and `app/questions.en.json`, keyed by question ID and the original Hebrew answer text. Regenerate Russian with `node scripts/translate_questions.mjs` and English with `node scripts/translate_questions.mjs en`. These commands send the Hebrew question bank to Google Translate and replace the selected translation file, so review the resulting nautical terminology before publishing.

> This application is an independent study aid and is not an official website of Israel's Shipping and Ports Administration.

---

<div align="center">

Built to make the path to the exam clearer—and bring you a little closer to the sea.

</div>
