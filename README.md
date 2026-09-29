# 🌤️ Weather

An everyday, low-effort mood log and journal. One tap names how you feel; writing is always optional.
The name is the idea: a mood is **weather** ("it's rough right now"), never a permanent label.

This repository holds the **web app prototype** (`web/`), built from the approved design screens to
review with the psychologist. The physical gadget (ESP32 firmware) will live in `firmware/` later.

## Try it

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Open it on a phone, or in a desktop browser (it shows inside a phone-sized frame). On a phone you can
"Add to Home Screen" to use it like an app.

To show the History screen with some content, go to **Settings → Add sample entries (for demos)**.

### Hosting it for the demo (GitHub Pages)

The `Web app` workflow lints, tests and builds on every push. It also deploys the app to GitHub Pages
from the default branch once Pages is switched on:
**Settings → Pages → Build and deployment → Source: GitHub Actions**, then re-run the workflow.
The app will be at `https://guilnunes.github.io/Weather/`.

## What the prototype does

| Screen | What happens |
| --- | --- |
| **Home** (designed) | Seven colour bands. **One tap logs the mood** and opens its journal entry. The mood that is still "in the air" shows a small *now · until 17:54* tag; after the hold time it fades back to neutral on its own. |
| **Journal entry** (designed) | Mood colour, face, date and time, and a note with **bold, italic, underline, bullets, numbers and links**. Writing is optional: *Back* keeps the mood logged; *Save* stores the note. Leaving with unsaved text asks first. The bin icon deletes a mis-tapped entry. |
| **History** | Entries grouped by day, newest first, with a small strip of each day's colours. Tap any entry to add or edit its note later. No scores, no trend charts: a diary, not a dashboard. |
| **Settings** | How long a mood holds (2/4/6/8 h, default 4 h), export entries as JSON, add sample entries, delete everything. |

**Privacy:** everything is stored in the browser on that device (`localStorage`). Nothing is sent
anywhere. Clearing the browser's site data clears the journal.

## Where things live

```
web/
  src/lib/moods.ts        ← the palette: words, colours, order (single source of truth)
  src/lib/store.ts        ← entries, settings, the "fades after N hours" rule
  src/components/Face.tsx ← the seven line-drawn faces
  src/screens/            ← Home, EntryScreen (journal), History, Settings
  src/styles.css          ← layout and sizes, measured from the design screens
```

To change a mood's name or colour, edit `web/src/lib/moods.ts` only. Colours were sampled from
the approved screens. The darker "Save" shade was sampled for Anxious; the other six follow the
same shift and should be confirmed.

## Checks

```bash
cd web
npm run lint
npm test          # store, fading rule, router, palette
npm run build
```

## Not in this prototype yet

- More flows still to be designed (onboarding, the self-activated **"I need support"** button, reflection / gentle patterns).
- The opt-in **protection layer** (sharing an ephemeral signal with other apps).
- Sync or backup across devices; import of an exported file.
- Offline caching (service worker).
