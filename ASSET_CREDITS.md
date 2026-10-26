# Asset and dependency credits

## Original procedural work

All in-game mansion/lab/tunnel/forest geometry, characters, weapon, furniture, signs, rain, textures, maps, interface symbols and noise overlays were generated in this project. Sound is synthesized using Web Audio oscillators and locally generated filtered noise. No recordings, stock art, copyrighted game assets, external font downloads or model packs are used. This original work is distributed under the project MIT license.

Blackthorn Estate, the Warden, the crawler, and their story are original to this project. NIGHTMARE: DEAD ZONE does not reuse Granny characters, maps, music, art or story.

The UI uses installed system fonts: Arial/Helvetica, Georgia/Times New Roman and monospace. No font files are redistributed.

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
