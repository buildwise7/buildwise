const TERMS_VERSION = '1';
const ACCEPTED_KEY = 'buildwise_terms_accepted';
const VERSION_KEY = 'buildwise_terms_version';
const appRegions = [...document.querySelectorAll('header, main, footer')];

const fullTerms = `
  <h2 id="terms-document-title">Terms &amp; Conditions</h2>
  <p>By using BuildWise, you acknowledge and agree that the information displayed on this website is provided for general informational purposes only.</p>
  <h3>PRODUCT COMPATIBILITY</h3><p>Computer parts, components, accessories, products, specifications, recommendations, or other items displayed on BuildWise are not guaranteed to be compatible with each other.</p><p>Users are responsible for independently checking compatibility, specifications, requirements, dimensions, power requirements, connections, software requirements, and manufacturer documentation before purchasing, installing, or using any product.</p><p>BuildWise does not guarantee that information relating to product compatibility, pricing, availability, specifications, performance, or other product information is complete, accurate, or up to date.</p>
  <h3>THIRD-PARTY WEBSITES AND LINKS</h3><p>BuildWise may contain links to third-party websites.</p><p>BuildWise does not control these external websites and is not responsible for their content, availability, security, accuracy, privacy practices, malware, corrupted or broken links, compromised websites, hacking incidents, downloads, or other problems arising from third-party websites.</p><p>Users should use caution before following external links, downloading files, entering personal information, or making purchases on third-party websites.</p>
  <h3>LAWFUL USE</h3><p>Every person using BuildWise must use the website lawfully.</p><p>Users must not use BuildWise for illegal, fraudulent, harmful, abusive, deceptive, or unauthorized activities.</p><p>Users must comply with applicable laws and regulations when using BuildWise, including laws relating to privacy, data protection, computer misuse, fraud, intellectual property, and online safety.</p>
  <h3>PRIVACY AND PRIVATE INFORMATION</h3><p>Users must respect the privacy and personal information of other people.</p><p>Users must not intentionally collect, share, publish, expose, misuse, steal, or attempt to access another person's private or personal information without proper permission or a lawful reason.</p><p>Users are responsible for keeping private information, passwords, account details, personal data, or other sensitive information they obtain or control secure.</p><p>Users should not publicly post passwords, payment information, authentication details, private account information, or other sensitive personal information on BuildWise.</p>
  <h3>USE AT YOUR OWN RISK</h3><p>Users use BuildWise and any information, links, recommendations, or resources provided through this website at their own risk.</p><p>Users should verify important information directly with the relevant manufacturer, retailer, or another official source before making purchasing or technical decisions.</p>
  <h3>LIMITATION OF LIABILITY</h3><p>To the maximum extent permitted by applicable law, BuildWise and its owner are not responsible for losses, damages, costs, hardware problems, software problems, data loss, security issues, compatibility problems, purchasing decisions, or other consequences resulting from the use of, or reliance on, information or third-party links provided through this website.</p><p>Nothing in these Terms &amp; Conditions excludes or limits any responsibility that cannot legally be excluded or limited under applicable law.</p>`;

const layer = document.createElement('section');
layer.className = 'terms-layer';
layer.setAttribute('aria-hidden', 'true');
layer.innerHTML = `<div class="terms-scrim"></div><section class="terms-panel" role="dialog" aria-modal="true" aria-labelledby="terms-title"><div class="terms-panel-inner"><div><h2 id="terms-title">Terms &amp; Conditions</h2><p>Please review and accept our Terms &amp; Conditions. BuildWise provides computer part information, product links, compatibility information, and other resources for informational purposes. Product compatibility is not guaranteed. You must accept the Terms &amp; Conditions before continuing to use BuildWise.</p></div><div class="terms-actions"><button class="primary-button" type="button" data-terms-accept>Accept</button><button class="secondary-button" type="button" data-terms-more>More Info</button><button class="secondary-button" type="button" data-terms-close hidden>Close</button></div></div></section><div class="terms-details" hidden><section class="terms-document" role="dialog" aria-modal="true" aria-labelledby="terms-document-title"><button class="terms-close" type="button" aria-label="Back to Terms & Conditions summary" data-terms-back>×</button><div data-terms-text>${fullTerms}</div><footer><button class="secondary-button" type="button" data-terms-back>Back</button></footer></section></div>`;
document.body.append(layer);

let mandatory = false;
let lastFocus = null;
const focusable = () => [...layer.querySelectorAll('button:not([disabled]), [href], input:not([disabled])')].filter(el => !el.closest('[hidden]'));
const accepted = () => localStorage.getItem(ACCEPTED_KEY) === 'true' && localStorage.getItem(VERSION_KEY) === TERMS_VERSION;
function lockPage(){document.body.classList.add('terms-locked');appRegions.forEach(region=>{region.inert=true;region.setAttribute('aria-hidden','true')})}
function unlockPage(){document.body.classList.remove('terms-locked');appRegions.forEach(region=>{region.inert=false;region.removeAttribute('aria-hidden')})}
function show(mustAccept){mandatory=mustAccept;lastFocus=document.activeElement;layer.classList.add('is-open');layer.setAttribute('aria-hidden','false');layer.querySelector('.terms-panel').hidden=false;layer.querySelector('.terms-details').hidden=true;layer.querySelector('[data-terms-close]').hidden=mandatory;if(mandatory)lockPage();setTimeout(()=>layer.querySelector(mandatory?'[data-terms-accept]':'[data-terms-close]')?.focus(),0)}
function hide(){if(mandatory)return;layer.classList.remove('is-open');layer.setAttribute('aria-hidden','true');unlockPage();lastFocus?.focus?.()}
function showDocument(){layer.querySelector('.terms-panel').hidden=true;layer.querySelector('.terms-details').hidden=false;setTimeout(()=>layer.querySelector('.terms-close').focus(),0)}
function showSummary(){layer.querySelector('.terms-panel').hidden=false;layer.querySelector('.terms-details').hidden=true;setTimeout(()=>layer.querySelector(mandatory?'[data-terms-accept]':'.terms-close')?.focus(),0)}

layer.querySelector('[data-terms-accept]').addEventListener('click',()=>{localStorage.setItem(ACCEPTED_KEY,'true');localStorage.setItem(VERSION_KEY,TERMS_VERSION);mandatory=false;layer.classList.remove('is-open');layer.setAttribute('aria-hidden','true');unlockPage();lastFocus?.focus?.()});
layer.querySelector('[data-terms-more]').addEventListener('click',showDocument);
layer.querySelector('[data-terms-close]').addEventListener('click',hide);
layer.querySelectorAll('[data-terms-back]').forEach(button=>button.addEventListener('click',showSummary));
layer.addEventListener('keydown',event=>{if(event.key==='Escape'&&mandatory){event.preventDefault();return}if(event.key==='Tab'){const items=focusable();const first=items[0],last=items.at(-1);if(!items.length)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
document.querySelectorAll('[data-open-terms]').forEach(button=>button.addEventListener('click',()=>show(false)));
if(!accepted())show(true);

export { TERMS_VERSION };
