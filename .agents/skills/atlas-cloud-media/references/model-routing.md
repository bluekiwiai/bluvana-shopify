# Live model routing

Atlas's catalog changes frequently. Treat the bundled names below as a routing map, not a permanent registry. Always run `models` and `schema` immediately before generation.

## Image routing

Prefer an OpenAI GPT Image route when the user asks for ChatGPT-style image generation, instruction-following edits, typography, product compositions, or multi-reference work. Current public families verified on 2026-08-14 include:

- `openai/gpt-image-2/text-to-image` and `openai/gpt-image-2/edit`
- `openai/gpt-image-2-developer/text-to-image` and `openai/gpt-image-2-developer/edit`
- `openai/gpt-image-1.5/text-to-image` and `openai/gpt-image-1.5/edit`
- `openai/gpt-image-1/text-to-image` and `openai/gpt-image-1/edit`
- `openai/gpt-image-1-mini/text-to-image` and `openai/gpt-image-1-mini/edit`

Search live metadata and compare current price, schema, and quality controls before choosing. Use an edit route whenever pixels must be preserved or references supplied. Use text-to-image only when no image input is needed.

For non-OpenAI requests, discover the current Seedream, Nano Banana, Flux, Qwen Image, Ideogram, Reve, or other image families and choose based on the user's needed capabilities—not brand familiarity.

## Video routing

List all live video entries with:

```sh
node scripts/atlas-media.mjs models --type video
```

Route by task before model family:

- text-to-video: no starting pixels are required;
- image-to-video: preserve a first frame and animate it;
- reference-to-video: preserve subjects, products, scenes, styles, video clips, or audio across a new generation;
- video-to-video/edit: transform existing footage;
- audio-to-video/avatar: drive speech, lip sync, singing, or performance from audio.

Compare current Seedance, Kling, Vidu, Veo/Gemini, Wan, Hailuo/MiniMax, Sora, Luma, PixVerse, Grok, and other client-visible families returned by the live catalog. Do not claim a family is available if no live entry matches.

## Seedance 2.5

“CNext 2.5” may be a transcription of **Seedance 2.5**, the name currently used by Atlas Cloud. On 2026-08-14 Atlas exposed these client-facing routes:

- `bytedance/seedance-2.5/text-to-video`
- `bytedance/seedance-2.5/image-to-video`
- `bytedance/seedance-2.5/reference-to-video`

Use text-to-video for a clean-slate shot, image-to-video for first-frame or first/last-frame control, and reference-to-video for multiple images/videos/audio, edits, or extension. Current schemas advertise native audio controls and outputs up to 30 seconds, but verify those values live because limits can change.

## Selection order

1. Required route and input modalities
2. Identity/product/reference preservation
3. Native audio or silent output
4. Aspect ratio, duration, resolution, and output format
5. Prompt adherence and motion needs
6. Current price and latency
7. Fallback model with compatible inputs

Never silently fall back. Explain what capability, quality, duration, audio, or price changes with the fallback and get approval before a second billable submission.
