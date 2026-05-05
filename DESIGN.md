---
version: 1.0
name: MyVoicePick (Original Identity)
description: A high-fidelity "Studio Canvas" design that blends the logic of professional audio software with the emotional depth of music streaming. Set against a deep slate background, the interface uses Indigo and Violet gradients to symbolize vocal intelligence, with glassmorphism effects providing depth and premium tactility. Brand energy is expressed through neon accents and high-contrast typography.
---

## 1. Visual Theme & Atmosphere

MyVoicePick's visual identity is centered around the concept of "Vocal DNA" — the invisible made visible through data and light. Unlike the flat "ink-on-paper" look of Airtable or the "pure darkness" of Spotify, MyVoicePick uses a **layered slate palette** combined with **luminous indigo gradients**. This creates a "Tech-Noir Studio" environment that feels both advanced and human.

**Key Characteristics:**
- **Studio Canvas**: Deep Slate (`#0F172A`) base with subtle radial glow gradients.
- **Vocal Gradients**: Indigo to Violet transitions for primary actions and highlights.
- **Glassmorphism**: Semi-transparent surfaces (`rgba(30, 41, 59, 0.7)`) with backdrop blur for a layered, high-end feel.
- **Neon Accents**: High-saturation icons and status bars (Pink, Emerald, Amber) that pop against the dark canvas.
- **Precision Typography**: Tight, heavy headings paired with clean, readable body text.

## 2. Color Palette & Roles

### Primary Brand
- **Vocal Indigo** (`#6366f1`): Primary brand color, used for CTA backgrounds and key accents.
- **Electric Violet** (`#8b5cf6`): Secondary brand color, used in gradients to add depth.
- **Deep Slate** (`#0f172a`): Main background (Base Level 0).
- **Studio Slate** (`#1e293b`): Surface color for cards and panels (Level 1).

### Secondary & Accents
- **Pulse Pink** (`#ec4899`): Energy, emotion, and "power" stats.
- **Sky Blue** (`#38bdf8`): Clarity, rhythm, and info states.
- **Emerald Pulse** (`#10b981`): Success, precision, and stability.
- **Amber Glow** (`#f59e0b`): Warning, warmth, and highlights.

### Text & Neutral
- **Slate 50** (`#f8fafc`): Main text, maximum readability.
- **Slate 400** (`#94a3b8`): Subtitles, muted labels, secondary info.
- **Glass Border** (`rgba(255, 255, 255, 0.1)`): Subtle borders for cards and buttons.

## 3. Typography System

### Font Families
- **Display/Title**: `Inter` — Chosen for its geometric precision and modern weight.
- **Body/UI**: `Pretendard` — Chosen for its exceptional CJK (Korean) readability and clean lines.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Inter | 64px–96px | 800 | 1.1 | -0.04em | Hero headings, tight & heavy |
| Title LG | Inter | 32px–48px | 700 | 1.2 | -0.02em | Section titles |
| Title MD | Inter | 20px–24px | 700 | 1.3 | -0.01em | Card titles |
| Body | Pretendard | 16px | 400 | 1.6 | 0 | Standard text |
| Muted | Pretendard | 14px | 400 | 1.5 | 0 | Subtext, captions |
| Button | Pretendard | 16px | 700 | 1.0 | 0 | Centered action text |

## 4. Geometry & Spacing

### Border Radius
- **SM (8px)**: Small tags, pills, mini-cards.
- **MD (16px)**: Primary buttons, standard cards, tool headers.
- **LG (24px)**: Major sections, hero image containers, glass panels.

### Spacing
- **Base Unit**: 8px
- **Section Padding**: 120px (Vertical)
- **Container Max-Width**: 1200px

## 5. Component Logic

### Glass Card
- **Background**: `rgba(30, 41, 59, 0.7)`
- **Blur**: `12px` backdrop-filter
- **Border**: `1px solid rgba(255, 255, 255, 0.1)`
- **Shadow**: `0 8px 32px rgba(0, 0, 0, 0.4)`

### Primary Button
- **Background**: `linear-gradient(135deg, #6366f1, #8b5cf6)`
- **Shadow**: `0 4px 14px rgba(99, 102, 241, 0.4)`
- **Hover**: `translateY(-2px)`, scale up shadow, increase brightness.

### Stat Bars
- **Track**: `rgba(255, 255, 255, 0.05)` background.
- **Fill**: High-saturation accent colors with a subtle `box-shadow` glow of the same color.
- **Height**: 6px for a sleek, modern look.

## 6. Layout Principles

1. **Center of Gravity**: Hero sections should feel heavy and centered to establish authority.
2. **Radial Focus**: Use radial gradients behind main UI elements to draw the eye.
3. **Information Density**: Balance Airtable's clarity with Spotify's visual richness. Use white space between major functional blocks.
4. **Interactive Feedback**: Every action (hover, click) should have a luminous feedback (glow increase or scale change).
