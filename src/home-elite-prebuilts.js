import {prebuiltCatalogue} from './data/prebuilts.js';

const root=document.querySelector('#homepage-elite-prebuilts');
const ids=['dell-slim-ultra7-cdecs125002','hp-omen-16l-bt8e6ea','hp-hyperx-omen-35l-da3w8ea'];
const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const imageFor=item=>item.image||({Entry:'illustrative-everyday.png',Everyday:'illustrative-everyday.png',Mid:'illustrative-gaming.png',High:'illustrative-enthusiast.png'}[item.performanceTier]||'illustrative-everyday.png');
if(root){root.innerHTML=ids.map(id=>prebuiltCatalogue.find(item=>item.id===id)).filter(Boolean).map(item=>`<article class="elite-prebuilt-card"><figure><img src="./public/images/prebuilts/${imageFor(item)}" alt="Illustrative render of the ${esc(item.brand)} ${esc(item.name)} desktop PC" width="716" height="614" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='./public/images/prebuilts/illustrative-everyday.png'"><figcaption>Illustrative render</figcaption></figure><div><span>${esc(item.brand)} · ${esc(item.performanceTier)}</span><h3><a href="${esc(item.productUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.name)}</a></h3><p>${esc(item.useCases.slice(0,3).join(' · '))}</p><b>${money(item.price)}</b></div></article>`).join('')}
