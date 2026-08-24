# Bluvana Silk — Veo prompts for the scroll scrubbed 360 turn

Goal: a model turning 360 degrees, outfit changing across three looks, driven
by page scroll. Scroll down turns her forward, scroll up turns her back.

Run PROMPT B three times (recommended). Run PROMPT A only if you want to try a
single take. Veo clips cap around 8 seconds, so one take gives each outfit
about 2.6 seconds and roughly 30 usable frames; three clips give each outfit
the full 8 seconds and no wardrobe swap for the model to get wrong.

Aspect ratio: 9:16 portrait. Same starting frame for every run.

---

## PROMPT A — one take, all three outfits

Upload: starting frame + reference outfit 2 + reference outfit 3

A single continuous locked off shot. No cuts.

SUBJECT
The woman from the uploaded starting frame. Keep her exact face, hair, skin
and body throughout. Same person, unchanged, for the entire shot.

ACTION
She stands centered, squared to camera, arms relaxed at her sides. She turns
slowly and smoothly to her left, rotating in place on the spot, at one even
constant speed. She completes exactly three full rotations and stops squared
to camera in the same pose she began in, arms relaxed.

WARDROBE
Her outfit changes at the exact moment her back is fully turned to camera.
Rotation one: the outfit from the starting frame.
Rotation two: the outfit in reference image 2.
Rotation three: the outfit in reference image 3.
Each change happens in a single frame while she faces away. No fade, no morph,
no sparkle, no visual effect. Reproduce each reference outfit exactly: same
color, same cut, same trim, same lace, same hem, same length.

CAMERA
Locked on a tripod. No pan, no tilt, no push in, no pull out, no handheld
drift, no zoom, no rack focus. 50mm lens, chest height, straight on. The frame
never moves for the entire shot.

FRAMING
Full body. Consistent headroom above her hair and floor visible below her feet
at all times. She rotates on the spot and never steps toward or away from
camera, so she stays exactly the same size in frame from first frame to last.

SETTING AND LIGHT
Identical to the starting frame throughout. Same room, same wall, same floor,
same light direction and intensity. Nothing in the background moves or changes.

STYLE
Photoreal fashion film. Natural human motion. The silk catches light and
shifts as she turns.

DO NOT
Cut, crossfade, dissolve, zoom, move the camera, change the background, change
her face or hair, crop her head or feet, add text, add captions, add lens
flare, add slow motion ramps, add any transition effect.

---

## PROMPT B — one outfit per clip (recommended, run three times)

Upload: starting frame. Swap the OUTFIT line each run.

A single continuous locked off shot. No cuts.

SUBJECT
The woman from the uploaded starting frame. Keep her exact face, hair, skin
and body throughout.

OUTFIT
She wears [DESCRIBE THE OUTFIT, or: the outfit in the uploaded reference
image]. Reproduce it exactly: same color, same cut, same trim, same lace,
same hem, same length. Do not restyle it.

ACTION
She begins standing centered and squared to camera, arms relaxed at her sides.
She turns slowly and smoothly to her left, rotating in place on the spot, at
one even constant speed, through exactly one full 360 degree rotation. She
finishes squared to camera in the identical pose she began in, arms relaxed at
her sides. The first frame and the last frame must match.

CAMERA
Locked on a tripod. No pan, no tilt, no push in, no pull out, no handheld
drift, no zoom. 50mm lens, chest height, straight on. The frame never moves.

FRAMING
Full body. Consistent headroom above her hair and floor visible below her feet
at all times. She rotates on the spot and never steps toward or away from
camera, so her size in frame never changes.

SETTING AND LIGHT
Identical to the starting frame throughout. Same room, same wall, same floor,
same light direction and intensity. Nothing in the background moves.

STYLE
Photoreal fashion film. Natural human motion. The silk catches light and
shifts as she turns.

DO NOT
Cut, crossfade, zoom, move the camera, change the background, change her face
or hair, crop her head or feet, add text, add captions, add lens flare, add
slow motion, add any transition effect.

---

## The two lines that matter most

- Locked camera.
- Rotates on the spot, never steps toward or away from camera.

A scroll scrubber stacks frames on top of each other. If the camera drifts, or
she moves closer to the lens, the sequence wobbles as you scroll and the whole
effect falls apart. Everything else in the prompt is polish.

## Check before keeping a take

- First frame and last frame should be nearly identical. That is what lets the
  three clips concatenate invisibly and lets the whole thing loop.
- Her size in frame should not change from start to finish.
- Feet and head in frame the whole way round.
- Background must not shift.

## Turning the clips into frames

    # clips.txt
    # file 'turn-1.mp4'
    # file 'turn-2.mp4'
    # file 'turn-3.mp4'

    ffmpeg -f concat -safe 0 -i clips.txt -c copy turn.mp4
    ffmpeg -i turn.mp4 -vf "fps=12,scale=900:-2" -q:v 80 frames/f_%03d.webp

About 90 frames at 900px wide lands near 2.5MB total, which is shippable when
lazy loaded. Do not fetch a frame until the section is one viewport away.
