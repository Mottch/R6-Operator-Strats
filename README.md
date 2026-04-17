# R6 Playbook

A lightweight static site for organizing Rainbow Six Siege video links by
**Map → Site → Side → Operator**. Built for fast lookup between rounds.

No frameworks, no build step, no backend. Just drop it on GitHub Pages.

## Features

- **Fast drill-down**: Map → Site → Side → Operator → video in 3–4 taps.
- **Search**: type things like `mute gym` or `kafe cocktail` to jump straight to matching videos.
- **Remembers where you were**: reopening the site drops you back at the last map/site you viewed.
- **Works on mobile**: big tap targets, deep-links open the Instagram/TikTok app directly.
- **Easy to add entries**: `add.html` has dropdowns populated from a reference file — no typos.
- **Current ranked map pool** (Y11S1, post April 16, 2026 mid-season update): 17 maps.

## Setup (5 minutes)

1. **Create a new GitHub repo**. Public is easiest — GitHub Pages on free accounts requires public repos unless you pay for Pro.
2. **Upload every file** in this folder to the repo root (keep the `data/` folder).
3. **Edit `add.js`**: change the first real line:
   ```js
   const GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPO';
   ```
   to match your actual repo, e.g. `'jsmith/r6-playbook'`. This makes the
   "Open videos.json on GitHub" button work.
4. **Enable GitHub Pages**:
   - Repo → Settings → Pages
   - Source: Deploy from a branch → `main` → `/ (root)` → Save.
5. Wait ~1 minute. Your site is live at
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`.
6. **Add collaborators**: Settings → Collaborators → invite your friends so they can commit directly.

## Adding a video (the happy path)

1. On your phone (or anywhere), open `https://YOUR_USERNAME.github.io/YOUR_REPO/add.html`.
2. Fill out the form — map/site/operator are dropdowns, so you can't typo them.
3. Click **Generate JSON**, then **Copy to clipboard**.
4. Click **Open videos.json on GitHub** — this opens the file in GitHub's web editor.
5. Scroll to the end of the array (the last `}` before `]`), put your cursor right after it, and paste. The snippet starts with `,\n` so it's ready to drop in.
6. Commit. Live in ~30 seconds.

## Adding a video (direct edit)

If you're comfortable with JSON, just edit `data/videos.json` directly on
GitHub. Each entry looks like:

```json
{
  "map": "Clubhouse",
  "site": "2F Gym / Bedroom",
  "side": "defense",
  "operator": "Mute",
  "title": "Jammer placement for CCTV setup",
  "url": "https://www.instagram.com/reel/xyz",
  "notes": "Works best paired with Smoke",
  "tags": ["gadget-placement"]
}
```

Required fields: `map`, `site`, `side`, `operator`, `title`, `url`.
Optional: `notes`, `tags`.

## Verifying / updating reference data

`data/reference.json` holds the maps, sites, and operators. Two reasons you'll edit it:

1. **Site callout names**: the starter site names are best-effort. Your team
   might call "2F Gym / Bedroom" something different. Edit `data/reference.json`
   to match your team's actual callouts — then `add.html` dropdowns update everywhere.
2. **New seasons**: when Ubisoft rotates the map pool or adds operators, update
   this file. One person edits, everyone benefits.

Sites use the format `"Room A / Room B"` because that's how Siege pairs bomb
sites per floor. Feel free to change the convention — the site is just matching
strings, so whatever you put here is what shows up.

## File structure

```
/
├── index.html          # Main browser page
├── add.html            # Video-adding form
├── app.js              # Main page logic
├── add.js              # Form logic
├── style.css           # All styling
├── data/
│   ├── videos.json     # Video entries (this is what you edit most)
│   └── reference.json  # Maps/sites/operators catalog
└── README.md
```

## Troubleshooting

- **"Couldn't load data" error**: You probably broke `videos.json` with bad JSON.
  Go to the commit history on GitHub and revert the last commit. Common culprits:
  missing comma between entries, trailing comma after the last entry, unclosed quotes.
- **Changes don't show up**: GitHub Pages caches aggressively. Hard-refresh
  (Cmd+Shift+R / Ctrl+F5). If still stale, wait 2–3 minutes for the CDN.
- **"Open videos.json on GitHub" button shows a warning**: you didn't update
  `GITHUB_REPO` in `add.js`. Go do that.

## How it works

Everything runs in the browser. When you load the site:
1. `app.js` fetches `data/reference.json` (maps, sites, operators).
2. `app.js` fetches `data/videos.json` (the entries).
3. Rendering, search, and filtering all happen client-side on the loaded arrays.
4. State (last map, site, side) persists in `localStorage` so you don't lose your place.

`add.html` doesn't save anything — it generates a JSON snippet for you to
paste into `videos.json` via GitHub's web editor. That's the "no backend" trick.
