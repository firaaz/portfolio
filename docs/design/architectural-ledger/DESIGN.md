```markdown
# Design System Document: The Architectural Ledger

## 1. Overview & Creative North Star

### Creative North Star: "The Architectural Ledger"
This design system moves away from the ephemeral "hacker" aesthetics common in AI and instead grounds itself in the permanence of architectural blueprints and high-end editorial magazines. It is built on the principle of **Monolithic Precision**. The experience should feel like a physical ledger—heavy, authoritative, and meticulously organized.

To break the "template" look, this system utilizes:
*   **Intentional Asymmetry:** Utilizing extreme white space and off-center typography to create a sense of bespoke curation.
*   **High-Contrast Scale:** Dramatically oversized serif headlines paired with diminutive, technical sans-serif labels.
*   **The Sharp Edge:** A strict 0px radius policy across all components to reinforce a sense of structural engineering and uncompromising accuracy.

---

## 2. Colors & Surface Logic

The palette is a study in tonal depth, using deep charcoals and crisp whites to establish a "paper and ink" relationship, punctuated by a singular, high-energy Electric Blue.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for defining sections or containers. Boundary definition must be achieved through:
1.  **Background Shifts:** Transitioning from `surface` (#131313) to `surface-container-low` (#1C1B1B).
2.  **Hard White Space:** Using large gaps in the layout to imply containment.
3.  **Tonal Steps:** Nesting a `surface-container-highest` (#353534) element within a `surface-container` (#201F1F) area.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, precision-cut plates.
*   **Base Level:** `surface` (#131313) is the primary canvas.
*   **Structural Sections:** Use `surface-container-low` for large content blocks.
*   **Interactive/Elevated Elements:** Use `surface-container-high` or `highest` for cards or navigation elements that require focus.

### The "Glass & Gradient" Rule
To prevent the high-contrast look from feeling "flat" or dated, use Glassmorphism for floating overlays (e.g., sticky headers). 
*   **Token Usage:** Combine `surface` at 70% opacity with a 20px `backdrop-blur`.
*   **Signature Textures:** For primary CTAs, use a subtle linear gradient from `primary_container` (#0055FF) to `on_secondary_fixed_variant` (#2B418D) at a 45-degree angle. This provides "soul" to the engineering precision.

---

## 3. Typography

The typographic system is a dialogue between the "Humanist Intellectual" (Newsreader) and the "Technical Precise" (Inter).

*   **Display & Headlines (Newsreader):** These are the "editorial" voice. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero statements. This font represents the engineer's vision and thought leadership.
*   **Body & Titles (Inter):** These represent the "data." Use `body-lg` (1rem) for project descriptions. Inter’s neutrality provides a high-legibility counterweight to the expressive serif.
*   **Labels & Metadata (Inter):** Use `label-sm` (0.6875rem) in uppercase with +0.1em letter-spacing for technical specs or AI model parameters. This conveys the feeling of a technical manual.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering** rather than structural shadows. 
*   **Nesting Example:** A `surface-container-lowest` card placed on a `surface-container-low` background creates a "sunken" or "carved" effect, reinforcing the architectural atmosphere.

### Ambient Shadows
Shadows should be rare. When a floating state is required (e.g., a modal or a primary menu):
*   **Blur:** 40px–60px.
*   **Opacity:** 8%–12%.
*   **Color:** Use a tinted shadow (#001551) rather than pure black to simulate the light cast by the Electric Blue accent.

### The "Ghost Border" Fallback
If contrast ratios or accessibility require a boundary, use a **Ghost Border**:
*   `outline-variant` (#434656) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary_container` (#0055FF) with `on_primary_container` (#E3E6FF) text. 0px radius. Heavy padding (16px 32px).
*   **Secondary:** Ghost style. No background, `outline` (#8D90A2) ghost border (15% opacity), text in `primary`.
*   **Tertiary:** Underlined Inter `title-sm` text. No container. The underline should be 2px thick and offset by 4px.

### Cards & Lists
*   **Rule:** Forbid divider lines. 
*   **Implementation:** Separate list items using a 16px vertical gap. On hover, change the background of the item to `surface-container-high`.
*   **Cards:** Use `surface-container-lowest` (#0E0E0E) for the card body to create a "recessed" look against the main background.

### Input Fields
*   **Style:** Minimalist underline only. Use `outline` (#8D90A2) for the bottom border (1px). 
*   **Focus State:** The border transforms into the `primary_container` (#0055FF) and increases to 2px thickness. No rounded corners.

### Signature Component: The "Data Chip"
*   For AI-related tags (e.g., "LLM Optimization", "Neural Architecture").
*   **Style:** `surface-container-highest` background, Inter `label-sm` text, uppercase, 0px radius. Use a 4px left-hand accent border of `primary_container`.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme vertical spacing (80px, 120px, 160px) to separate case studies.
*   **Do** let typography bleed off the edge of the grid in "Display" moments to enhance the editorial feel.
*   **Do** use `inverse_surface` (#E5E2E1) for high-impact callouts or "Dark-on-Light" sections to break the rhythm.

### Don't
*   **Don't** use any rounded corners (0px is the law).
*   **Don't** use "Hacker Green" or terminal-style fonts. We are aiming for the C-suite, not the basement.
*   **Don't** use drop shadows to indicate hierarchy; use color shifts between `surface-container` tiers.
*   **Don't** use center alignment for long-form body text. Keep it strictly left-aligned (architectural) or occasionally right-aligned for metadata.

---

## 7. Spacing Scale
The spacing must be aggressive and intentional.
*   **Tight (4px, 8px):** For related technical metadata.
*   **Medium (16px, 24px, 32px):** For internal component padding.
*   **Architectural (64px, 80px, 128px):** For section margins and "breathing room" between major editorial pieces.