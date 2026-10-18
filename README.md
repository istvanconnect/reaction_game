# REFLEX — Reaction Timer

REFLEX is a small, static reaction-time game built around one simple rule: wait for the green signal, then react as quickly as you can. It pairs a measured, no-countdown game loop with a procedural Three.js visual core and a responsive, accessible HTML interface.

## Features

- Random 1.5–4 second waiting period with no visible countdown.
- Immediate false-start detection; early attempts are cancelled, not scored.
- Reaction time measured with `performance.now()` in milliseconds.
- First valid input wins; repeat inputs cannot create duplicate results.
- Session-best tracking using `sessionStorage`, with an in-memory fallback when storage is blocked.
- Mouse, touch, and keyboard controls (click/tap the reaction area, or focus it and use Space/Enter).
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
└── README.md    # Project overview and setup guide
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

1. Select **Start round**.
2. Wait through the red state. Do not click during the wait.
3. When the panel turns green and says **GO!**, click or tap the reaction area, or focus it and press **Space** or **Enter**.
4. If you react early, choose **Try again**. After a valid result, choose **Play again**.

## Technical notes

- Explicit states are `ready`, `waiting`, `active`, `result`, and `falseStart`.
- A round token invalidates stale timeout callbacks. Pending timeouts are cleared on cancellation and on a new round.
- Timing begins at the synchronous state transition to `active`, not after a frame renders. The first valid event is timestamped immediately with `performance.now()`.
- The 3D module is loaded dynamically after game initialization so CDN/import or WebGL failures do not break core gameplay.
- The session best is scoped to the current browser tab session. It can survive a reload in the same tab when `sessionStorage` is available; it is not a server-side or cross-device leaderboard.
- The decorative canvas is marked `aria-hidden` and uses `pointer-events: none`. All instructions and game values remain in HTML.
- Animation pauses while the tab is hidden and is reduced to a static rendering when `prefers-reduced-motion: reduce` is enabled.

## Deploy

Upload `index.html`, `style.css`, `script.js`, and `README.md` to any static HTTPS host (for example, GitHub Pages, Netlify, or Cloudflare Pages). Keep all four files together and keep the pinned Three.js import-map URL intact. No build command is needed.

## Known limitations

- Google Fonts and Three.js rely on third-party CDNs; offline use falls back to system fonts and CSS visuals, but the scene will not render without the Three.js module.
- Reaction time is measured from the programmatic state transition to the first registered input. Display refresh, browser scheduling, touch hardware, and input-device latency can still influence a human-perceived result.
- Session-best data is local to the current tab session and can be unavailable when browser storage is blocked.
