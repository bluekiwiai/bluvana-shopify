---
name: atlas-cloud-media
description: Generate, edit, and download images and videos through Atlas Cloud with a client-owned API key. Use when Codex or Claude Code needs Atlas Cloud image generation, GPT Image/OpenAI image models, text-to-video, image-to-video, reference-to-video, Seedance 2.5, Kling, Vidu, Veo, Wan, Hailuo, Sora, or any other video model available in Atlas Cloud; also use for live model discovery, model comparison, media upload, prompt adaptation, polling, and Atlas credential setup.
---

# Atlas Cloud Media

Generate media with the user's Atlas Cloud account. Never request that the user paste an API key into chat, place a key in a prompt, commit it, or store it inside this skill.

## First use

1. Read [references/setup.md](references/setup.md).
2. Direct the user to create an Atlas Cloud key at `https://www.atlascloud.ai/console/api-keys`.
3. Have the user run `node scripts/configure-key.mjs` in their own terminal. The script stores the key outside the skill directory with user-only permissions. An existing `ATLASCLOUD_API_KEY` environment variable takes precedence.
4. Verify access without spending credits:

   ```sh
   node scripts/atlas-media.mjs models --search "gpt image"
   node scripts/atlas-media.mjs models --type video --search "seedance 2.5"
   ```

## Core workflow

1. Translate the request into a short production brief: purpose, subject, setting, composition, motion, audio, format, aspect ratio, and constraints.
2. Read [references/model-routing.md](references/model-routing.md). Fetch the live catalog; do not rely on remembered model IDs, parameters, or prices.
3. Search current models. For every image or video model, require `display_console: true` and the correct Atlas type.
4. Inspect the selected model's live schema before building a payload:

   ```sh
   node scripts/atlas-media.mjs schema --model "EXACT_MODEL_ID"
   ```

5. Read [references/prompting.md](references/prompting.md), then adapt the brief to the chosen model and route. Use only fields present in the live schema.
6. Run a sanitized, non-billable preview first:

   ```sh
   node scripts/atlas-media.mjs generate --type image --model "EXACT_MODEL_ID" \
     --prompt "PROMPT" --params '{"size":"1024x1024"}' --dry-run
   ```

7. Show the user the exact model, route, important settings, and current price from live metadata. Obtain confirmation for the billable generation, then repeat with `--confirm` instead of `--dry-run`.
8. Poll the returned prediction. Download outputs when `--output-dir` is supplied. Inspect the files before presenting them; report visual defects or provider failures plainly.

## Commands

```sh
# Discover every currently available client-facing video model
node scripts/atlas-media.mjs models --type video

# Search current OpenAI image routes
node scripts/atlas-media.mjs models --type image --search "openai gpt image"

# Inspect exact parameters, required fields, enum values, and price
node scripts/atlas-media.mjs schema --model "openai/gpt-image-2/text-to-image"

# Generate an image after a dry run and user confirmation
node scripts/atlas-media.mjs generate --type image \
  --model "openai/gpt-image-2/text-to-image" \
  --prompt "A premium studio product photograph..." \
  --params '{"quality":"medium","size":"1024x1536","output_format":"png"}' \
  --output-dir ./atlas-outputs --confirm

# Edit with local reference files; repeat --input for arrays
node scripts/atlas-media.mjs generate --type image \
  --model "EXACT_EDIT_MODEL_ID" --prompt "Keep the product unchanged; replace only..." \
  --input images=./product-front.png --input images=./brand-reference.png \
  --params '{"quality":"medium","output_format":"png"}' \
  --output-dir ./atlas-outputs --confirm

# Seedance 2.5 image-to-video example; verify the live schema first
node scripts/atlas-media.mjs generate --type video \
  --model "bytedance/seedance-2.5/image-to-video" \
  --input image=./hero-frame.png \
  --prompt "A slow push-in as soft window light moves across the product..." \
  --params '{"duration":5,"resolution":"720p","generate_audio":true,"output_format":"mp4"}' \
  --output-dir ./atlas-outputs --confirm
```

Use `--prompt-file PATH` instead of `--prompt` for long prompts. Use repeated `--param key=value` flags instead of `--params JSON` when convenient. Use `--no-wait` to submit and return the prediction ID without polling.

For local inputs, `--input FIELD=PATH` uploads each file to Atlas Cloud and inserts the returned temporary URL into that schema field. Repeat the same field for array inputs such as `images` or `reference_images`. Never upload unrelated files or use Atlas as permanent hosting.

## Non-negotiable safeguards

- Fetch `https://api.atlascloud.ai/api/v1/models` in the current session and fetch the chosen entry's `schema` URL before every generation.
- Never invent a model ID, field name, enum, limit, price, or capability.
- Never expose credentials in output, command arguments, logs, manifests, or committed files.
- Treat generation POSTs as billable and non-idempotent. Never automatically retry a submission. Retry only safe GET requests.
- Do not submit without explicit user confirmation. The bundled script enforces `--confirm`.
- Use only media the user owns or is authorized to process. Keep identity references distinct from style or scene references.
- Preserve prediction IDs when a poll times out. Do not resubmit an ambiguous task.
- Generated URLs may expire. Download wanted outputs promptly.

## Expected behavior

Image jobs commonly take tens of seconds; video jobs commonly take several minutes. Atlas returns a prediction ID first, then one or more output URLs after polling. A task can fail because of invalid parameters, insufficient balance, rate limits, model capacity, moderation, or provider errors. Read [references/expectations.md](references/expectations.md) before diagnosing failures.
