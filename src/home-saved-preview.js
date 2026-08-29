import {savedItems} from './services/saved-store.js';
import {byId,total} from './services/build.js';
import {prebuiltCatalogue} from './data/prebuilts.js';

const root=document.querySelector('#homepage-saved-builds');
const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const imageFor=item=>item?.image||({Entry:'illustrative-everyday.png',Everyday:'illustrative-everyday.png',Mid:'illustrative-gaming.png',High:'illustrative-enthusiast.png'}[item?.performanceTier]||'illustrative-everyday.png');
const imagePath=file=>`./public/images/prebuilts/${file}`;
const fallback="this.onerror=null;this.src='./public/images/prebuilts/illustrative-everyday.png'";

function customCard(record){
  const parts=record.ids.map(byId).filter(Boolean);
  const useful=['cpu','gpu','ram','storage'].map(category=>parts.find(part=>part.category===category)).filter(Boolean);
  return `<article class="homepage-saved-card"><figure><img src="${imagePath('illustrative-gaming.png')}" alt="Illustrative render for the saved custom PC build ${esc(record.name)}" width="716" height="614" loading="lazy" decoding="async" onerror="${fallback}"><figcaption>Illustrative render</figcaption></figure><div class="homepage-saved-copy"><span>CUSTOM BUILD</span><h3><a href="./saved-builds.html?focus=${encodeURIComponent(record.id)}">${esc(record.name)}</a></h3><b>${money(total(record.ids))}</b><ul>${useful.map(part=>`<li><small>${esc(part.category)}</small><span>${esc(part.name)}</span></li>`).join('')}</ul></div></article>`;
}

function prebuiltCard(record){
  const item=prebuiltCatalogue.find(product=>product.id===record.prebuiltId);
  if(!item)return blankCard();
  const specs=[['CPU',item.cpu],['GPU',item.gpu],['RAM',item.ram],['Storage',item.storage]];
  return `<article class="homepage-saved-card"><figure><img src="${imagePath(imageFor(item))}" alt="Illustrative render for the saved ${esc(item.brand)} desktop PC ${esc(item.name)}" width="716" height="614" loading="lazy" decoding="async" onerror="${fallback}"><figcaption>Illustrative render</figcaption></figure><div class="homepage-saved-copy"><span>PRE-BUILT · ${esc(item.brand)}</span><h3><a href="./saved-builds.html?focus=${encodeURIComponent(record.id)}">${esc(item.name)}</a></h3><b>${money(item.price)}</b><ul>${specs.map(([label,value])=>`<li><small>${label}</small><span>${esc(value)}</span></li>`).join('')}</ul></div></article>`;
}

function blankCard(){return '<article class="homepage-saved-card homepage-saved-card-empty" aria-label="Empty saved build slot"><div><span>SAVED BUILD SLOT</span></div></article>'}
function render(){if(!root)return;const cards=savedItems().slice(0,3).map(record=>record.type==='custom'?customCard(record):prebuiltCard(record));while(cards.length<3)cards.push(blankCard());root.innerHTML=cards.join('')}
render();
window.addEventListener('storage',event=>{if(event.key==='buildwise_saved_items_v1')render()});
