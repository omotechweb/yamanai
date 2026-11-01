# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyone: the owner's stated audience is "all users in the world", not a niche. A general-purpose AI assistant has to work for a first-time visitor with no technical background as well as for someone writing code. The interface is available in Turkish and English, chosen from the browser language or in Settings; the owner's own context is Turkish.

## Product Purpose

YamanAI is a free AI chat assistant. People use it to write code, translate, get explanations, generate ideas, or just talk. Success means a visitor can open it and get a useful answer straight away, without signing up.

## Positioning

Undecided. The owner has not named a reason to choose YamanAI over other assistants. Do not invent one. What is factually true today: it is free, it can be used without an account up to a daily limit, and chats stay in the browser.

## Operating Context

Used in a browser on desktop and mobile, and as a Windows desktop app (Electron wrapper, installer at `public/download/YamanAISetup.exe`). Sessions range from one quick question to long threads with code.

## Capabilities and Constraints

- Streaming chat through `/api/chat`, using OpenAI models `gpt-4o` and `gpt-4o-mini`.
- Conversations and settings are stored in the browser's localStorage; there is no server-side history.
- Markdown rendering, syntax-highlighted code blocks, live preview for HTML/CSS/JS/JSX/TSX.
- Settings: theme (dark/light), text size, model, custom system prompt, export and delete chats.
- Google and GitHub sign-in through next-auth. Chatting works without an account, but sign-in raises the daily message limit (10 to 50 by default, set with `GUEST_DAILY_LIMIT` and `USER_DAILY_LIMIT`) and unlocks GPT-4o, custom instructions and live preview. Guests use GPT-4o Mini. Export and delete stay open to everyone.
- The daily limit is enforced on the server and renews at midnight UTC. Guests are counted by IP address, signed-in users by account. Durable counting across serverless instances needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Voice chat (microphone button in the composer) is for signed-in users only, on the web and in the desktop app. Speech goes to `/api/voice/transcribe` (OpenAI `gpt-4o-mini-transcribe`), replies are read aloud through `/api/voice/speak` (OpenAI `gpt-4o-mini-tts`). Each spoken question uses one daily message; audio requests also have their own `VOICE_DAILY_LIMIT` (300 by default).
- The Windows desktop app requires sign-in before anything else. It never shows offers to download the app.
- FAQ at `/sss`, sign-in page at `/giris`.
- Stack: Next.js 16, React 19, Tailwind CSS 4, TypeScript.
- Undecided: pricing beyond "free today", legal pages (terms and privacy are referenced on `/giris` but do not exist).

## Brand Commitments

Name: YamanAI, currently labelled Beta 1.0. No logo asset exists beyond a generic sparkle icon in a gradient tile, which the owner agreed to replace. Voice is friendly and informal Turkish, addressing the reader as "sen".

## Evidence on Hand

No testimonials, usage numbers, customers, or press exist. Do not fabricate any.

## Product Principles

1. The answer is the product: nothing should compete with the conversation.
2. Ask first: a visitor can ask something before being asked for anything; sign-in earns more, it is never required to start.
3. Say only what is true: especially about privacy, since messages do reach OpenAI.
4. Understandable to anyone, not just people who know what a "system prompt" is.

## Accessibility & Inclusion

The stated audience is global, so language, script coverage and right-to-left readiness matter. Keyboard use and reduced-motion support already exist in the app and must be preserved.
