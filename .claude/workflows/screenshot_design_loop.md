# Workflow: Design Iteration Loop (Screenshot-Based)

This workflow is designed for high-fidelity UI implementation by comparing current build screenshots with target designs.

## Actores
- **Frontend Agent** — Ejecutor principal. Implementa y ajusta la UI.

## Inputs
- Referencia visual (screenshot o mockup del diseño objetivo)
- Página o componente a implementar/iterar
- Brand guidelines (`.claude/rules/brand-guidelines.md`)

## Outputs
- UI implementada que coincide con la referencia visual y cumple brand guidelines
- Screenshots de verificación documentando la evolución

## Steps

1. **Deploy & Capture**:
    - Run the development server (`npm run dev`).
    - Use the `browser_subagent` to navigate to the page (e.g., `http://localhost:5173`).
    - Take a screenshot of the current implementation.

2. **Visual Comparison**:
    - Compare the captured screenshot with the target reference (e.g., `screen.png`).
    - Identify discrepancies in:
        - Typography (font-family, size, weight, line-height).
        - Color palette (backgrounds, CTAs, text contrast).
        - Spacing and Layout (margins, padding, alignment).
        - Effects (soft shadows, rounded corners, glassmorphism).

3. **Analysis & Iteration**:
    - Analyze the gaps found in step 2.
    - Reference the `brand-guidelines.md` and `ui-ux-pro-max` skill for token accuracy.
    - Modify the code (`HomePage.jsx`, `index.css`, etc.) to close the discrepancies.

4. **Repeat**:
    - Execute steps 1-3 until the design perfectly matches the target reference and adheres to brand guidelines.

## Best Practices
- **Design System First**: Ensure Design Tokens in `index.css` are synced before modifying components.
- **Micro-Interactions**: Use the loop to verify hover and transition states.
- **Responsive Check**: Repeat the loop at 375px, 768px, and 1440px.

## Edge Cases
- **Sin referencia visual**: Usar `ui-ux-pro-max` para generar Design System como referencia base.
- **Conflicto referencia vs brand**: Siempre priorizar `brand-guidelines.md` sobre los colores/fuentes de la referencia.
- **Puerto ocupado**: Verificar el puerto real en el output del terminal (puede variar de 5173/5175).
- **Tailwind JIT cache stale**: Reiniciar el servidor de desarrollo si las clases CSS no se aplican.
