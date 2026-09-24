/* Template7 decorative helper only. No API/login/admin/business logic changes. */
(function(){
  'use strict';
  function boot(){
    var hero=document.getElementById('home');
    var content=hero&&hero.querySelector('.hero-content');
    if(!hero||!content)return;
    content.querySelector('.template7-hero-cta')?.remove();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
