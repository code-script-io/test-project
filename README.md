# NIGHTMARE: DEAD ZONE

An original, playable first-person survival horror game built with **TypeScript, Vite and Three.js**. No account, backend, API key, remote assets, or paid services. All geometry, textures, UI art and audio are generated locally.

## Play without installing development tools

The downloadable release includes **PLAY-NIGHTMARE.html**, containing the entire bundled game, Three.js and CSS. Save/extract it on your computer and open it in Chrome or Edge. It does not require Node.js, a local server or an Internet connection. It must be opened as an actual web page outside ChatGPT's attachment preview. A managed browser or restrictive local-file viewer may block scripts/WebGL; use the development server workflow below in that case. Local HTML handling on Android varies by file manager and has not been verified on a physical device.

**The cloud workspace's localhost address is not accessible from your own device.** The development server runs inside that cloud machine. This chat has no connected hosting/port-preview capability and no public game URL has been deployed. Source files live in `/workspace/test-project`. A public play URL requires a separate hosting deployment.

`npm run build` also creates `dist/NIGHTMARE-DEAD-ZONE.html`. The script `scripts/standalone.mjs` inlines the production JavaScript and CSS. `npm run test:standalone` tests the self-contained document with networking disabled. The environment's Chromium policy blocks file: navigation; the test reports that and uses an intercepted HTTPS document containing the identical HTML bytes, with no external asset requests. This validates the document, not local-file permissions on every device.

## Run

Requires Node.js **20.19+ or 22.12+** (developed on Node 24) and a WebGL 2 browser.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Click **ENTER THE DEAD ZONE**, then allow mouse capture. If capture was denied, click the game canvas again. Escape releases the mouse and pauses. The development server listens on all interfaces: an Android device on the same network can open `http://YOUR_COMPUTER_IP:5173`. Use landscape orientation. No runtime Internet connection is needed once the game is loaded.

```sh
npm run build        # TypeScript check + production bundle in dist/
npm run preview      # Serve the production build on port 4173
npm run typecheck
npm test             # Collision, line of sight and A* tests
npm run test:browser  # Chromium gameplay / mobile input integration checks
```

Browser tests require the dev server running at port 5173 and Chromium at `/usr/bin/chromium`. Set `GAME_URL` and/or `CHROMIUM_PATH` to override those defaults. The tests use software WebGL in headless Chromium. Screenshots are saved to `artifacts/`. A test bridge exists **only** when the URL has `?test=1`; normal sessions expose no bridge.

## The night

You wake inside Blackthorn Estate, a former research station. Its abandoned laboratory connects to drainage tunnels and a forest perimeter. Find a **ceramic fuse in the west archive**, then restore the **generator in the east laboratory**. Three complete endings are available:

- **Perimeter:** find the brass key in the forest greenhouse, then use the south gate. Vault the barricades on the forest path.
- **Drainage:** take the valve from the laboratory, then open the hatch in the west branch of the north tunnels.
- **Signal:** read the archive access log, then enter its four-digit code at the radio in the east branch of the north tunnels.

The objective marker gives a bearing and distance, not a route through walls. The hall leads north to the tunnels and south to the forest. West/east doors connect the rooms. Press Tab to read collected notes and see all route requirements. Some signs and notes are mounted low: look down to inspect them.

### Controls

| Action | Desktop |
| --- | --- |
| Move / look | WASD or arrows / mouse |
| Sprint | Hold Shift |
| Crouch | C or left Ctrl (toggle) |
| Jump / vault nearby low obstacles | Space |
| Interact / hide / leave hiding | E |
| Shoot / aim | Left mouse / hold right mouse |
| Reload | R |
| Flashlight | F |
| Throw noise decoy | Q |
| Use medical kit | H |
| Journal and notes | Tab |
| Pause | Escape or P |

Mobile has a left movement joystick, a right drag-to-look region, and labeled action buttons. Hold RUN to sprint. AIM and CROUCH toggle. The pause button opens the journal and settings as well.

### Survival

The **Warden** patrols, hears footsteps, gunfire and thrown decoys, investigates, searches, sees players through unobstructed sight lines, chases and attacks. A short audible tell precedes its first attack. Break sight to make it search; hide in a locker or beneath a bedroom bed after losing its gaze. Crouching reduces noise and detection distance. Furniture blocks sight and movement.

The forest **crawler** is faster, lower to the ground, has less health and poor hearing. It deals less damage per attack. The forest key makes noise, drawing attention toward the escape path. Neither enemy teleports during play. They use grid navigation around geometry.

A six-round pistol staggers enemies. Four body hits down the Warden; two down a crawler. Downed enemies recover after **22 seconds**. Shots are occluded by solid geometry. Reloading transfers spare rounds and takes time. Medical kits heal 45 health. Flashlight batteries and ammunition are limited; exploration yields supplies. Three decoys can draw searching enemies toward a point ahead of you.

### Checkpoints and settings

Objective interactions and pausing save progress and supplies in localStorage. Continue restores your position when it is valid. After death, retry restores the last saved supplies and objectives in the foyer, with at least 60 health and 25% battery and a short enemy grace period. A new game replaces the checkpoint; victory clears it and records the ending. Storage may be unavailable in restrictive private browser modes; the game remains playable but checkpoint persistence cannot be guaranteed there.

Settings include Story / Survivor / Nightmare difficulty, Low / Medium / High graphics, environment brightness, automatic/forced touch controls, look sensitivity, volume, sound captions, reduced motion and reduced jump scares. Low disables rain particles and dynamic shadows and caps pixel ratio at 1. Medium enables moon shadows; High adds flashlight shadows and higher resolution. Reduced motion removes head bob and shooting camera kick. Reduced scares lowers damage flash intensity; there are no mandatory full-screen pop-up scares. Audio is procedural Web Audio and starts only after pressing a game button; it suspends while paused or unfocused.

## Project structure

- `src/game.ts` — simulation, progression, weapon, inventory, checkpoints, game states
- `src/ai.ts` — enemy finite states, senses, navigation and animation
- `src/physics.ts` — circle collision, segment occlusion, grid A*
- `src/world.ts` — procedural level, geometry, textures, lighting, interactables and rain
- `src/rendering.ts` — Three.js renderer, camera, flashlight and first-person weapon
- `src/input.ts` — keyboard, pointer lock and native touch input
- `src/audio.ts` — synthesized sound effects and ambient sound
- `src/ui.ts`, `src/style.css` — menus, HUD, journal, tutorial, accessibility settings
- `src/config.ts` — difficulty, defaults and controls
- `tests/` — automated unit and browser integration tests

## Scope and validation limits

This is a compact complete game with stylized procedural art, one connected single-floor estate and three endings. It is not a photorealistic production with authored cinematics, destructible scenery, multi-story climbing, complex rigid-body physics, or a multiplayer mode. Vaulting/climbing is limited to nearby low obstacles; jumping uses simple vertical gravity. Door progression is represented by the perimeter gate, drainage hatch and coded radio; there are no freely swinging interior doors. Autosaves are local to the browser and are not cloud saves. The game is not installed as a PWA.

Automated integration tests exercise real keyboard/touch input, renderer startup, collision, a vault, E-based fuse and generator interactions, weapon raycasts, reload, AI pursuit/attack/hearing, hide/unhide, death/retry, journal, all three escape condition handlers, and incorrect/correct radio codes. The test bridge places actors and teleports between checkpoints for deterministic coverage; it does **not** constitute a manual uninterrupted playthrough. Mobile checks emulate touch in Chromium and do not establish frame rates or compatibility on every physical Android device. The graphical presets are user-selectable; they do not use a hardware benchmark.

See [ASSET_CREDITS.md](ASSET_CREDITS.md) for licenses and [LICENSE](LICENSE) for project code.

## Version 1.1 fixes

- Brighter ambient lighting and surfaces, lighter fog/vignette, stronger flashlight, and a 75–200% brightness slider. Hallways remain navigable with the flashlight off.
- Touch detection uses touch hardware and actual touch events, with a Settings → Touch controls → On override.
- FIRE taps are queued so a short tap between rendered frames cannot vanish. Holding FIRE still supports repeated shots.
- Independent pointer capture supports moving, looking and shooting with three fingers. Pointer cancellation and lost capture release buttons and the joystick.
- P/Escape resume pause panels, Escape closes notes/journal, and Tab closes the journal.
- Jumping works from furniture; a vault checks its full path for intervening walls.
- Hitscan and interaction use the current camera pose, rather than the preceding rendered frame.
- Continue preserves health, facing, flashlight and crouch state; only death recovery supplies the minimum recovery health/battery. Old saves/settings still load.
- Invalid saved difficulty, brightness and other settings fall back to safe values.

`npm run test:regressions` checks these input, save, jump and touch regressions against a running production server (port 4173 by default). Device emulation does not replace testing on the user's actual phone.
