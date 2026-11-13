# Trip to The East · 东游记

A 3D Mandarin learning adventure in Chongqing, with Yu the cat as your guide.

Play: https://junjieligo.github.io/The-AI-Game/

This repository contains the complete playable website and its editable JavaScript, HTML, CSS, illustrations, fonts, recordings and music. It is a static website: no API key, account system or build step is required.

## Play locally

Run `python3 -m http.server 4173 --bind 127.0.0.1` in this folder, then open http://localhost:4173. Opening index.html directly can block browser modules. WebGL enables the 3D scene; microphone practice needs localhost or HTTPS.

## Publish with GitHub Pages

In the repository, open Settings → Pages. Under Build and deployment, choose Deploy from a branch, select main and / (root), and save. GitHub will display the playable website address here after deployment. The repository page itself is not the game.

## Edit the game

`index.html` is the entry point. `app.js` handles the interface, `lessons.js` contains the Mandarin learning activities, and `world.js` builds the town. `navigation.js` controls movement. The `*-intro-scene.js` files contain the short illustrations and their animation timings. Styles are in the CSS files. Audio is in `audio/`, fonts in `fonts/`, and Three.js in `vendor/`.

All game assets are hosted with the site. No third-party font service or CDN is required while playing. Progress is stored in the player's current browser, so it does not automatically transfer from another website address. Recordings made by learners stay on their device unless they choose to download them.

The original development history and production assets are preserved separately by the owner. SOURCE_SNAPSHOT.json records the origin and hashes of the playable files in this copy.

## Rights and availability

The included third-party font and Three.js licences remain in `fonts/` and `vendor/`. Publishing this repository does not assign a new open-source licence to the original game assets or code.

Access from mainland China depends on the local network and hosting domain. GitHub Pages availability there is not guaranteed; test the published link from the intended audience's network.
