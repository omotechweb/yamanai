---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/sss/page.tsx","src/app/giris/page.tsx"]
---

Scope: YamanAI chat app shell (`/`), plus `/sss` and `/giris` in the same world. Mode: Operate (`/sss` is Read).
Task: open and get an answer without signing up, up to a daily limit; sign in to raise the limit and unlock GPT-4o, custom instructions and live preview. Audience: everyone, worldwide. Keep every existing feature.
Unresolved: positioning; legal pages; languages beyond Turkish and English.

## Direction contract

THESIS: Every conversation makes its own marbled plate; ink lands for as long as the answer arrives. Refuses the grey-chat-with-sparkle-gradient default.

OWN-WORLD: Paper #F4F1EA workspace with a darker paper #E9E4D8 sidebar by day (owner's request); deep indigo workspace with an indigo #101B3D sidebar at night. Madder red #C8452F for primary actions and as one of the inks. Ochre #D9A441 and teal #2F7F86 inside the ink; teal also marks links and focus. Round pills, teardrop mark, Atkinson Hyperlegible Next as the one UI family with full Latin Extended coverage.

STORY: A visitor sees where to type, asks, and watches ink respond while the answer streams. They trust it because it says plainly where messages go and what signing in adds. They come back to chats they recognise by their own ink.

FIRST VIEWPORT: 288px sidebar with brand, red New Chat and history; header with chat title and controls; 760px thread column; pill composer at bottom centre on a full-bleed ink band fading upward into paper. Empty chat: greeting and four plain text starters above a taller plate. Signature interaction: real marbling simulation (area-preserving drop displacement, tine pulls), seeded per chat, moving only while streaming, static under reduced motion. Motion grammar: 150-250ms state changes, no load choreography.

FORM: Ebru, pick card from my ordered list (position 1). seed:30fc19df0717ce8b

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Direction contract: design 2 "Gece Boğaz'ı" (user-selectable alternate, signed-in only)

Users pick Design 1 (Ebru, above) or Design 2 in Settings; guests always get Design 1. Both share layout, controls and every feature; Design 2 swaps type, palette, density and the signature move only.

THESIS: The chat at night on the Bosphorus: the answer arrives as bridge light reaching the water. Refuses grey-on-white chat and the neon-on-black "AI" look.

OWN-WORLD: Night #070D1F ground, sidebar #0B142B, raised #121D3B, hairline #1F2C50; sodium gold #E8B65A for the primary action, selection and the reflection; mist #9FB3D9 secondary; text #F2EEE4. Always night (ignores light/dark). Bodoni Moda for brand, chat title and greeting; Manrope for all UI and reading; JetBrains Mono for code only. Pills for controls, 14px code blocks, soft deep shadows on floating things.

STORY: A signed-in visitor switches to Gece Boğaz'ı, the room goes dark and calm, the answer reads in warm light; nothing moves until an answer arrives.

FIRST VIEWPORT: Same shell as Ebru: 288px night sidebar, gold New Chat, history with a gold dot on the active chat; header with Bodoni title and model pill; 760px thread; pill composer on a dark water band where gold light columns reflect, shimmering only while an answer streams, static under reduced motion.

FORM: Gece Boğaz'ı, impeccable's pick (position 1 of my ordered list), chosen by the user over the roll. seed:03f4fda04b27b7a1

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
