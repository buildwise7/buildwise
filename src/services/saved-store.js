import {byId,compatibility,total} from './build.js';
import {prebuiltCatalogue} from '../data/prebuilts.js';
export {shareUrl,readSharedBuild} from './saved-storage.js';

const KEY='buildwise_saved_items_v1',LEGACY_CUSTOM='buildwise_saved_builds_v1',LEGACY_PREBUILT='buildwise-saved-prebuilts-v1';
const required=['cpu','cooler','motherboard','ram','gpu','storage','psu','case','fans'];
const safeId=value=>typeof value==='string'&&/^[a-z0-9-]{1,90}$/i.test(value);
const safeName=value=>String(value||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,64)||'My build';
const read=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
const write=items=>{try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,50)));return true}catch{return false}};
const validIds=ids=>Array.isArray(ids)&&ids.length===required.length&&ids.every(safeId)&&new Set(ids).size===ids.length&&required.every(category=>ids.some(id=>byId(id)?.category===category))&&ids.every(id=>byId(id))&&!compatibility(ids).length;
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
const cleanCustom=item=>item?.type==='custom'&&safeId(item.id)&&validIds(item.ids)?{id:item.id,type:'custom',name:safeName(item.name),ids:[...item.ids],savedAt:Number(item.savedAt)||Date.now(),updatedAt:Number(item.updatedAt)||Number(item.savedAt)||Date.now()}:null;
const cleanPrebuilt=item=>{const product=prebuiltCatalogue.find(candidate=>candidate.id===item?.prebuiltId);if(!product||!safeId(item.id))return null;return{id:item.id,type:'prebuilt',prebuiltId:product.id,name:product.name,savedAt:Number(item.savedAt)||Date.now(),updatedAt:Number(item.updatedAt)||Number(item.savedAt)||Date.now()}};

function migrate(){
  if(localStorage.getItem(KEY)!==null)return;
  const custom=read(LEGACY_CUSTOM).map(item=>cleanCustom({...item,type:'custom'})).filter(Boolean);
  const prebuilts=read(LEGACY_PREBUILT).map(item=>cleanPrebuilt({id:`legacy-${item.id||makeId('prebuilt')}`,type:'prebuilt',prebuiltId:item.id,savedAt:Date.parse(item.savedAt)||Date.now(),updatedAt:Date.parse(item.savedAt)||Date.now()})).filter(Boolean);
  write([...custom,...prebuilts]);
}

export function savedItems(){migrate();return read(KEY).map(item=>item?.type==='custom'?cleanCustom(item):cleanPrebuilt(item)).filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt)}
export function getSavedItem(id){return savedItems().find(item=>item.id===id)||null}
export function saveCustomBuild(ids,name,existingId=null){
  if(!validIds(ids))return{ok:false,reason:'This build no longer passes compatibility checks.'};
  const now=Date.now(),items=savedItems(),existing=existingId?items.find(item=>item.id===existingId&&item.type==='custom'):null;
  const record={id:existing?.id||makeId('custom'),type:'custom',name:safeName(name),ids:[...ids],savedAt:existing?.savedAt||now,updatedAt:now,total:total(ids)};
  const next=[record,...items.filter(item=>item.id!==record.id)];
  return write(next)?{ok:true,record}:{ok:false,reason:'Your browser could not save this build.'};
}
export function savePrebuilt(product){
  if(!product||!prebuiltCatalogue.some(item=>item.id===product.id))return false;
  const now=Date.now(),items=savedItems(),existing=items.find(item=>item.type==='prebuilt'&&item.prebuiltId===product.id);
  const record={id:existing?.id||makeId('prebuilt'),type:'prebuilt',prebuiltId:product.id,name:product.name,savedAt:existing?.savedAt||now,updatedAt:now};
  return write([record,...items.filter(item=>item.id!==record.id)]);
}
export function removeSavedItem(id){return safeId(id)&&write(savedItems().filter(item=>item.id!==id))}
export function customBuilds(){return savedItems().filter(item=>item.type==='custom')}
