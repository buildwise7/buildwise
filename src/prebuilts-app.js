import {prebuiltCatalogue,budgetOptions,useOptions} from './data/prebuilts.js';
import {rankPrebuilts} from './services/prebuilt-matching.js';
import {savePrebuilt} from './services/saved-store.js';

const modal=document.querySelector('#prebuilt-modal'),content=document.querySelector('#prebuilt-content');
let step=0,state={budget:budgetOptions[2],use:useOptions[0],performance:'Balanced'};

const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const imageFileFor=item=>item.image||({
    Entry:'illustrative-everyday.png',
    Everyday:'illustrative-everyday.png',
    Mid:'illustrative-gaming.png',
    High:'illustrative-enthusiast.png'
  }[item.performanceTier]||'illustrative-everyday.png');

const imageAltFor=item=>item.imageAlt||`Illustrative render of the recommended ${item.brand} desktop PC`;

const renderImage=item=>{
  const file=imageFileFor(item);
  const alt=imageAltFor(item);

  return `<figure class="result-image">
    <img
      src="./public/images/prebuilts/${esc(file)}"
      alt="${esc(alt)}"
      width="716"
      height="614"
      loading="lazy"
      onerror="this.onerror=null;this.src='./public/images/prebuilts/illustrative-everyday.png'"
    >
    <figcaption>Illustrative AI-generated render — actual product appearance may vary.</figcaption>
  </figure>`;
};

const card=item=>`<article class="prebuilt-card">
  <figure class="prebuilt-visual">
    <img src="./public/images/prebuilts/${esc(imageFileFor(item))}" alt="${esc(imageAltFor(item))}" width="716" height="614" loading="lazy" onerror="this.onerror=null;this.src='./public/images/prebuilts/illustrative-everyday.png'">
    <figcaption>Illustrative render</figcaption>
  </figure>
  <p class="slot-status">${esc(item.performanceTier)} PERFORMANCE · VERIFIED LISTING</p>
  <h3>${esc(item.name)}</h3>
  <p class="prebuilt-specs"><b>CPU</b> ${esc(item.cpu)}<br><b>GPU</b> ${esc(item.gpu)}<br><b>Memory</b> ${esc(item.ram)} · <b>Storage</b> ${esc(item.storage)}</p>
  <div class="prebuilt-card-footer">
    <strong>${money(item.price)}</strong>
    <a href="${esc(item.productUrl)}" target="_blank" rel="noopener noreferrer">View at retailer ↗</a>
  </div>
</article>`;

document.querySelector('#featured-grid').innerHTML=prebuiltCatalogue.slice(0,6).map(card).join('');

function open(html){
  content.innerHTML=html;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('questionnaire-open');
  requestAnimationFrame(()=>modal.querySelector('.close').focus());
}

function close(){
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('questionnaire-open');
  document.querySelector('#start-prebuilt').focus();
}

document.querySelectorAll('[data-close-prebuilt]').forEach(button=>button.onclick=close);

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&modal.classList.contains('active')){
    event.preventDefault();
    close();
  }
});

document.querySelector('#start-prebuilt').onclick=()=>{
  step=0;
  render();
};

function choices(values,key){
  return `<div class="choice-grid">
    ${values.map(value=>`<button class="choice ${state[key]===value?'selected':''}" data-choice="${key}" data-value="${esc(value)}">${esc(value)}</button>`).join('')}
  </div>`;
}

function render(){
  const title=[
    'What is your budget?',
    'What will you mainly use your PC for?',
    'What matters most?'
  ][step];

  const description=[
    'Choose the range you are comfortable spending.',
    'We’ll prioritise currently verified complete PCs suited to this work.',
    'We’ll use this to favour the right performance tier.'
  ][step];

  const body=step===0
    ?choices(budgetOptions,'budget')
    :step===1
      ?choices(useOptions,'use')
      :choices(['Balanced','Higher performance','Better value'],'performance');

  open(`<div class="prebuilt-flow-head">
    <p class="prebuilt-progress">PRE-BUILT MATCHER · ${String(step+1).padStart(2,'0')}/03</p>
    <h2 id="prebuilt-modal-title">${title}</h2>
    <p>${description}</p>
  </div>
  <div class="flow-body">${body}</div>
  <div class="flow-footer">
    <button class="secondary-button" id="prebuilt-back" ${step===0?'disabled':''}>Back</button>
    <button class="primary-button" id="prebuilt-next">${step===2?'Show matches':'Next'} →</button>
  </div>`);

  content.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
    state[button.dataset.choice]=button.dataset.value;
    render();
  });

  content.querySelector('#prebuilt-back').onclick=()=>{
    step--;
    render();
  };

  content.querySelector('#prebuilt-next').onclick=()=>{
    step===2?results():(step++,render());
  };
}

function save(item){
  return savePrebuilt(item);
}

function componentView(item){
  const specifications=[
    ['CPU / Processor',item.cpu],
    ['GPU / Graphics',item.gpu],
    ['RAM / Memory',item.ram],
    ['Storage',item.storage]
  ].filter(([,value])=>value);

  open(`<div class="prebuilt-flow-head prebuilt-components-head">
    <p class="prebuilt-progress">PRE-BUILT COMPONENTS</p>
    <h2 id="prebuilt-modal-title">What’s inside<br><em>this PC.</em></h2>
    <p>${esc(item.name)} is a complete pre-built system. These are the specifications currently listed in the BuildWise catalogue; they are for reference only.</p>
  </div>
  <section class="prebuilt-components" aria-label="Known components for ${esc(item.name)}">
    <div class="prebuilt-components-summary">
      <span class="tag">${esc(item.brand)} · ${esc(item.performanceTier)} PERFORMANCE</span>
      <b>${money(item.price)}</b>
    </div>
    ${specifications.map(([label,value])=>`<div class="prebuilt-component-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}
  </section>
  <div class="flow-footer prebuilt-components-footer">
    <button class="secondary-button" id="back-to-prebuilt-results">Back to matches</button>
    <a class="primary-button" href="${esc(item.productUrl)}" target="_blank" rel="noopener noreferrer">View details / retailer ↗</a>
  </div>`);

  content.querySelector('#back-to-prebuilt-results').onclick=results;
}

function results(){
  const ranked=rankPrebuilts(prebuiltCatalogue,state);

  open(`<div class="prebuilt-flow-head">
    <p class="prebuilt-progress">YOUR PRE-BUILT MATCHES</p>
    <h2 id="prebuilt-modal-title">Built for your<br><em>next step.</em></h2>
    <p>Prices were checked against the linked manufacturer stores on 29 August 2026. Confirm price and availability with the retailer before buying.</p>
  </div>
  <div class="result-list">
    ${ranked.map(({item},index)=>`<article class="prebuilt-result">
      ${renderImage(item)}
      <div class="prebuilt-result-copy">
        <span class="tag">#${index+1} BEST MATCH · ${esc(item.brand)}</span>
        <h3>${esc(item.name)}</h3>
        <p class="why"><b>Why this match:</b> ${esc(item.useCases.includes(state.use)?`Matches your ${state.use.toLowerCase()} focus`:'A considered option for your chosen budget')} with ${esc(item.performanceTier.toLowerCase())}-tier hardware.</p>
      </div>
      <div class="prebuilt-result-actions">
        <b class="result-price">${money(item.price)}</b>
        <span>Estimated price</span>
        <button class="secondary-button" data-components="${esc(item.id)}">View components</button>
        <a class="secondary-button" href="${esc(item.productUrl)}" target="_blank" rel="noopener noreferrer">View details / retailer ↗</a>
        <button class="primary-button" data-save="${esc(item.id)}">Save build</button>
      </div>
    </article>`).join('')}
  </div>`);

  content.querySelectorAll('[data-save]').forEach(button=>button.onclick=()=>{
    const item=prebuiltCatalogue.find(candidate=>candidate.id===button.dataset.save);

    if(item&&save(item)){
      button.textContent='Saved on this device';
      button.disabled=true;
    }else{
      button.textContent='Could not save';
    }
  });

  content.querySelectorAll('[data-components]').forEach(button=>button.onclick=()=>{
    const item=prebuiltCatalogue.find(candidate=>candidate.id===button.dataset.components);
    if(item)componentView(item);
  });
}
