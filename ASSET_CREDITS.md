# Asset and dependency credits

## Original procedural work

All in-game mansion/lab/tunnel/forest/Echo Ward geometry, characters, weapon, furniture, signs, rain, textures, maps, interface symbols and noise overlays were generated in this project. Sound is synthesized using Web Audio oscillators and locally generated filtered noise. v1.2 adds original layered firearm transients/tails, surface footsteps, breathing, heartbeat, creature sounds, bells, weather, zone ambience and stereo environmental cues. Room reverberation uses deterministically generated impulse buffers; no recorded impulse response, voice actor, music track or field recording is included. No recordings, stock art, copyrighted game assets, external font downloads or model packs are used. This original work is distributed under the project MIT license.

Blackthorn Estate, the Echo Ward, the Warden, the crawler, the optional corridor apparition, the three-bell requiem and their story are original to this project. The chapel’s seal, geometric marks, bell stands, candles, acoustic panels, observation glass, hidden viewpoints and encounter captions are procedural/original work under the project MIT license. NIGHTMARE: DEAD ZONE does not reuse Granny characters, maps, music, art or story.

The UI uses installed system fonts: Arial/Helvetica, Georgia/Times New Roman and monospace. No font files are redistributed.

The credit record describes asset provenance, not a human assessment of sound realism or a guarantee of compatibility on every Android device.

## Software dependencies

| Package | Purpose | License / source |
| --- | --- | --- |
| Three.js | WebGL rendering and math | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |
| Vite | Development server / bundler | MIT — https://github.com/vitejs/vite/blob/main/LICENSE |
| TypeScript | Type checking | Apache-2.0 — https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt |
| @types/three | Development types | MIT — DefinitelyTyped |
| tsx | Unit test execution | MIT — https://github.com/privatenumber/tsx |
| Playwright | Browser test automation | Apache-2.0 — https://github.com/microsoft/playwright |

Exact installed versions and transitive dependencies are recorded in package-lock.json. Dependency license notices are included with their npm distributions in node_modules. Vite preserves applicable bundled license comments. Browser testing uses the environment's Chromium executable; no browser binary is redistributed with the source archive.
