import { byId, compatibility } from './build.js';

const KEY = 'buildwise_saved_builds_v1';
const REQUIRED_CATEGORIES = ['cpu','cooler','motherboard','ram','gpu','storage','psu','case','fans'];
const safeId = value => typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value);
const safeName = value => String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0,48) || 'My build';

export function validateBuildIds(input) {
  const ids = Array.isArray(input) ? input : [];
  if (ids.length !== REQUIRED_CATEGORIES.length || ids.some(id => !safeId(id))) return { valid:false, reason:'This shared build is incomplete.' };
  const parts = ids.map(byId);
  if (parts.some(part => !part)) return { valid:false, reason:'One or more parts in this build are no longer in the catalogue.' };
  if (new Set(ids).size !== ids.length || new Set(parts.map(part => part.category)).size !== REQUIRED_CATEGORIES.length || !REQUIRED_CATEGORIES.every(category => parts.some(part => part.category === category))) return { valid:false, reason:'This shared build has an invalid component selection.' };
  if (compatibility(ids).length) return { valid:false, reason:'This shared build no longer passes compatibility checks.' };
  return { valid:true, ids:[...ids] };
}

function readRaw() { try { const raw = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(raw) ? raw : []; } catch { return []; } }
function writeRaw(builds) { try { localStorage.setItem(KEY, JSON.stringify(builds)); return true; } catch { return false; } }
function cleaned(record) { const validation = validateBuildIds(record?.ids); if (!validation.valid || !safeId(record?.id)) return null; return { id:record.id, name:safeName(record.name), ids:validation.ids, savedAt:typeof record.savedAt === 'number' ? record.savedAt : 0 }; }

export function savedBuilds() { return readRaw().map(cleaned).filter(Boolean).sort((a,b) => b.savedAt - a.savedAt); }
export function saveBuild(ids, name) { const validation = validateBuildIds(ids); if (!validation.valid) return { ok:false, reason:validation.reason }; const record = { id:`b${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`, name:safeName(name), ids:validation.ids, savedAt:Date.now() }; const builds = savedBuilds(); return writeRaw([record,...builds].slice(0,30)) ? { ok:true, record } : { ok:false, reason:'Your browser could not save this build.' }; }
export function removeSavedBuild(id) { if (!safeId(id)) return false; return writeRaw(savedBuilds().filter(build => build.id !== id)); }
export function shareUrl(ids, base = window.location.href) { const validation = validateBuildIds(ids); if (!validation.valid) return null; const url = new URL(base); url.search = ''; url.hash = ''; url.searchParams.set('build', validation.ids.join(',')); return url.toString(); }
export function readSharedBuild(url = window.location.href) { try { const value = new URL(url).searchParams.get('build'); if (!value) return { provided:false }; if (value.length > 720) return { provided:true, valid:false, reason:'This shared build link is invalid.' }; const result = validateBuildIds(value.split(',')); return result.valid ? { provided:true, valid:true, ids:result.ids } : { provided:true, valid:false, reason:result.reason }; } catch { return { provided:true, valid:false, reason:'This shared build link is invalid.' }; } }
