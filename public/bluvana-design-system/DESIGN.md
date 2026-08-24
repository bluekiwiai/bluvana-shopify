---
name: Bluvana
description: Better products for small bathrooms.
colors:
  ocean-blue: "#1f5661"
  deep-tile-green: "#294536"
  sun-gold: "#e6b864"
  mineral-ivory: "#f5f0e5"
  paper: "#fcfaf5"
  ink: "#18231c"
  muted-ink: "#5d665e"
typography:
  display:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "clamp(3.25rem, 7vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  utility:
    fontFamily: "Archivo, Helvetica, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  edit-focus: "4px"
  control: "9px"
  surface: "12px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "72px"
components:
  button-primary:
    backgroundColor: "{colors.sun-gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "50px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.mineral-ivory}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "42px"
---

# Design System: Bluvana

## Overview

**Creative North Star: "The Bath Cabinet"**

Bluvana makes small bathrooms easier to use and better to look at. Its visual world combines deep ocean color, dark tile, walnut and close lifestyle photography.

It rejects generic spa imagery and bathroom technology clichés. Color owns full regions. Materials and small room constraints stay visible.

**Key Characteristics:**

- Muted ocean color balanced by mineral neutrals.
- Editorial display type with short utility text.
- Candid use images beside repeatable product photography.
- Tile, walnut, warm grain and directional shadow.
- Small bathroom proof in every product story.
- A soft connected shape used as the brand mark.

## Colors

This is a three color system inspired by 1970s photography.

### Primary

- **Ocean Blue:** Owns the largest brand fields and packaging.
- **Deep Tile Green:** Grounds navigation and room context.

### Secondary

- **Sun Gold:** Marks primary actions, focus, and small high-visibility moments.

### Neutral

- **Mineral Ivory:** Warm section background that avoids sterile white.
- **Paper:** The lightest reading and catalog surface.
- **Ink:** Primary text and highest-contrast controls.
- **Muted Ink:** Supporting copy on light surfaces.

**The Architectural Field Rule.** Blue and green own full regions. Gold stays limited to actions and small details.

**The Sun Is Rare Rule.** Gold is most effective on calls to action, focus, and small details; its contrast comes from limited use.

## Typography

**Display Font:** Bodoni Moda (with Georgia fallback)

**Body Font:** Archivo (with Helvetica fallback)

**Character:** Bodoni Moda adds personality. Archivo keeps shopping language easy to scan.

### Hierarchy

- **Display** (500, fluid 52 to 96px, 0.95): Hero statements and section headings.
- **Title** (500, 30 to 50px, 1.05): Product benefits and calls to action.
- **Body** (400, 16 to 20px, 1.5 to 1.55): Short product guidance.
- **Utility** (700, 11 to 12px, 0.08em, uppercase): Navigation, dimensions and filters.

**The Contrast Is the Identity Rule.** Never set an entire experience in the display face. Editorial language leads; utility language explains and enables action.

**The No Eyebrow Rule.** Headings stand on their own. Never add a small label above a heading.

**The Scan First Rule.** Cut copy until the benefit is clear at a glance. Lead with what gets easier, cleaner or better. Product pages are not articles.

**The Protected Type Rule.** Display phrases use only deliberate line breaks. Type scales with its container before a phrase wraps. Organic marks stay in reserved zones or over photography and never overlap copy.

## Layout

The desktop design uses a 255px sticky cabinet rail beside a fluid reading surface. Major sections are full-width color or material fields with generous vertical spacing. Within a section, asymmetrical two-column compositions place a large idea beside supporting rules or imagery.

At 980px the rail becomes a horizontal sticky navigation bar and two-column sections stack. At 660px, swatches and catalog samples become single-column, while photography stays large and immersive. Mobile does not reduce image scale or expressive typography merely to fit more content.

**The Room Edge Rule.** Photography keeps grout lines, mirrors, counters and nearby objects visible when scale matters.

## Elevation & Depth

Most surfaces remain flat and are separated by tonal fields or hairline dividers. Depth appears only where physical logic calls for it: product grounding shadows, the floating toast, and subtle image scale on hover. The product placeholder uses a soft offset shadow (`20px 28px 34px rgba(24,35,28,.22)`) to feel placed on a shelf rather than pasted into a scene.

**The Physical Shadow Rule.** A shadow must describe an object sitting above a surface. Do not add ambient glow around flat reading sections.

## Shapes

The system pairs tile grids and rectangular image crops with gently curved controls. The soft connected Bluvana mark appears across large fields and photography. It should feel fluid and feminine, never like an icon in a card.

## Logo

The full wordmark is the primary logo. Use the monogram only where the full name cannot fit comfortably.

- Use light artwork on Ocean Blue, Deep Tile Green, Ink and photography dark enough for clear contrast.
- Use dark artwork on Mineral Ivory, Paper and other light surfaces.
- Keep the artwork proportional with clear space around every edge.
- Never recolor, stretch, crop or separate the internal wave layers.

## Components

### Buttons

- **Shape:** Gently curved rectangle (9px radius).
- **Primary:** Sun Gold with Ink text, 50px high, bold Archivo label.
- **Hover / Focus:** Hover gains a small tonal shift; keyboard focus uses a 3px Sun Gold outline offset by 4px.
- **Ghost:** Transparent with a low-contrast Mineral Ivory border on dark fields.

### Chips

- **Style:** Compact pill reserved for photo treatment and filtering controls.
- **State:** Active chips invert to Ink with white text. Inactive chips remain transparent with a hairline border.

### Cards / Containers

- **Corner Style:** Usually square. Containers follow page geometry rather than becoming repeated rounded cards.
- **Background:** Tonal fields from the palette or Paper.
- **Shadow Strategy:** Flat by default; use depth only for physically elevated objects.
- **Border:** A single hairline divider is preferred to a border-plus-shadow combination.

### Navigation

The desktop cabinet rail uses small, bold labels and a Sun Gold active state. On mobile it becomes a horizontally scrollable sticky strip. The brand wordmark remains visible at every size.

### Editable Swatch

Each color occupies a large architectural field with its name, role, exact hex, and a native color input. Editing updates CSS custom properties immediately and persists locally in the browser.

## Do's and Don'ts

### Do

- **Do** let one or two palette colors own whole regions.
- **Do** show small bathroom constraints and the product solving them.
- **Do** preserve tile, stone, wood, water, textile, skin, and directional shadow.
- **Do** mix standardized 4:5 product heroes with candid use and material imagery.
- **Do** keep enough real context for scale and fit to read immediately.

### Don't

- **Don't** default to generic white marble spa imagery.
- **Don't** use water splashes, blue glows, or scientific diagrams as bathroom-product shorthand.
- **Don't** hide a product under decorative props or aggressive depth of field.
- **Don't** retouch finishes so heavily that product color becomes inaccurate.
- **Don't** make every section or rule a same-size rounded card.
- **Don't** add eyebrows above headings.
- **Don't** use long copy when one benefit line will do.
- **Don't** use em dashes or hyphens in customer facing copy.
