const sidebar=document.querySelector('.homepage-sidebar');
const toggle=document.querySelector('.sidebar-toggle');
const key='buildwise_home_sidebar_open_v1';
const set=open=>{document.body.classList.toggle('sidebar-open',open);toggle?.setAttribute('aria-expanded',String(open));toggle?.setAttribute('aria-label',open?'Close navigation':'Open navigation');try{localStorage.setItem(key,String(open))}catch{}};
if(sidebar&&toggle){let saved=false;try{saved=localStorage.getItem(key)==='true'}catch{}set(saved);toggle.addEventListener('click',()=>set(!document.body.classList.contains('sidebar-open')));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('sidebar-open'))set(false)})}
