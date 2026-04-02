# TAKDA — Design Guide

**For any AI model continuing development. Follow this exactly. Do not deviate.**

---

## The Vibe

TAKDA is a personal life operating system. It should feel like a **quiet, focused tool
built for deep work** — not a consumer app, not a productivity SaaS, not a dashboard.

The aesthetic is: **dark room, single lamp, nothing on the desk except what you need.**

Think: terminal meets notebook meets instrument panel. It is serious without being cold.
It is minimal without being empty. Every element earns its place.

**References to hold in your head:**

- Linear (the issue tracker) — how restraint creates trust
- Obsidian — how darkness makes content feel important
- A cockpit at night — how small colored signals guide without overwhelming

---

## Aesthetic Principles

### 1. Dark is the default. Always.

There is no light mode. The canvas is near-black `#0A0A0A`.
This is not a style choice — it is the product's identity.
Every screen, every modal, every component lives on dark.

### 2. Color is signal, not decoration

Only 5 colors exist in the app, each owned by exactly one module:

- **Track** `#7F77DD` — soft purple. Focus. Intention.
- **Annotate** `#1D9E75` — deep teal. Capture. Growth.
- **Knowledge** `#378ADD` — clear blue. Clarity. Depth.
- **Deliver** `#D85A30` — warm coral. Output. Action.
- **Automate** `#BA7517` — amber. Rhythm. Flow.

These colors appear as: active dots, badges, send buttons, icon tints,
underlines, borders on focused elements. Never as backgrounds.
Never mixed across modules. If you are in Knowledge, the accent is blue. Period.

### 3. Layers of dark, not shades of gray

The depth system uses 3 background levels:

```
#0A0A0A  — canvas (page background, always)
#141414  — surface (cards, sheets, modals)
#1A1A1A  — raised (inputs, inner containers, pressed states)
```

This is subtle. The difference between layers is felt, not seen.
Never use a color brighter than #2A2A2A for backgrounds.

### 4. Borders are whispers

All borders are `0.5px`. Not 1px. Not 2px. Half a pixel.
Border color: `#2A2A2A` (primary), `#222222` (secondary/deeper).
Module-colored borders use the accent color at 30-60% opacity: `color + '40'`.
Borders define space, they do not decorate it.

### 5. Typography is restrained

Two weights only: **400** (regular) and **500** (medium). Never bold (600+).

- Screen titles: 16px, weight 500, color `#F0F0F0`
- Body / content: 14px, weight 400, color `#F0F0F0`
- Secondary info: 13px, weight 400, color `#A0A0A0`
- Meta / labels: 11-12px, weight 600, color `#606060`, UPPERCASE, letterSpacing 1
- Hints / empty states: 13px, color `#606060`

Labels in tab bars, section headers, and badges are ALWAYS uppercase with letter-spacing.
Everything else is sentence case or natural case. No title case.

### 6. Icons only. No emojis. Ever.

All icons come from **Phosphor Icons** (`phosphor-react-native`).
Weight is always `"light"`. This gives icons an architectural, refined feel.
Never use emoji as decoration, as a space indicator, as a status signal — nowhere.
If you are tempted to use an emoji, use a Phosphor icon instead.

### 7. Spacing is generous at the edges, tight inside

- Screen horizontal padding: `20px`
- Screen top padding: `56px` (clears status bar)
- Gap between cards: `8-10px`
- Internal card padding: `12-14px`
- Gap between label and content: `8-12px`

Content breathes. Screens never feel cramped at the sides.

### 8. Radius is consistent

- Cards, modals, sheets: `borderRadius 12-14`
- Buttons, inputs, badges: `borderRadius 8-10`
- Pills, tags: `borderRadius 20`
- Avatars, dots: `borderRadius 50%` (circles)

---

## Color Reference

### Backgrounds

```
Primary canvas:    #0A0A0A
Card surface:      #141414
Input / raised:    #1A1A1A
```

### Text

```
Primary:           #F0F0F0  — main content
Secondary:         #A0A0A0  — supporting info
Tertiary:          #606060  — hints, placeholders, meta
```

### Borders

```
Primary:           #2A2A2A
Secondary:         #222222
```

### Module Accents

```
Track:             #7F77DD
Annotate:          #1D9E75
Knowledge:         #378ADD
Deliver:           #D85A30
Automate:          #BA7517
```

### Status Colors

```
Urgent:            #E24B4A
High priority:     #EF9F27
Low priority:      #639922
Success:           #1D9E75
Info:              #378ADD
```

### Using Accent Colors

When applying module colors to backgrounds or tints, use opacity variants:

```
Tint background:   color + '15'  (very subtle fill)
Hover / selected:  color + '20'
Border:            color + '30' to '40'
Active border:     color + '60'
Text on dark bg:   color directly (full opacity)
Button fill:       color directly (full opacity, white text)
```

---

## Component Patterns

### Cards

```
backgroundColor: '#141414'
borderRadius: 12-14
borderWidth: 0.5
borderColor: '#2A2A2A'
padding: 12-14
```

Cards never have shadows. Depth comes from the border.
On hover or active: bump borderColor to `#2A2A2A` → `#3A3A3A`.

### Input Fields

```
backgroundColor: '#1A1A1A'
borderRadius: 10
borderWidth: 0.5
borderColor: '#2A2A2A'
padding: 14
fontSize: 14
color: '#F0F0F0'
placeholderTextColor: '#606060'
```

On focus: borderColor becomes the module accent color at 60% opacity.

### Pill inputs (search, chat input):

```
borderRadius: 20
paddingHorizontal: 16
paddingVertical: 10
```

### Buttons

Primary action button (e.g. upload, send, create):

```
backgroundColor: moduleColor  (full opacity)
borderRadius: 10
padding: 14
color: '#FFFFFF'
fontSize: 14
fontWeight: '500'
```

Disabled state: `opacity: 0.4`. No color change.

Secondary / ghost button:

```
backgroundColor: '#141414'
borderWidth: 0.5
borderColor: '#2A2A2A'
borderRadius: 8-10
```

Send button (circle):

```
width: 36, height: 36
borderRadius: 18
backgroundColor: moduleColor
```

Icon inside: white `↑` arrow, fontSize 16.

### Tab Bars

```
fontSize: 11
fontWeight: '600'
letterSpacing: 1
textTransform: 'uppercase'
color inactive: '#606060'
color active: moduleColor
```

Active tab underline:

```
height: 1.5
backgroundColor: moduleColor
borderRadius: 1
position: absolute, bottom: 0
```

### Section Labels

```
fontSize: 12
color: '#606060'
letterSpacing: 1
textTransform: 'uppercase'
marginBottom: 8
```

### Badges / Pills

```
backgroundColor: moduleColor + '20'
borderRadius: 8
paddingHorizontal: 6
paddingVertical: 2
fontSize: 11
color: moduleColor
fontWeight: '500'
```

### Empty States

Centered vertically and horizontally:

```
Title: fontSize 15, fontWeight '500', color '#A0A0A0'
Hint:  fontSize 13, color '#606060', textAlign center, lineHeight 20
gap: 6-8
```

Never use icons or illustrations in empty states. Text only.

### Back Button

```
character: ‹  (not <, not ←)
fontSize: 28
color: '#A0A0A0'
lineHeight: 32
```

### Module Header (inside each module screen)

```
Row: flexDirection row, alignItems center, gap 8
Left dot: width 10, height 10, borderRadius 5, backgroundColor moduleColor
Title: fontSize 16, fontWeight '500', color '#F0F0F0'
Badge (doc count etc): moduleColor badge component
Right: + button (32x32, backgroundColor secondary, borderRadius 8)
paddingHorizontal: 20
paddingTop: 16
paddingBottom: 12
```

### Bottom Sheet / Modal

```
overlay: rgba(0,0,0,0.6)
sheet background: '#141414'
borderTopLeftRadius: 20
borderTopRightRadius: 20
handle: width 36, height 4, borderRadius 2, backgroundColor #2A2A2A
paddingBottom: 40 (safe area)
```

### AI Chat Bubbles

User message:

```
backgroundColor: moduleColor + '20'
borderRadius: 16, borderBottomRightRadius: 4
borderWidth: 0.5, borderColor: moduleColor + '40'
padding: 10
maxWidth: '78%'
color: moduleColor (text)
alignSelf: flex-end
```

AI message:

```
avatar: 24x24 circle, backgroundColor moduleColor+'20', border moduleColor+'40'
  inner dot: 8x8, backgroundColor moduleColor
bubble: backgroundColor '#141414', borderRadius 4/16/16/16
  borderWidth 0.5, borderColor '#2A2A2A'
  padding: 10
color: '#F0F0F0'
```

Citations below AI text:

```
backgroundColor: moduleColor + '15'
borderRadius: 4
paddingHorizontal: 6, paddingVertical: 3
fontSize: 11
color: moduleColor
prefix: ↗
```

Typing indicator: ActivityIndicator inside a bubble, color moduleColor.

---

## Navigation

### Home Screen

Space cards in a FlatList, full width.
Each card:

- SpaceIcon (Phosphor, weight light, size 44, iconSize 22) on left
- Space name (15px, weight 500) + subtitle (12px, tertiary)
- Border tinted with space color: `space.color + '30'`
- Arrow `›` on right (20px, tertiary)

Add space card at bottom: dashed border, centered `+ New space` text.

### SpaceScreen Header

```
paddingTop: 56
paddingHorizontal: 20
paddingBottom: 12
borderBottomWidth: 0.5
borderBottomColor: '#2A2A2A'
```

Left: ‹ back button. Center: SpaceIcon (32x32) + space name. Right: placeholder (36px).

### Compass Navigator

Fixed at bottom of screen, `position: absolute, bottom: 48`.
5 dots arranged in a compass: K top, T left, A right, D bottom, center dot.

Inactive dot:

```
width: 32, height: 32, borderRadius: 16
backgroundColor: '#141414'
borderWidth: 0.5, borderColor: '#2A2A2A'
label: fontSize 11, fontWeight 600, color '#606060', letterSpacing 1
```

Active dot: backgroundColor bumps to '#1A1A1A', borderColor '#3A3A3A',
label color becomes `#F0F0F0`.

Swipe gestures: left→Annotate, right→Track, up→Knowledge, down→Deliver.
Threshold: 60px translation.

---

## Tone & Motion

### Interactions

- `activeOpacity: 0.8` on all TouchableOpacity elements
- No scale transforms on press (keep it calm)
- Modal: `animationType="slide"` — bottom sheet slides up
- Screen transitions: default stack (slide from right)

### Timing

- Fast actions (opacity toggle): 180ms
- Dismissals: 220ms
- No bouncy spring animations — use `withTiming` or gentle `withSpring`

### Loading states

- Use `ActivityIndicator` in module accent color, size "small"
- Inline in buttons (replaces button text, same position)
- Centered in full screens while loading

---

## What TAKDA is NOT

- It is not a consumer fintech app (no neon greens, glows, gradients)
- It is not a social app (no avatars as primary UI, no feeds, no likes)
- It is not a corporate SaaS (no blue/white/gray, no rounded sans-serif logos)
- It is not a game (no animations for their own sake, no particles)
- It does not use emojis
- It does not use bold (600+) font weights
- It does not use colored backgrounds (except module accent tints)
- It does not use gradients anywhere
- It does not use shadows (except 0px focus rings on inputs)

---

## The One Rule

If you are unsure whether something fits TAKDA's design:

**Ask: does this belong in a quiet, dark room where someone is doing serious work?**

If yes — do it.
If no — remove it.
