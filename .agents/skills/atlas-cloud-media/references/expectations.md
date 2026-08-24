# Outputs, timing, and failures

## Normal lifecycle

Atlas media generation is asynchronous:

1. submit once;
2. retain the prediction ID;
3. poll `GET /api/v1/model/prediction/{id}`;
4. receive one or more temporary output URLs;
5. download desired files promptly.

Images often finish in tens of seconds. Videos often take one to several minutes and may take longer under load. The local script uses a bounded timeout and preserves the prediction ID if the task remains ambiguous.

## Costs

Model prices vary and can change. Read price data from the current model entry. A generation POST may be billable even if the local process later disconnects. Never repeat a POST because polling timed out.

## Common failures

- `401`: the execution process cannot see a valid key. Re-run configuration or fix environment scope without showing the key.
- `402`: insufficient Atlas balance. Top up the client's account.
- `422` or validation error: re-fetch the schema and remove or correct unsupported fields.
- `429`: rate limited. Wait before a new user-approved submission; safe GETs may back off automatically.
- `5xx` or provider capacity: retain the prediction ID if one exists. Do not assume the request was not accepted.
- moderation/refusal: revise only if the user's legitimate request can be stated more clearly. Do not evade provider policy.
- completed with no output URL: report the provider response and prediction ID; do not resubmit automatically.

## Quality review

Inspect image outputs for composition, product/identity drift, typography, anatomy, reflections, crop, and unwanted artifacts. Inspect video for first-frame fidelity, subject consistency, object deformation, motion physics, camera continuity, audio sync, loop/join quality, and final-frame usefulness. Recommend one targeted change at a time.
