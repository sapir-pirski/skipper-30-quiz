<div align="center">

# Skipper 30 Quiz 🌊

### Interactive preparation for Israel's Skipper 30 exam

A complete Hebrew question bank with instant feedback and a mobile-first practice experience.

[**Open the app**](https://mitkonenim-layam.sapirp.chatgpt.site)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Offline cache](https://img.shields.io/badge/Offline-cache-5A0FC8)
![RTL](https://img.shields.io/badge/RTL-Hebrew-0B6E75)

</div>

---

## About

**Skipper 30 Quiz** is a web application for practicing questions for Israel's Skipper 30 exam. Choose a subject, work through every question in a randomized order, and receive immediate feedback after each answer.

Progress resets whenever the page is refreshed. Both questions and answer choices are reshuffled for every new session to recreate the experience of a real exam.

## Features

- **909 unique questions** across three subjects
- **179** engine questions
- **285** navigation and instruments questions
- **445** seamanship questions
- **202 original images** embedded in relevant questions
- Immediate feedback with the correct answer highlighted in green
- Independent question and answer randomization for every session
- Unrestricted access to every question in the selected subject
- Tap-to-enlarge question images with lazy loading
- Complete Hebrew and right-to-left interface support
- Responsive layouts for iPhone, iPad, and Android devices
- Landscape orientation and safe-area support
- Accessible touch targets, sticky feedback, and accidental-exit protection
- Service Worker caching for repeat use on slow or interrupted connections

## How It Works

1. Select one of the three exam subjects.
2. The app shuffles all questions and their answer choices.
3. Select an answer and receive immediate feedback.
4. Continue until you have completed the entire subject bank.

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
├── quiz-app.tsx       # Quiz interface and application logic
├── questions.json     # Complete 909-question bank
├── globals.css        # Responsive styling and animations
└── layout.tsx         # Application shell and viewport metadata
public/
├── question-images/   # Images used by the questions
├── tuna.png           # Animated tuna illustration
└── sw.js              # Offline cache service worker
tests/                 # Rendering tests
```

## Technology

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [vinext](https://github.com/cloudflare/vinext)
- [Vite](https://vite.dev/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Question Data

The question bank was extracted from three Word documents. Answers highlighted with a green background in the source documents were recorded as correct. Duplicate questions were removed, and the original question images were preserved.

> This application is an independent study aid and is not an official website of Israel's Shipping and Ports Administration.

---

<div align="center">

Built to make the path to the exam clearer—and bring you a little closer to the sea.

</div>
