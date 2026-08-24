# Product-image pose-transfer library

Reusable pose-only prompt sets for Bluvana product-image generation. Each document maps six numbered pose-reference images to six detailed transfer prompts.

## Reference sets

| Set | File | Pose range |
| --- | --- | --- |
| Original reference set | `original-reference-set.md` | Poses 1–6 |
| Pink satin reference set | `pink-satin-reference-set.md` | Poses 1–6 |
| Purple satin reference set | `purple-satin-reference-set.md` | Poses 1–6 |
| Red satin reference set | `red-satin-reference-set.md` | Poses 1–6 |

“Original reference set” is intentional: its source document did not identify a garment color, so no color label has been inferred.

## How to use a transfer

1. Choose one set and one numbered pose.
2. Attach the matching numbered pose-reference image from that same set.
3. Attach the target product image whose model, garment, product details, scene, and visual identity should be retained.
4. Use the matching prompt from the set document.
5. Append the set's universal pose-lock reinforcement only if the generator begins copying appearance or scenery from the reference.
6. Append its anatomy reinforcement only when hands, limbs, or joints need extra control.

The numbered reference images themselves are not currently stored in this repository. Do not substitute an image from a different set merely because it has the same pose number.

## Core rule

The pose reference supplies body geometry and body language only. The target image remains the source of identity, face, hair, body appearance, garment, product construction, accessories, setting, lighting, camera treatment, texture, and color.
