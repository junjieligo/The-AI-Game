# Trip to The East · 东游记

A Mandarin adventure through Chongqing, with Yu the cat.

**Play:** https://junjieligo.github.io/The-AI-Game/

This repository automatically mirrors the published game at https://trip-to-the-east-yu-adventure.junjieligo.chatgpt.site/ . GitHub checks for updates at 7 and 37 minutes past each hour. Scheduled runs may be delayed; this is not instant synchronisation.

## Automatic updates

The **Sync published game** workflow downloads the public game files, checks every file against the publication manifest, records changed files in Git history, and deploys the same verified files to Pages. If anything is missing, inconsistent or unavailable, the existing live game stays online. No API key, personal token or running computer is required.

Update the original ChatGPT source, not this mirror. Its publication instructions regenerate `dist/mirror-manifest.json` after every change. Public JS, HTML, CSS, illustrations, fonts, recordings and music are copied; private working files are not. Changes here do not flow back to ChatGPT. Player progress stays in each browser and is separate between the two website addresses.

## Recovery and maintenance

Open **Actions → Sync published game → Run workflow** to retry a failed update. Pages must use **GitHub Actions** as its publishing source. The schedule records a small monthly heartbeat to keep the public repository active; if GitHub disables the workflow after a prolonged failure or inactivity, enable it again in Actions. `.sync-state.json` records the currently mirrored release and managed files; `SOURCE_SNAPSHOT.json` preserves the initial export record.

The updater and tests are in `sync/`; the schedule is `.github/workflows/sync-game.yml`. Run `python3 -m unittest discover -s sync -p 'test_*.py'` to test it. Changes to the updater trigger a sync immediately. Its downloaded game code is never executed on the runner. The source URL is fixed in the workflow and the downloader accepts only verified public asset paths.

## Play locally and edit

Run `python3 -m http.server 4173 --bind 127.0.0.1`, then open http://localhost:4173 . `index.html` is the entry point, `app.js` handles the interface, `lessons.js` contains the activities, and `world.js` builds the town. Game assets and their licences are bundled locally; no external font service or CDN is required.

Third-party font and Three.js licences remain in `fonts/` and `vendor/`. This publication does not assign a new open-source licence to the original game code or assets. Availability in mainland China depends on the visitor's network; GitHub Pages access there is not guaranteed.
