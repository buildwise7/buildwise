const modal=document.querySelector('#signup-modal'),dismissKey='buildwise_signup_dismissed_v1';let opener=null;
const status=(form,message)=>form.querySelector('.signup-status').textContent=message;
const close=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('signup-open');try{localStorage.setItem(dismissKey,String(Date.now()))}catch{}opener?.focus?.()};
const open=()=>{opener=document.activeElement;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('signup-open');modal.querySelector('input')?.focus()};
document.querySelectorAll('[data-signup-form]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const input=form.querySelector('input[type="email"]');if(!input.checkValidity()){input.reportValidity();return}status(form,'Email signup isn’t connected yet — no email has been saved.');}));
modal?.querySelector('.signup-modal-close')?.addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal?.classList.contains('is-open'))close()});
try{const dismissed=Number(localStorage.getItem(dismissKey)||0);if(!dismissed||Date.now()-dismissed>7*864e5)setTimeout(open,25000)}catch{setTimeout(open,25000)}
