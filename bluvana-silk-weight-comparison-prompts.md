# Bluvana Silk — "Most silk is thin" comparison prompts

The band has two panels. Panel A is thin silk, panel B is heavy silk. The whole
argument depends on the two panels being IDENTICAL except for the fabric. Same
body, same pose, same crop, same light. If they drift, it reads as two random
photos and the section dies.

## The method that makes them match

1. Generate PANEL A first.
2. Then generate PANEL B by uploading Panel A as a reference image with the
   Panel B prompt, which explicitly says to keep everything and change only the
   fabric weight.

Do not generate them independently and hope. They will not match.

Settings: 4:3 landscape (1536x1152 or similar), high quality. Transparent is
NOT needed here, these fill a rounded card.

---

# OPTION 1 — VIDEO, THE DROP TEST (recommended)

Two loops, side by side, playing in sync. Strongest version of this section.

## Panel A — thin silk

A locked off studio shot, camera does not move. A single piece of thin
lightweight silk fabric is held up at the top of frame by an unseen hand just
outside the frame, then released, and it falls to the surface below. The thin
silk catches air as it falls: it billows, flutters, drifts sideways, and takes
a long time to settle. It lands in a loose airy heap with lots of small
wrinkles that hold their shape.

Setting: a bare mid gray seamless backdrop, a plain flat surface at the bottom
of frame. Nothing else in the frame. No props, no furniture, no plants.
Light: one large soft source from the upper left at 45 degrees, so the sheen
travels across the fabric as it moves and the right side falls into soft shadow.
Camera: locked tripod, straight on, 50mm, chest height, no zoom, no push in,
no handheld movement.
Do not show: any person, face, hands, arms, skin, text, watermark, logo.
Length: 4 seconds, loopable, no cuts, no music, no titles.

## Panel B — heavy silk

Same shot, same camera, same backdrop, same light, same framing as the
reference. The ONLY change is the fabric. Now it is a heavy weight silk of the
same color and the same size. It does not catch air. When released it drops
fast and almost straight down, barely moving sideways, and settles immediately
into a few large soft folds with a smooth surface and no small wrinkles. The
sheen rolls across it in one broad highlight rather than breaking up.

Everything else identical: locked tripod, 50mm, chest height, mid gray
seamless, one soft key from the upper left at 45 degrees, 4 seconds, loopable,
no cuts, no music, no titles, no person, no hands, no text.

---

# OPTION 2 — STILLS, THE SHOULDER TEST

Fallback if you are not doing video. Crop shoulder to hip so there is no face
to render, which is where AI images fall apart.

## Panel A — thin silk

Editorial product detail photograph, cropped from the shoulder to the hip. No
head, no face in frame. A woman stands in a thin lightweight silk camisole.
The thin fabric CLINGS: it pulls tight across the body, it follows every
contour, it bunches into many small tight wrinkles at the waist and under the
arm, and the shine is broken and patchy rather than smooth. The strap digs in
slightly. The hem does not hang straight, it rides against the body.

Setting: plain mid gray seamless backdrop, nothing else in frame.
Light: one large soft source from the upper left at 45 degrees, gentle fill
from the right, soft shadow down the right side of the body.
Camera: straight on, chest height, 85mm, no tilt, no angle, shallow but not
blurry depth of field.
Realistic skin, natural pores, no retouching gloss, no beauty filter.
Do not show: face, head, hands, jewelry, text, watermark, logo, props.

## Panel B — heavy silk

Same body, same pose, same crop, same backdrop, same light, same camera as the
reference image. The ONLY change is the fabric weight. Now it is a heavy
weight silk camisole in the same color. The heavy fabric FALLS: it hangs away
from the body instead of gripping it, it skims the waist without bunching, it
forms a few large smooth folds instead of many small wrinkles, the hem hangs
straight and level, and the sheen rolls down the fabric in one long unbroken
highlight.

Everything else identical: same shoulder to hip crop, no face, no head, no
hands, plain mid gray seamless, one soft key from the upper left at 45 degrees,
85mm, chest height, straight on. No text, no watermark, no props.

---

# WHAT TO CHECK BEFORE YOU KEEP THEM

- Put A and B side by side. If the body, pose, crop or light differ at all,
  regenerate B from A again. This is the only thing that matters.
- Both must be the SAME COLOR. A color shift reads as "two different products"
  rather than "two different weights."
- Panel A must actually look worse. If the thin one looks good, there is no
  argument. Push the prompt harder on clinging, bunching, broken shine.
- No faces, no hands. They are the first thing that gives away an AI image.

# WHERE THEY GO

Theme editor > Silk home > Weight comparison
  "Typical silk photo"  = Panel A
  "Bluvana photo"       = Panel B

Panel A is tagged "Typical silk" in a pale chip, Panel B is tagged "Bluvana" in
a rouge chip. The line under the pair reads:
"Thin silk clings and snags. Heavy silk falls off the shoulder and stays there."
