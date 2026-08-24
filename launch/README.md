# INF 396 AI Native Studio Launch

This folder contains a standalone first-day launch experience for INF 396: AI Native Studio.

## Files
- `index.html` — student + instructor experience
- `styles.css` — presentation and mobile styles
- `app.js` — interaction, reveal, photo mode, demo mode, and optional live sync
- `config.js` — live aggregation configuration

## Current behavior
The experience is fully usable on one browser/device and includes a six-person demo mode. Local submissions persist in that browser.

For true multi-device classroom aggregation, set `apiBase` in `config.js` to an endpoint that supports:

### GET
`GET <apiBase>?room=fall-2026-launch`

Response:
```json
{"people":[{"name":"Aaron","answer":"..."}]}
```

### POST
`POST <apiBase>`

Body:
```json
{"room":"fall-2026-launch","person":{"name":"Aaron","answer":"...","createdAt":"..."}}
```

The host screen polls the endpoint every 2.5 seconds when `apiBase` is configured.

## Safety
This launch experience was added only under `/launch/`. Existing repository files are not modified.
