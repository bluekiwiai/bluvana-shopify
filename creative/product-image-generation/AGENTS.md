# Bluvana product-image generation

- `pose-transfers/` contains reusable prompt assets, organized by the visual reference set they were written against.
- Match each prompt to the same-numbered reference image from the same set. Pose numbers are not interchangeable across sets.
- Treat pose-reference images as body-geometry references only. Preserve the target image's identity, garment, product construction, accessories, scene, lighting, and visual style.
- Do not infer or invent a color label for the original reference set; its source was unlabeled.
- Do not silently rewrite prompt meaning, loosen preservation rules, or remove anatomy safeguards.
- The source pose images are not currently in the repository. If a task needs them and they have not been attached, ask the user to provide the matching references.
- Generating or editing images is a separate action from maintaining this prompt library. Do not generate images unless the user requests generation.
