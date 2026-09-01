# AI Native Studio Operating Workspace

Foundation release for the INF 386 AI Native Studio operating model.

## Foundation scope

- Program dashboard with Cincinnati Museum Center and Fidelity Investments
- Shared project data model across both engagements
- Evidence-driven Discovery workspace
- Engagement Charter aligned to the operating workbook
- Gate 1 — Discovery Approved, with readiness calculated from required evidence
- Explicit local-draft persistence state plus JSON export/import
- Existing CMC `discovery.html` retained as a legacy meeting navigator

## Persistence note

GitHub Pages is static hosting, so this release does **not** label browser-local storage as shared persistence. `studio.js` isolates persistence behind a small store layer so a shared API (for example Google Apps Script or Cloudflare) can replace local storage in a follow-up patch without redesigning the interface.

## Entry point

Open `index.html`.
