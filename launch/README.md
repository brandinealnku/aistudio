# INF 396 AI Native Studio Launch

This folder contains the standalone first-day launch experience for INF 396: AI Native Studio.

## Files
- `index.html` — student + instructor experience
- `styles.css` — presentation and mobile styles
- `app.js` — interaction, reveal, photo mode, demo mode, and live sync
- `config.js` — room and backend endpoint configuration

## Live classroom behavior

The Cloudflare backend lives in `/worker/` and uses a Durable Object so separate student phones share one consistent room state.

When `apiBase` is configured, the experience:
- POSTs each student response to the Worker
- polls the Worker every second from the instructor display
- supports students with duplicate first names by assigning each browser a UUID
- allows the host to clear the room with a protected reset token

If `apiBase` is blank, the page falls back to local/demo mode.

## Connect the deployed Worker

After deploying `/worker/`, update `config.js`:

```js
window.AI_STUDIO_LAUNCH_CONFIG = {
  apiBase: "https://inf396-ai-native-studio-launch.YOUR-SUBDOMAIN.workers.dev",
  maxSignals: 6,
  room: "fall-2026-launch"
};
```

The reset token is never stored here. The host enters it only when using Reset on the instructor display.

## Safety

All launch-specific work remains under `/launch/` and `/worker/`. The existing `discovery.html` experience is not changed.
