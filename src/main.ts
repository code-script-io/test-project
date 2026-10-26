import './style.css';
import { Game } from './game';
try { new Game(); } catch(error) {
  console.error(error);
  document.querySelector('#app')!.innerHTML='<div style="padding:10vw;color:#ccd7bc;font:16px/1.8 monospace"><h1>NIGHTMARE: DEAD ZONE</h1><p>The renderer could not start. This game requires WebGL 2. Enable hardware acceleration in your browser and reload.</p><button onclick="location.reload()" style="padding:15px">TRY AGAIN</button></div>';
}
