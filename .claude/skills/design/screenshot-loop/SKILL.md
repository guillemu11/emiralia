---
name: screenshot-loop
description: Iterative design refinement using visual comparison and brand alignment.
---
# Screenshot Loop 🔄

This skill defines the workflow for high-fidelity UI implementation through iterative screenshot comparison and strict brand adherence.

## Pre-Iteration Step
- **Invoke the `ui-ux-pro-max` skill** before writing any frontend code, every session, no exceptions.
- **Reference Brand Guidelines**: Always prioritize the colors, typography, and tone defined in `.claude/rules/brand-guidelines.md`.

## Reference Image Policy
If a reference image is provided (e.g., `screen.png`):
- **Layout & Spacing**: Match the reference image exactly (proportions, alignment, margins).
- **Colors & Typography**: **STOP.** Do not use the hex codes or fonts from the image if they conflict with `brand-guidelines.md`. Use our brand tokens instead.
- **Content**: Use placeholder images (via `https://placehold.co/`) and generic copy.
- **Iteration**: Screenshot your output, compare against reference, fix mismatches, re-screenshot. Perform at least 2 comparison rounds.

## Local Server Workflow
- **Never screenshot a `file:///` URL.** Always serve from a local dev server.
- **Start the server**: Use `npm run website:dev` for the website app.
- **URL**: Typically `http://localhost:5175` (verify the port from the terminal output).

## Visual Analysis Workflow
1. **Capture**: Use the `browser_subagent` to navigate to the local URL and take a full-page screenshot.
2. **Read**: Load the captured screenshot and the reference image.
3. **Compare**: Be extremely specific in high-contrast analysis:
    - "Heading is 32px in my build, but reference layout suggests a more compact scale."
    - "Card shadow in my build is too sharp; use `shadow-sm` base / `shadow-xl` hover as per brand-guidelines."
    - "Button color is currently blue `#2563EB` as per brand, which is correct despite reference showing a different shade."
4. **Adjust**: Modify `HomePage.jsx` or `index.css` tokens.
5. **Verify**: Re-screenshot and analyze until no visible layout discrepancies remain.

## Airbnb-Style Guardrails (Strategic Alignment)
- **Colors**: Never use default Tailwind palettes. Use brand tokens per `brand-guidelines.md`: primary-action (`#2563EB`), primary-text (`#0F172A`), secondary-text (`#64748B`), backgrounds (`#FFFFFF` / `#F7F7F7`).
- **Canvas**: Background must be pure white (`#FFFFFF`) with section backgrounds in `#F7F7F7`.
- **Typography**: Inter for everything. Weights: 600 titles, 500 UI, 400 body. Line-height: `leading-relaxed`.
- **Shadows**: Use `shadow-sm` (base), `shadow-xl` (hover), `shadow-2xl` (hero/dark sections), `shadow-lg shadow-primary/20` (CTA glow).
- **Borders**: Generous rounding (`24px` to `32px` for main containers).
- **Depth**: Surface hierarchy (Base -> Elevated -> Floating). Use different z-planes for the floating search bar.

## Hard Rules
- **Do not "improve" layout** from the reference — match the layout, but apply brand aesthetics.
- **Do not stop after one pass.**
- **Do not use `transition-all`.** Use precise transitions for `transform` and `opacity`.
- **Match the layout exactly**, but **override branding** with Emiralia's brand guidelines.
