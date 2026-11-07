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
  # Design 2, Gece Boğazı (html[data-design='bogaz']); always night
  bogaz-night: "#070D1F"
  bogaz-shore: "#0B142B"
  bogaz-surface: "#121D3B"
  bogaz-surface-2: "#18254A"
  bogaz-raised: "#111B37"
  bogaz-text: "#F2EEE4"
  bogaz-muted: "#A9B6D6"
  bogaz-subtle: "#8D9BC0"
  bogaz-line: "#1F2C50"
  bogaz-line-strong: "#33436F"
  bogaz-gold: "#E8B65A"
  bogaz-gold-light: "#F0C673"
  bogaz-gold-pale: "#F3D59A"
  bogaz-on-gold: "#1A1406"
  bogaz-mist: "#9FB3D9"
  bogaz-danger: "#F2876F"
  bogaz-bubble: "#16244A"
  bogaz-selected: "#2C3D6E"
  bogaz-code: "#050A18"
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
  bogaz-display:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  bogaz-title:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  bogaz-body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  bogaz-label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  control: "9999px"
  composer: "28px"
  panel: "16px"
  code: "12px"
spacing:
  thread-gap: "28px"
  column: "760px"
  sidebar: "288px"
  water-band-phone: "210px"
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
  segmented-selected:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
  bogaz-button-primary:
    backgroundColor: "{colors.bogaz-gold}"
    textColor: "{colors.bogaz-on-gold}"
    rounded: "{rounded.control}"
    height: "44px"
  bogaz-button-primary-hover:
    backgroundColor: "{colors.bogaz-gold-light}"
  bogaz-segmented-selected:
    backgroundColor: "{colors.bogaz-selected}"
    textColor: "{colors.bogaz-gold-pale}"
    rounded: "{rounded.control}"
  bogaz-model-pill:
    textColor: "{colors.bogaz-gold-pale}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  bogaz-bubble-user:
    backgroundColor: "{colors.bogaz-bubble}"
    textColor: "{colors.bogaz-text}"
    padding: "10px 16px"
  bogaz-code-block:
    backgroundColor: "{colors.bogaz-code}"
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

### Two designs

YamanAI ships two user-selectable designs on one shared layout and one set of components. **Design 1, Ebru** (above) is the default and the only design guests see. **Design 2, Gece Boğazı** replaces the palette, the type and the signature move, and nothing else. Signed-in users choose it in Settings under "Tasarım"; guests see it there, locked, with the reason. It is applied with `html[data-design='bogaz']`, set before first paint from the saved settings and the signed-in flag, so the screen never flashes the other design.

### Design 2: Gece Boğazı

**Creative North Star: "The Bosphorus at Night"**

The chat at night on the Bosphorus: the far shore is a thin line, lights burn along it, and their reflections lie on dark water behind the composer. Each chat has its own shoreline of lights, and every settled answer lights one more. The room is dark and calm; answers read in warm light.

Gece Boğazı is always night. It ignores the light/dark theme, and the theme controls are hidden while it is active. It refuses both grey-on-white chat and the neon-on-black "AI" look: the only light sources are sodium gold and a cool mist.

**Key Characteristics:**
- Lit water behind the composer, and nowhere else in the working screen
- Night navy ground with a soft glow rising from under the water
- Bodoni Moda for the display voice, Manrope for everything you read and press
- Sodium gold for the action, the selection and emphasis

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

### Gece Boğazı
Night navy neutrals lit by one warm light and one cool one. The design fills the same token roles as Ebru, so every component recolours without code of its own.

- **Sodium Gold** (primary): primary actions, the active-chat dot, text selection, the gold wash of the model pill, and the reflections on the water. Text on gold is **On Gold**, a near-black brown. **Gold Light** is the hover state.
- **Pale Gold**: focus rings, selected-segment text, the model pill label, and bold words inside answers.
- **Mist** (secondary): the cool reflections on the water and one ring of the logo.
- **Night** (canvas), **Shore** (sidebar), **Raised** (dialogs), **Surface** (composer, inputs) and **Surface 2** (control tracks).
- **Night Text**, **Night Muted** and **Night Subtle**: text, secondary text, placeholders and timestamps.
- **Night Line** and **Night Line Strong**: hairlines and control borders. The idle history dots use Line Strong.
- **Bubble**: the user's messages. **Selected**: the chosen segment in segmented controls.
- **Code**: code blocks, the deepest surface in the design.
- **Danger**: the same value as Ebru's night danger.

The logo keeps its teardrop rings and takes the night palette: gold outer ring, shore gap, mist ring, pale gold core.

**The Sodium Gold Rule.** Gold is light: it marks what you can act on, what is selected, and what an answer emphasises. Headings, body text, warnings and pure decoration never use it.

**The Always Night Rule.** Gece Boğazı has no light mode. It overrides both themes, and no surface switches to paper because the system or the user prefers light.

**The Same House Rule.** A design changes token values, faces and the signature only. Components read the shared tokens, including on-accent and the selection pair, instead of checking which design is active; Ebru falls back to white on madder and to its bubble colours for selection.

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

### Gece Boğazı
**Display Font:** Bodoni Moda (with Georgia)
**Body Font:** Manrope (with the system sans)
**Code Font:** JetBrains Mono, unchanged

**Character:** A high-contrast didone for the few words that name things, set against a calm geometric sans for everything read at length. Both load `latin-ext` and are not preloaded, because only signed-in users who chose this design need them.

The display face goes through one hook shared by both designs: in Ebru it inherits Atkinson Hyperlegible Next, in Gece Boğazı it becomes Bodoni Moda. It covers the brand name, the chat title in the header, the empty-chat greeting and dialog titles. Sizes follow Ebru's hierarchy; Body and Label keep Ebru's sizes, set in Manrope.

**The Size Not Weight Rule.** Bodoni speaks by size. It is always set at 500 with -0.01em tracking, never bold, and never used for body text, labels, buttons or numbers.

## Layout

A 288px sidebar and a centred 760px reading column. Below the `md` breakpoint (768px) the sidebar becomes a drawer. The composer sits at the bottom of the column on the ink band, which is 150px tall in a thread (164px on phones) and up to 300px in an empty chat. The scroll area reserves a stable gutter on both sides so the thread and composer stay aligned.

Gece Boğazı keeps this layout exactly. Its water band is 150px in a thread on desktop, as in Ebru, and 210px on phones so lights show above the full-width composer. The empty-chat band is shared.

The empty-chat greeting stands on its own in both designs, with no line of small text above it. For guests, the brand line is the heading of the about block; for signed-in users it is a visually hidden heading.

## Elevation & Depth

Flat by default, with depth from tone. Only floating things carry a shadow: dialogs, the jump-to-latest button, and the composer, which floats above the ink band.

### Shadow Vocabulary
- **Dialog** (`box-shadow: 0 18px 50px rgb(7 12 30 / 0.35)`): dialogs and sheets.
- **Float** (`box-shadow: 0 4px 14px rgb(7 12 30 / 0.25)`): the jump-to-latest button.
- **Composer, day** (`box-shadow: 0 10px 30px rgb(7 12 30 / 0.16), 0 1px 2px rgb(7 12 30 / 0.08)`): the Ebru composer in the light theme.
- **Composer, night** (`box-shadow: 0 14px 34px rgb(0 0 0 / 0.4)`): the Ebru composer in the dark theme.

### Gece Boğazı
Depth comes from light as well as tone. The workspace carries one soft glow rising from below the water (a radial gradient from #13254A through #0B1630 to the Night canvas), so the bottom of the screen reads as lit water and the top as sky. The composer is Surface at 94% opacity with a deeper shadow (`box-shadow: 0 18px 40px rgb(0 0 0 / 0.45)`); dialogs and the jump button use the shared shadows.

**The Floating Composer Rule.** In both designs the composer is the one floating object on the working screen: it sits above the band on an opaque or near-opaque surface and carries its own soft shadow. Nothing in the thread is lifted.

## Shapes

Full pills for controls, a 28px composer, 16px dialogs and 12px code blocks. The teardrop is the only ornamental shape, used for the logo.

Gece Boğazı uses the same shapes and radii, including the 12px code blocks; only the history marker changes, from an ink crop to a small round dot.

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

In Gece Boğazı the ink crop is replaced by a 7px dot: gold with a faint gold halo on the active chat, Line Strong on the others.

### Segmented controls
A pill track in Surface 2 with pill segments. The selected segment uses the shared selection tokens: indigo with paper text in Ebru, Selected with pale gold text in Gece Boğazı. Arrow keys skip locked options.

The "Tasarım" control in Settings shows three colour swatches per design, so you can see where you are going before you switch. For guests the Gece Boğazı segment shows a lock, and choosing it opens sign-in. While Gece Boğazı is active, the theme control in Settings and the theme toggle in the header are hidden.

### Model pill (Gece Boğazı)
The model selector in the header becomes a pill with a dark gold border, a faint gold wash and pale gold 600 text. In Ebru it stays a borderless text button.

### Gece Boğazı message surfaces
User bubbles are Bubble with a 1px hairline (#23305A). Code blocks keep the 12px radius but sit on Code with a Night Line border instead of Ebru's indigo. Bold words inside answers turn pale gold at 600.

### Locked features
Features that need sign-in stay visible with a lock icon. Choosing one opens the sign-in dialog, which lists what signing in adds.

### Voice bar
Pressing the microphone in the composer replaces the composer with a bar of the same shape while voice chat is on. It states what is happening in words, lets you interrupt the answer, and ends with one button or Escape. The spoken conversation stays readable as text above it, and the line below says that speech goes to OpenAI and that the voice is AI-generated.

### Limit notice
An indigo strip above the composer appears when three or fewer messages remain, and says when the limit renews or how to raise it.

### Ebru Plate
A full-bleed canvas behind the composer, fading into the page at its top edge. Drops displace existing ink while preserving area, and tine strokes comb it. It animates only while an answer streams, for as long as it streams, and is static under reduced motion.

### Bosphorus Water (Gece Boğazı)
The signature move of Design 2, in the same place as the Ebru plate: a full-bleed canvas behind the composer, fading into the night at its top edge.

- **Shoreline:** a faint horizon line near the top of the band (18% down on desktop; 6% on screens under 640px, so reflections show above the composer).
- **Lights:** each chat seeds its own set of up to 12 lights. The width is divided into 12 slots shuffled per chat, so lights spread along the shore instead of gathering behind the composer. A chat starts with three, and each settled answer lights one more. Phones always show at least six, so lights remain on both sides of the composer.
- **Reflection:** each light is a small bright point on the shore with broken horizontal strokes below it that widen with depth, plus a soft halo on the water. Most lights are gold; a few faint, distant ones are mist.
- **Motion:** while an answer streams, the strokes ripple at about 30 frames per second and the newest light fades in over 1.6s. Otherwise the water is still. Under reduced motion it is always still.

## Do's and Don'ts

### Do:
- **Do** keep the composer and its text on opaque surfaces whenever they sit above ink.
- **Do** say plainly that messages are sent to OpenAI.
- **Do** keep destructive actions apart from everything else, and offer undo.
- **Do** build every component against the shared tokens, so it works in both designs without checking which one is active.
- **Do** keep Gece Boğazı's one atmospheric gradient, the glow rising from under the water, behind the workspace only; it is the scene's light source.
- **Do** keep Gece Boğazı for signed-in users, and show it to guests as locked, with the reason.

### Don't:
- **Don't** use decorative gradients, sparkle icons, or gradient text.
- **Don't** add small uppercase labels above headings.
- **Don't** let the ink move when nothing is happening.
- **Don't** put text directly on ink.
- **Don't** give Gece Boğazı a light mode or let the theme setting change it.
- **Don't** use neon, cyan or electric accents in Gece Boğazı; the night is lit only by gold and mist.
- **Don't** set Bodoni Moda bold, or use it for body text, labels or buttons.
- **Don't** let the water move when no answer is streaming.
