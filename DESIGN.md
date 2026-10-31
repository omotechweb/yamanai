---
name: YamanAI
description: A free AI assistant whose conversations leave marks in ink.
colors:
  madder: "#C8452F"
  madder-deep: "#AE3823"
  indigo: "#101B3D"
  ochre: "#D9A441"
  teal: "#2F7F86"
  paper: "#F4F1EA"
  paper-shade: "#E9E4D8"
  night: "#0B1228"
  night-surface: "#141D3A"
  ink-text: "#141B33"
  ink-muted: "#474F6C"
  paper-text: "#F0EDE4"
  paper-muted: "#B4BBD3"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.84375rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  control: "9999px"
  composer: "28px"
  panel: "16px"
  code: "12px"
spacing:
  thread-gap: "28px"
  column: "760px"
  sidebar: "288px"
components:
  button-primary:
    backgroundColor: "{colors.madder}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.madder-deep}"
  code-block:
    backgroundColor: "{colors.indigo}"
    textColor: "#E8E6F0"
    rounded: "{rounded.code}"
    typography: "{typography.code}"
---

# Design System: YamanAI

## Overview

**Creative North Star: "The Marbling Tray"**

Ebru is ink floated on water and combed into a pattern no one can repeat. YamanAI borrows that one idea and leaves everything else to a familiar chat layout: a history sidebar, a reading column, and a box to type in. Anyone who has used a chat assistant should know where everything is before they notice the ink.

The ink is a real simulation, not a picture. Each chat has its own plate, every answer adds to it, and it only moves while an answer is arriving. Everything around it stays quiet so that long reading is comfortable.

**Key Characteristics:**
- One live marbled band behind the composer, and nowhere else in the working screen
- Warm paper by day, deep indigo by night
- One highly legible typeface for all interface and reading text
- Madder red reserved for the action you are most likely to take

## Colors

Four inks on a paper ground, with neutrals tinted toward indigo rather than grey.

### Primary
- **Madder**: primary actions only, plus its place among the inks in the plate.

### Secondary
- **Indigo**: user message bubbles, selected controls, code blocks, the night sidebar.

### Tertiary
- **Ochre and Teal**: appear as ink. Teal also marks links and focus rings. A lighter ochre marks actions placed on indigo.

### Neutral
- **Paper and Paper Shade**: the day workspace and sidebar.
- **Night and Night Surface**: the night workspace and its raised surfaces.
- **Ink Text and Ink Muted**: day text. **Paper Text and Paper Muted**: night text.

### Named Rules
**The One Red Rule.** Red asks for an action. List markers, headings, open states and hover states never use it.

**The Tinted Neutral Rule.** No stock greys; neutrals come from the indigo and paper of the world.

## Typography

**Body Font:** Atkinson Hyperlegible Next (with the system sans)
**Code Font:** JetBrains Mono (code and nothing else)

**Character:** Built for legibility by the Braille Institute, which suits a product meant for everyone. Both faces must load their `latin-ext` subset, because Turkish letters live there.

### Hierarchy
- **Display** (700, 2.75rem on desktop, 2rem on phones, 1.1): the empty-chat greeting and page titles.
- **Title** (700, 1.25rem, 1.25): dialog titles and chat titles.
- **Body** (400, 1.0625rem, 1.65): answers, capped at 72ch for prose. Code and tables may use the full column.
- **Label** (600, 0.9375rem, 1.3): controls and list rows.

### Named Rules
**The No Costume Rule.** Monospace is for code. Labels, counters and dates use the interface face, with tabular numerals.

## Layout

A 288px sidebar and a centred 760px reading column. Below the `md` breakpoint (768px) the sidebar becomes a drawer. The composer sits at the bottom of the column on the ink band, which is 150px tall in a thread (164px on phones) and up to 300px in an empty chat. The scroll area reserves a stable gutter on both sides so the thread and composer stay aligned.

## Elevation & Depth

Flat by default, with depth from tone. Only floating things carry a shadow: dialogs and the jump-to-latest button.

### Shadow Vocabulary
- **Dialog** (`box-shadow: 0 18px 50px rgb(7 12 30 / 0.35)`): dialogs and sheets.
- **Float** (`box-shadow: 0 4px 14px rgb(7 12 30 / 0.25)`): the jump-to-latest button.

## Shapes

Full pills for controls, a 28px composer, 16px dialogs and 12px code blocks. The teardrop is the only ornamental shape, used for the logo.

## Components

### Buttons
- **Shape:** full pill.
- **Primary:** madder with white text and a 44px minimum height.
- **Hover / Focus:** deepens to madder deep. Focus shows a 2px teal ring offset by 2px.
- **Secondary:** a hairline outline with ink text.

### Inputs / Fields
- **Style:** white on paper or night surface, with a stronger hairline border.
- **Focus:** the ring is drawn on the rounded composer, never on the textarea inside it.
- **Disabled:** when the daily limit is reached, the composer is disabled and its placeholder says why.

### Navigation
History rows are 40px tall with a 20px round crop of that chat's own ink. The selected row uses a darker tone and bold text.

### Locked features
Features that need sign-in stay visible with a lock icon. Choosing one opens the sign-in dialog, which lists what signing in adds.

### Limit notice
An indigo strip above the composer appears when three or fewer messages remain, and says when the limit renews or how to raise it.

### Ebru Plate
A full-bleed canvas behind the composer, fading into the page at its top edge. Drops displace existing ink while preserving area, and tine strokes comb it. It animates only while an answer streams, for as long as it streams, and is static under reduced motion.

## Do's and Don'ts

### Do:
- **Do** keep the composer and its text on opaque surfaces whenever they sit above ink.
- **Do** say plainly that messages are sent to OpenAI.
- **Do** keep destructive actions apart from everything else, and offer undo.

### Don't:
- **Don't** use decorative gradients, sparkle icons, or gradient text.
- **Don't** add small uppercase labels above headings.
- **Don't** let the ink move when nothing is happening.
- **Don't** put text directly on ink.
