/* Template6 decorative helper only. No API/login/admin/business logic changes. */
(function(){
  'use strict';
  function boot(){
    var hero=document.getElementById('home');
    var content=hero&&hero.querySelector('.hero-content');
    if(!hero||!content)return;

    content.querySelector('.template6-hero-cta')?.remove();

    if(!hero.querySelector('.template6-ocean-mark')){
      var mark=document.createElement('div');
      mark.className='template6-ocean-mark';
      mark.setAttribute('aria-hidden','true');
      mark.textContent='≈';
      hero.appendChild(mark);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
