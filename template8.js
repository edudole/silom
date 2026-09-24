/* Template8: visual-only helper. No API/business logic changes. */
(function(){
  'use strict';
  function ready(){
    document.documentElement.classList.add('template8-ready');
    var hero=document.getElementById('home');
    var header=document.querySelector('.site-header');
    if(hero && header){
      hero.setAttribute('data-template8-hero','1');
      header.setAttribute('data-template8-nav','1');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
