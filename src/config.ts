export type Difficulty = 'story' | 'survivor' | 'nightmare';
export type Quality = 'low' | 'medium' | 'high';
export interface Settings { difficulty: Difficulty; quality: Quality; touchControls: 'auto'|'on'|'off'; brightness: number; sensitivity: number; volume: number; subtitles: boolean; reducedMotion: boolean; reducedScares: boolean; }
export const defaultSettings: Settings = { difficulty: 'survivor', quality: ((typeof navigator!=='undefined'&&navigator.maxTouchPoints>0)||(typeof matchMedia!=='undefined'&&matchMedia('(any-pointer: coarse)').matches)) ? 'low' : 'medium', touchControls: 'auto', brightness: 1, sensitivity: 1, volume: .6, subtitles: true, reducedMotion: false, reducedScares: true };
export const difficulty = { story: { speed: 2.05, damage: 13, hearing: .7, battery: .45 }, survivor: { speed: 2.85, damage: 23, hearing: 1, battery: .7 }, nightmare: { speed: 3.65, damage: 34, hearing: 1.3, battery: 1 } };
export function normalizeSettings(value: unknown): Settings {
  const s=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const number=(key:string,min:number,max:number,fallback:number)=>typeof s[key]==='number'&&Number.isFinite(s[key])?Math.min(max,Math.max(min,s[key] as number)):fallback;
  const bool=(key:'subtitles'|'reducedMotion'|'reducedScares')=>typeof s[key]==='boolean'?s[key] as boolean:defaultSettings[key];
  return {
    difficulty:['story','survivor','nightmare'].includes(String(s.difficulty))?s.difficulty as Difficulty:defaultSettings.difficulty,
    quality:['low','medium','high'].includes(String(s.quality))?s.quality as Quality:defaultSettings.quality,
    touchControls:['auto','on','off'].includes(String(s.touchControls))?s.touchControls as Settings['touchControls']:'auto',
    brightness:number('brightness',.75,2,1),sensitivity:number('sensitivity',.3,2.5,1),volume:number('volume',0,1,.6),
    subtitles:bool('subtitles'),reducedMotion:bool('reducedMotion'),reducedScares:bool('reducedScares')
  };
}
export function readSettings(): Settings { try { return normalizeSettings(JSON.parse(localStorage.getItem('ndz-settings') || '{}')); } catch { return { ...defaultSettings }; } }
export const SAVE_KEY = 'ndz-save-v1';
export const CODE = '0417';
export const CONTROLS = [ ['W A S D', 'Move'], ['MOUSE', 'Look'], ['SHIFT', 'Sprint'], ['C / CTRL', 'Crouch'], ['SPACE', 'Jump / vault marked obstacles'], ['E', 'Interact / hide / leave hiding'], ['CLICK', 'Fire'], ['RIGHT CLICK', 'Aim'], ['R', 'Reload'], ['F', 'Flashlight'], ['Q', 'Throw a noise decoy'], ['H', 'Use medical kit'], ['TAB', 'Journal & routes'], ['ESC / P', 'Pause / resume'] ];
