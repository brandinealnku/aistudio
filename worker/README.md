# INF 396 Launch Worker

Cloudflare Worker + Durable Object backend for the `/launch/` classroom experience.

## What it does

- Stores one shared set of student signals per room.
- Accepts student submissions from separate phones.
- Returns the room state for the instructor display.
- Supports a protected room reset using a Cloudflare secret.
- Keeps the GitHub Pages front end and Cloudflare backend separate.

## Deploy

From the repository root:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put RESET_TOKEN
npm run deploy
```

When prompted for `RESET_TOKEN`, choose a host-only phrase/password. Do not add it to this repository or `launch/config.js`.

Wrangler will print the deployed Worker URL, for example:

```text
https://inf396-ai-native-studio-launch.<your-workers-subdomain>.workers.dev
```

Paste that URL into `launch/config.js` as `apiBase` and publish the launch files.

## Test the backend

```bash
curl https://YOUR-WORKER.workers.dev/health
```

Expected response:

```json
{"ok":true,"service":"inf396-launch"}
```

Room state:

```bash
curl "https://YOUR-WORKER.workers.dev/?room=fall-2026-launch"
```

## CORS

`wrangler.jsonc` currently allows the GitHub Pages origin:

```text
https://brandinealnku.github.io
```

If the launch experience later moves to another domain, add that origin to `ALLOWED_ORIGINS` as a comma-separated value.

## API

### GET `/?room=<room>`
Returns the current room state.

### POST `/?room=<room>`
Accepts:

```json
{
  "room":"fall-2026-launch",
  "person":{
    "id":"browser-generated-uuid",
    "name":"Student name",
    "answer":"Student signal",
    "createdAt":"2026-08-25T13:00:00.000Z"
  }
}
```

### DELETE `/?room=<room>`
Requires the host-only token in the `X-Reset-Token` header.
