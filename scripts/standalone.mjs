// Produce a self-contained game: no HTTP server, package installation or remote assets.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=await readFile(resolve(root,'dist/index.html'),'utf8');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath=html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw Error('Expected one bundled script and stylesheet; run vite build first.');
const js=await readFile(resolve(root,'dist',jsPath.replace(/^\//,'')),'utf8');
const css=await readFile(resolve(root,'dist',cssPath.replace(/^\//,'')),'utf8');
let standalone=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,'').replace(/<link[^>]+rel="stylesheet"[^>]*>/,()=>`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`);
standalone=standalone.replace('</body>',()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script></body>`);
await writeFile(resolve(root,'dist/NIGHTMARE-DEAD-ZONE.html'),standalone);
console.log(`Standalone game: dist/NIGHTMARE-DEAD-ZONE.html (${Buffer.byteLength(standalone).toLocaleString()} bytes)`);
