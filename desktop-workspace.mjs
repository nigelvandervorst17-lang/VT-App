/* Desktop navigation bridges only to the existing bottom-nav handlers.
 * No calculator, safety, reference, IQI or account permission logic.
 */
function init(){
 const buttons=[...document.querySelectorAll('[data-desk-nav]')];
 if(!buttons.length)return;
 const go=page=>{
  const existing=document.querySelector('.bottom-nav [data-nav="'+page+'"]')||
   document.querySelector('#moreMenu [data-nav="'+page+'"]');
  if(existing)existing.click();
 };
 const refresh=()=>{
  const active=document.querySelector('.screen.is-active')?.dataset.screen||'calc';
  for(const button of buttons){
   const match=button.dataset.deskNav===active;
   button.classList.toggle('active',match);
   if(match)button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  }
 };
 for(const button of buttons)button.addEventListener('click',()=>{go(button.dataset.deskNav);refresh();});
 document.querySelectorAll('[data-open-help]').forEach(button=>button.addEventListener('click',()=>{go('help');refresh();}));
 document.querySelectorAll('[data-open-screen]').forEach(button=>button.addEventListener('click',()=>{go(button.dataset.openScreen);refresh();}));
 document.querySelectorAll('[data-help-target]').forEach(button=>button.addEventListener('click',()=>{
  document.getElementById(button.dataset.helpTarget)?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 for(const item of document.querySelectorAll('.bottom-nav [data-nav],#moreMenu [data-nav]')){
  item.addEventListener('click',()=>requestAnimationFrame(refresh));
 }
 refresh();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
