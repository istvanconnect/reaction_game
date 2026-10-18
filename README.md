# REFLEX — Reaction Timer

REFLEX is a small, static reaction-time game built around one simple rule: wait for the green signal, then react as quickly as you can. It pairs a measured, no-countdown game loop with a procedural Three.js visual core and a responsive, accessible HTML interface.

## Features

- Random 1.5–4 second waiting period with no visible countdown.
- Immediate false-start detection; early attempts are cancelled, not scored.
- Reaction time measured with `performance.now()` in milliseconds.
- First valid input wins; repeat inputs cannot create duplicate results.
- Session-best tracking using `sessionStorage`, with an in-memory fallback when storage is blocked.
- Click or tap anywhere in the game panel to start/restart; click or tap again to register a false start or reaction during a round.
- Space starts/restarts when the game panel is not focused and acts as the reaction key during the round; Enter is also supported.
- The first-load instructions live inside the game panel and disappear after the first round begins.
- Results include an explanatory rating: Amazing (<150 ms), Very good (150–199 ms), Good (200–249 ms), Average (250–350 ms), and Below average (>350 ms). These are informal game guide ranges, not clinical benchmarks.
- Procedural Three.js icosahedron, wireframe shell, orbiting torus rings, satellites, and state-synchronized lighting.
- CSS visual fallback when Three.js or WebGL cannot initialize.
- Responsive layout, visible keyboard focus, live announcements for state changes, and reduced-motion support.
- Static deployment: no framework, build step, backend, or package install.

## Technology

- Semantic HTML5
- CSS3, custom properties, responsive grid/flex layouts, reduced-motion media query
- Vanilla JavaScript ES modules and browser timing/input APIs
- Three.js **r186** loaded from jsDelivr through a pinned import map
- Google Fonts: Space Grotesk and Inter, with system fallbacks

## File structure

```text
reflex-game/
├── index.html   # Metadata, accessible interface, font links, import map
├── style.css    # Design system, responsive layout, interface states, fallback visuals
├── script.js    # Game state machine, timing, controls, Three.js scene and cleanup
├── README.md    # Project overview and setup guide
└── favicon.png  # Root-level PNG favicon
```

## Run locally

The project uses JavaScript modules, so serve it over HTTP rather than opening `index.html` via `file://`.

### Option A: VS Code Live Server

1. Open the `reflex-game` folder in Visual Studio Code.
2. Install/enable the **Live Server** extension if needed.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Play in the browser tab it opens.

### Option B: Python's simple HTTP server

If Python 3 is installed, open a terminal in the `reflex-game` directory and run:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

No npm, dependencies folder, bundler, or compilation step is required. The Three.js module and fonts are loaded from external CDNs, so those assets require an internet connection. If Three.js fails to load, the reaction timer remains playable with CSS visuals.

## Controls

1. On the first load, read the instructions inside the game panel.
2. Click or tap anywhere inside the game panel, or press **Space** to start.
3. Wait through the red state. Do not click or press Space during the wait.
4. When the panel turns green and says **GO!**, click/tap anywhere in the game panel or press **Space** (Enter is also supported).
5. After a false start or result, click/tap anywhere in the panel or press **Space** to restart/replay. The intro instructions do not reappear until the page is reloaded.

## Reaction-time ratings

- **Amazing:** under 150 ms — exceptional speed for a visual cue.
- **Very good:** 150–199 ms — faster than typical visual responses.
- **Good:** 200–249 ms — a quick, solid response.
- **Average:** 250–350 ms — around the common range for visual tests.
- **Below average:** over 350 ms — slower than typical; practice and focus can help.

The guide is an informal reference for this game, not a clinical benchmark. The result screen highlights the category for the latest score.

## Technical notes

- Explicit states are `ready`, `waiting`, `active`, `result`, and `falseStart`.
- A round token invalidates stale timeout callbacks. Pending timeouts are cleared on cancellation and on a new round.
- Timing begins at the synchronous state transition to `active`, not after a frame renders. The first valid event is timestamped immediately with `performance.now()`.
- The 3D module is loaded dynamically after game initialization so CDN/import or WebGL failures do not break core gameplay.
- The session best is scoped to the current browser tab session. It can survive a reload in the same tab when `sessionStorage` is available; it is not a server-side or cross-device leaderboard.
- The decorative canvas is marked `aria-hidden` and uses `pointer-events: none`. All instructions and game values remain in HTML.
- Animation pauses while the tab is hidden and is reduced to a static rendering when `prefers-reduced-motion: reduce` is enabled.

## Deploy

Upload `index.html`, `style.css`, `script.js`, `README.md`, and `favicon.png` to any static HTTPS host (for example, GitHub Pages, Netlify, or Cloudflare Pages). Keep all five files together and keep the pinned Three.js import-map URL intact. The favicon link points to `./favicon.png` in the project root. No build command is needed.

## Known limitations

- Google Fonts and Three.js rely on third-party CDNs; offline use falls back to system fonts and CSS visuals, but the scene will not render without the Three.js module.
- Reaction time is measured from the programmatic state transition to the first registered input. Display refresh, browser scheduling, touch hardware, and input-device latency can still influence a human-perceived result.
- Session-best data is local to the current tab session and can be unavailable when browser storage is blocked.
