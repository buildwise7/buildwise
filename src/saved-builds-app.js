import {savedItems,removeSavedItem} from './services/saved-store.js';
import {byId,total} from './services/build.js';
import {prebuiltCatalogue} from './data/prebuilts.js';

const root=document.querySelector('#saved-builds-list');
const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
const imageFor=item=>item.image||({Entry:'illustrative-everyday.png',Everyday:'illustrative-everyday.png',Mid:'illustrative-gaming.png',High:'illustrative-enthusiast.png'}[item.performanceTier]||'illustrative-everyday.png');

function customCard(record){
  const parts=record.ids.map(byId).filter(Boolean);
  return `<article id="saved-build-${esc(record.id)}" class="saved-card saved-card-custom" tabindex="-1">
    <div class="saved-card-head"><span class="tag">CUSTOM BUILD</span><time datetime="${new Date(record.updatedAt).toISOString()}">Updated ${esc(date(record.updatedAt))}</time></div>
    <h2>${esc(record.name)}</h2><p class="saved-total">${money(total(record.ids))} <span>Estimated planning total</span></p>
    <div class="saved-parts">${parts.map(part=>`<div><span>${esc(part.category)}</span><a href="${esc(part.retailers[0]?.url||'#')}" target="_blank" rel="noopener noreferrer">${esc(part.name)}</a><b>${money(part.price.amount)}</b></div>`).join('')}</div>
    <div class="saved-actions"><a class="primary-button" href="./index.html?savedBuild=${encodeURIComponent(record.id)}&returnTo=saved-builds">View / edit build</a><button class="text-button" data-remove="${esc(record.id)}">Remove saved build</button></div>
  </article>`;
}

function prebuiltCard(record){
  const item=prebuiltCatalogue.find(product=>product.id===record.prebuiltId);
  if(!item)return '';
  return `<article id="saved-build-${esc(record.id)}" class="saved-card saved-card-prebuilt" tabindex="-1">
    <figure class="saved-prebuilt-image"><img src="./public/images/prebuilts/${esc(imageFor(item))}" alt="Illustrative render of the saved ${esc(item.brand)} desktop PC" width="716" height="614" loading="lazy" onerror="this.onerror=null;this.src='./public/images/prebuilts/illustrative-everyday.png'"><figcaption>Illustrative render</figcaption></figure>
    <div class="saved-prebuilt-copy"><div class="saved-card-head"><span class="tag">PRE-BUILT · ${esc(item.brand)}</span><time datetime="${new Date(record.updatedAt).toISOString()}">Saved ${esc(date(record.savedAt))}</time></div><h2>${esc(item.name)}</h2><p class="saved-total">${money(item.price)}</p><details class="saved-components"><summary>View components</summary><dl><div><dt>CPU / Processor</dt><dd>${esc(item.cpu)}</dd></div><div><dt>GPU / Graphics</dt><dd>${esc(item.gpu)}</dd></div><div><dt>RAM / Memory</dt><dd>${esc(item.ram)}</dd></div><div><dt>Storage</dt><dd>${esc(item.storage)}</dd></div></dl></details><div class="saved-actions"><a class="secondary-button" href="${esc(item.productUrl)}" target="_blank" rel="noopener noreferrer">View at retailer ↗</a><button class="text-button" data-remove="${esc(record.id)}">Remove saved build</button></div></div>
  </article>`;
}

function render(){
  const items=savedItems();
  root.innerHTML=items.length?items.map(item=>item.type==='custom'?customCard(item):prebuiltCard(item)).join(''):`<section class="saved-empty"><p class="eyebrow">NOTHING SAVED YET</p><h2>No saved builds yet.</h2><p>Builds you save from the BuildWise questionnaire, manual builder, or Pre-builts matcher will appear here.</p><a class="primary-button" href="./index.html">Build my PC <span>→</span></a></section>`;
  root.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>{if(window.confirm('Remove this saved build from this browser?')){removeSavedItem(button.dataset.remove);render()}}));
  const focusId=new URLSearchParams(window.location.search).get('focus');
  if(/^[a-z0-9-]{1,90}$/i.test(focusId||'')){const target=document.getElementById(`saved-build-${focusId}`);if(target){target.classList.add('saved-card-focused');target.scrollIntoView({block:'center'});target.focus({preventScroll:true})}}
}
render();
