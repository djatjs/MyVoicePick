# Main page design implementation

Goal: Make voice matching and song recommendations understandable on the first screen.

Scope: Home composition, its section components, home-only CSS, Korean navigation labels and document metadata. Reuse existing analysis and pricing routes; do not change upload, authentication or payment behavior.

Design: Retain slate and indigo. Use a left-aligned Korean headline beside a clearly marked, static example result. Use a voice waveform as the one distinctive visual. Remove the home marquee and animated dashboard. Keep process instructions, readable result explanations and a pricing link.

Checks: Run TypeScript, ESLint on changed files, production build and inspect desktop/mobile rendering if browser tools are available. Check primary links and section anchors. No new dependencies or business logic.
