# Prompting Atlas media models

Write prompts as production directions, not keyword piles. Keep the invariant creative brief separate from model-specific fields so the same intent can move between models.

## Image prompt

Use this order:

1. deliverable and subject;
2. exact observable action or arrangement;
3. setting and background geometry;
4. composition, framing, and camera relationship;
5. motivated lighting and color;
6. materials, texture, and finish;
7. brand-specific constraints;
8. text that must appear, quoted exactly;
9. elements that must remain unchanged in an edit.

Example:

> Premium vertical product photograph of a matte-black insulated bottle centered on a pale limestone plinth. Camera at label height, 70 mm product-photography perspective, three-quarter front view, full bottle visible with generous negative space above. Soft morning window light from camera-left creates a narrow rim highlight; warm gray seamless background. Preserve the supplied bottle geometry, cap, logo placement, and label colors exactly. Replace only the setting. No additional copy or props.

For edits, explicitly separate **preserve** and **change** instructions. Do not ask the model to recreate pixels that should remain untouched.

## Video prompt

Describe one shot as:

`subject + action + environment + camera + timing + lighting + audio + end state`

Example:

> The bottle remains upright on the limestone plinth. Over five seconds, condensation gathers while the camera makes a slow 15-degree push-in from a locked label-height angle. Morning light slides softly from left to right; the logo stays sharp and unchanged. Quiet room tone with one subtle glass clink, no music, no speech. End on a clean centered hero frame with the full cap and base visible.

Use observable motion. Replace vague words such as “dynamic” with direction, speed, path, and duration. State what must stay fixed while something else moves. Define the final frame so generated clips can chain cleanly.

## Seedance 2.5 adaptation

- Choose the route first: text, first-frame, first/last-frame, multimodal reference, edit, or extend.
- Assign each reference a single role: identity/product, first frame, last frame, scene, style, motion, source video, voice, music, or sound effect.
- Keep timing explicit when several beats occur: `0–2s`, `2–4s`, `4–5s`.
- For native audio, name speech, ambience, effects, music, and deliberate silence separately. Quote exact dialogue.
- For extension, describe continuity at the join and the new ending. Do not repeat events already present in the source clip.
- For edits, state the targeted delta and list what must remain unchanged.

## Cross-model transition

When changing models:

1. Preserve the model-neutral shot spec.
2. Fetch the replacement model schema.
3. Map only supported controls.
4. Move unsupported fields into prose only when the model can reasonably follow them.
5. Report every degraded or changed capability before submitting.

Never copy parameter names between families. One model may use `ratio`, another `aspect_ratio`; one may use `image`, another `image_url` or `images`.

## Client preferences (Kyle)

- Spoken dialogue and on-screen text for generated videos default to **Spanish** (LatAm-neutral). Write quoted dialogue in Spanish unless the user explicitly asks for English. (Set 2026-08-18; earlier English videos are exceptions, kept as-is.)
- Product reference images must show the **closed, solid product housing** — never cutaway/opened renders. If only cutaway renders exist, edit one closed first (see the shower-filter workflow: edit cutaway render to solid chrome, then use as the video reference).
