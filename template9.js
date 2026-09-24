/* Template9: visual-only helper. No API/business logic changes. */
(function(){
  'use strict';
  function ready(){
    document.documentElement.classList.add('template9-ready');
    var hero=document.getElementById('home');
    var header=document.querySelector('.site-header');
    var overlay=document.getElementById('websiteHeroOverlay');
    if(hero) hero.setAttribute('data-template9-hero','1');
    if(header) header.setAttribute('data-template9-nav','1');
    if(overlay){
      overlay.setAttribute('data-template9-ellipse','1');
      function syncSheetImage(){
        var source=overlay.style.backgroundImage || '';
        var match=source.match(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/i);
        var url=match && (match[1] || match[2] || match[3] || '').trim();
        if(url){
          var imageValue='url('+JSON.stringify(url)+')';
          if(hero.style.getPropertyValue('--lp9-sheet-hero-image')!==imageValue) hero.style.setProperty('--lp9-sheet-hero-image',imageValue);
        }
      }
      syncSheetImage();
      new MutationObserver(syncSheetImage).observe(overlay,{attributes:true,attributeFilter:['style']});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
