(function(){
  'use strict';

  var VALID = [1,2,3,4,5,6,7,8,9];
  var JS_TEMPLATES = {4:true,5:true,6:true,7:true,8:true,9:true};
  var site = String(window.LP360_TEMPLATE_SITE || 'site');
  var tokenKey = String(window.LP360_TEMPLATE_ADMIN_TOKEN_KEY || '');
  var api = window.APP_CONFIG && (window.APP_CONFIG.EXEC_URL || window.APP_CONFIG.API_URL) || '';
  var cacheKey = 'LP360:TEMPLATE:' + site + ':' + encodeURIComponent(api || location.origin);
  var current = 1;
  var committed = 1;
  var pending = 1;
  var savingTemplate = false;
  var applyGeneration = 0;
  var lastCssReady = Promise.resolve();
  var bootStyleId = 'lp360UiCriticalBootStyle';

  function startCriticalBoot(){
    try {
      document.documentElement.classList.add('lp360-ui-critical-booting');
      if(!document.getElementById(bootStyleId)){
        var st=document.createElement('style');
        st.id=bootStyleId;
        st.textContent='html.lp360-ui-critical-booting body{visibility:hidden!important}';
        (document.head||document.documentElement).appendChild(st);
      }
    } catch (_) {}
  }
  function revealCriticalBoot(){
    var run=function(){
      try { document.documentElement.classList.remove('lp360-ui-critical-booting'); } catch (_) {}
      var st=document.getElementById(bootStyleId);
      if(st) st.remove();
    };
    if('requestAnimationFrame' in window) requestAnimationFrame(function(){requestAnimationFrame(run);});
    else setTimeout(run,0);
  }
  startCriticalBoot();

  function normalize(value){
    var m = String(value == null ? '' : value).match(/(\d+)/);
    var n = m ? Number(m[1]) : 1;
    return VALID.indexOf(n) !== -1 ? n : 1;
  }
  function readCache(){
    try { return normalize(localStorage.getItem(cacheKey) || 'Template1'); }
    catch (_) { return 1; }
  }
  function writeCache(n){
    try { localStorage.setItem(cacheKey, 'Template' + normalize(n)); } catch (_) {}
  }
  function readCheckedAt(){
    try { return Number(localStorage.getItem(cacheKey + ':checkedAt') || 0) || 0; }
    catch (_) { return 0; }
  }
  function markChecked(){
    try { localStorage.setItem(cacheKey + ':checkedAt', String(Date.now())); } catch (_) {}
  }
  function isIndexPage(){
    var p = String(location.pathname || '');
    return /(?:^|\/)(?:index\.html)?$/.test(p);
  }
  function isSwitcherOpen(){
    var modal=document.getElementById('templateSwitcherModal');
    return !!(modal && !modal.hidden);
  }
  function removeNode(selector){
    document.querySelectorAll(selector).forEach(function(el){ el.remove(); });
  }
  function cleanupDecorations(){
    removeNode('.template4-hero-cta,.template4-hero-side');
    removeNode('.template5-hero-badge,.template5-hero-cta,.template5-hero-side,.template5-performance-strip');
    removeNode('.template6-hero-cta,.template6-ocean-mark');
    removeNode('.template7-hero-cta');
    document.documentElement.classList.remove('template8-ready','template9-ready');
    var hero=document.getElementById('home');
    var header=document.querySelector('.site-header');
    var overlay=document.getElementById('websiteHeroOverlay');
    if(hero){
      hero.removeAttribute('data-template8-hero');
      hero.removeAttribute('data-template9-hero');
    }
    if(header){
      header.removeAttribute('data-template8-nav');
      header.removeAttribute('data-template9-nav');
    }
    if(overlay) overlay.removeAttribute('data-template9-ellipse');
  }
  function setBodyClass(n){
    if(!document.body) return;
    VALID.forEach(function(x){ document.body.classList.remove('lp-template'+x); });
    if(n > 1) document.body.classList.add('lp-template'+n);
    document.documentElement.setAttribute('data-lp-template', 'Template'+n);
  }
  function removeThemeAssets(){
    var oldCss=document.getElementById('lpDynamicTemplateCss');
    if(oldCss) oldCss.remove();
    document.querySelectorAll('script[data-lp-template-script]').forEach(function(s){ s.remove(); });
  }
  function ensureUnifiedAdminStyle(){
    var link=document.getElementById('lpUnifiedAdminStyle');
    if(!link){
      link=document.createElement('link');
      link.id='lpUnifiedAdminStyle';
      link.rel='stylesheet';
      link.href='admin-unified-style.css?v=20260924-1';
    }
    /* Keep this after the active Template CSS so admin controls stay identical
       when switching Template1–Template9 without a reload. */
    if(document.head) document.head.appendChild(link);
    return link;
  }
  ensureUnifiedAdminStyle();

  function ensureStickyHeaderStyle(){
    var link=document.getElementById('lpStickyHeaderStyle');
    if(!link){
      link=document.createElement('link');
      link.id='lpStickyHeaderStyle';
      link.rel='stylesheet';
      link.href='site-header-sticky.css?v=20260924-1';
    }
    /* Always keep this after the active Template CSS. This makes site-header
       sticky for Template1-9 and prevents Template8/9 announcement overlap. */
    if(document.head) document.head.appendChild(link);
    return link;
  }
  ensureStickyHeaderStyle();

  function ensurePopupTemplate1Style(){
    var link=document.getElementById('lpPopupTemplate1Style');
    if(!link){
      link=document.createElement('link');
      link.id='lpPopupTemplate1Style';
      link.rel='stylesheet';
      link.href='popup-template1-lock.css?v=20260924-popup-template1-v2';
    }
    /* Keep this as the final visual layer. Broad Template selectors must never
       turn SweetAlert/admin popups into normal page content. */
    if(document.head) document.head.appendChild(link);
    return link;
  }
  ensurePopupTemplate1Style();

  function loadCss(n){
    if(n===1){ ensureUnifiedAdminStyle(); ensureStickyHeaderStyle(); ensurePopupTemplate1Style(); lastCssReady=Promise.resolve(); return; }
    var link=document.createElement('link');
    link.id='lpDynamicTemplateCss';
    link.rel='stylesheet';
    link.href='template'+n+'.css?v=20260925-template5-remove-learning-v1';
    lastCssReady=new Promise(function(resolve){
      var done=false;
      function finish(){ if(done)return; done=true; resolve(); }
      link.addEventListener('load',finish,{once:true});
      link.addEventListener('error',finish,{once:true});
      setTimeout(finish,2500);
    });
    document.head.appendChild(link);
    ensureUnifiedAdminStyle();
    ensureStickyHeaderStyle();
    ensurePopupTemplate1Style();
  }
  function loadThemeJs(n){
    if(!JS_TEMPLATES[n] || !isIndexPage()) return;
    var script=document.createElement('script');
    script.src='template'+n+'.js?v=20260925-remove-hero-arrows-v1';
    script.setAttribute('data-lp-template-script','Template'+n);
    (document.body || document.head).appendChild(script);
  }
  function applyTemplate(value, options){
    var n=normalize(value);
    options=options||{};
    current=n;
    var generation=++applyGeneration;
    cleanupDecorations();
    removeThemeAssets();
    loadCss(n);
    if(document.body){
      setBodyClass(n);
      loadThemeJs(n);
    }else{
      document.addEventListener('DOMContentLoaded',function(){
        if(generation!==applyGeneration || current!==n) return;
        setBodyClass(n);
        loadThemeJs(n);
      },{once:true});
    }
    if(options.cache===true) writeCache(n);
    refreshChoices();
    window.dispatchEvent(new CustomEvent('lp360:templatechange',{detail:{template:'Template'+n,number:n,preview:options.preview===true}}));
    return n;
  }
  function showUnsavedWarning(){
    var existing=document.getElementById('lp360UnsavedWarning');
    if(existing){ existing.querySelector('button').focus(); return; }
    var previous=document.activeElement;
    var overlay=document.createElement('div');
    overlay.id='lp360UnsavedWarning';
    overlay.setAttribute('role','presentation');
    overlay.innerHTML='<div class="lp360-unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="lp360UnsavedMessage"><p id="lp360UnsavedMessage">มีการแก้ไขที่ยังไม่บันทึก — กด “ยกเลิก” เพื่อทิ้งการแก้ไข</p><button type="button">OK</button></div>';
    if(!document.getElementById('lp360UnsavedWarningStyle')){
      var style=document.createElement('style'); style.id='lp360UnsavedWarningStyle';
      style.textContent='#lp360UnsavedWarning{position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(15,23,42,.55)!important}#lp360UnsavedWarning .lp360-unsaved-dialog{box-sizing:border-box!important;width:min(420px,100%)!important;padding:24px!important;border-radius:14px!important;background:#fff!important;box-shadow:0 20px 60px rgba(0,0,0,.3)!important;text-align:center!important}#lp360UnsavedWarning p{margin:0 0 20px!important;color:#b91c1c!important;font-size:16px!important;font-weight:700!important;line-height:1.5!important}#lp360UnsavedWarning button{min-width:80px!important;padding:9px 22px!important;border:0!important;border-radius:8px!important;background:#b91c1c!important;color:white!important;font-size:14px!important;font-weight:700!important;cursor:pointer!important}';
      document.head.appendChild(style);
    }
    function dismiss(){ overlay.removeEventListener('keydown',trap); overlay.remove(); if(previous && previous.focus) previous.focus(); }
    function trap(e){ if(e.key==='Escape' || e.key==='Enter' || e.key===' '){ e.preventDefault(); e.stopPropagation(); dismiss(); } else if(e.key==='Tab'){ e.preventDefault(); overlay.querySelector('button').focus(); } }
    overlay.addEventListener('keydown',trap);
    overlay.querySelector('button').addEventListener('click',dismiss);
    document.body.appendChild(overlay);
    overlay.querySelector('button').focus();
  }
  function refreshChoices(){
    document.querySelectorAll('#templateSwitcherModal .template-choice').forEach(function(btn){
      var n=normalize(btn.getAttribute('data-template'));
      btn.classList.toggle('is-active',n===current);
      btn.setAttribute('aria-pressed',n===current?'true':'false');
    });
    var currentLabel=document.getElementById('templateSwitcherCurrent');
    if(currentLabel) currentLabel.textContent='Template'+committed;
    var saveBtn=document.getElementById('templateSwitcherSave');
    if(saveBtn) saveBtn.disabled=savingTemplate || (pending===committed);
  }
  function parseServerResult(result){
    if(!result || result.success===false) throw new Error(result && result.message || 'โหลด Template ไม่สำเร็จ');
    return normalize((result.data && result.data.template) || result.template || 'Template1');
  }
  function heroCacheKey(t){
    return 'LP360:HERO_CONTENT:'+site+':'+encodeURIComponent(api||location.origin)+':Template'+normalize(t);
  }
  function readHeroCache(t){
    try { var raw=localStorage.getItem(heroCacheKey(t)); return raw?JSON.parse(raw):null; }
    catch (_) { return null; }
  }
  function writeHeroCache(t,cfg){
    try {
      if(cfg && cfg.configured!==false) localStorage.setItem(heroCacheKey(t),JSON.stringify(cfg));
      else localStorage.removeItem(heroCacheKey(t));
    } catch (_) {}
  }
  function clearHeroInline(){
    var b=document.querySelector('#home .hero-content');
    var els=[document.getElementById('heroTitleText'),document.getElementById('heroKickerText'),document.getElementById('heroDescriptionText')];
    if(b){ b.classList.remove('lp-hero-content-managed'); ['position','left','top','width','max-width','min-width','min-height','height','margin','padding','transform','box-sizing','display','flex-direction','align-items','gap','overflow'].forEach(function(p){b.style.removeProperty(p);}); }
    els.forEach(function(el){ if(el) ['font-size','text-align','color','width','max-width','margin','white-space','overflow-wrap','word-break'].forEach(function(p){el.style.removeProperty(p);}); });
  }
  function applyCriticalHero(cfg,n){
    if(!isIndexPage()) return Promise.resolve();
    return new Promise(function(resolve){
      var run=function(){
        var b=document.querySelector('#home .hero-content');
        if(!b){ resolve(); return; }
        if(!cfg || cfg.configured===false){ clearHeroInline(); resolve(); return; }
        function imp(el,p,v){ if(el) el.style.setProperty(p,String(v),'important'); }
        function clamp(v,min,max,fallback){ v=Number(v); if(!isFinite(v))v=fallback; return Math.max(min,Math.min(max,v)); }
        var x=clamp(cfg.xPct,0,98,5), y=clamp(cfg.yPct,0,98,20);
        var ts=clamp(cfg.titleSize,12,140,56), ks=clamp(cfg.kickerSize,8,56,12), ds=clamp(cfg.descriptionSize,9,72,16);
        var align=['left','center','right'].indexOf(String(cfg.align))>=0?String(cfg.align):'left';
        var visible=!(cfg.visible===false || String(cfg.visible)==='false' || String(cfg.visible)==='0');
        b.classList.add('lp-hero-content-managed');
        imp(b,'position','absolute'); imp(b,'left',x+'%'); imp(b,'top',y+'%'); imp(b,'width','max-content');
        imp(b,'max-width',Math.max(2,100-x)+'%'); imp(b,'min-width','0'); imp(b,'min-height','0'); imp(b,'height','auto'); imp(b,'margin','0'); imp(b,'padding','0'); imp(b,'transform','none'); imp(b,'box-sizing','border-box'); imp(b,'overflow','visible');
        if(visible){ imp(b,'display','flex'); imp(b,'flex-direction','column'); imp(b,'align-items','stretch'); imp(b,'gap','8px'); } else imp(b,'display','none');
        [
          [document.getElementById('heroTitleText'),ts,cfg.titleColor||'#ffffff'],
          [document.getElementById('heroKickerText'),ks,cfg.kickerColor||'#ffffff'],
          [document.getElementById('heroDescriptionText'),ds,cfg.descriptionColor||'#ffffff']
        ].forEach(function(a){ var el=a[0]; if(!el)return; imp(el,'font-size',a[1]+'px'); imp(el,'text-align',align); imp(el,'color',a[2]); imp(el,'width','100%'); imp(el,'max-width','100%'); imp(el,'margin','0'); imp(el,'white-space','pre-line'); imp(el,'overflow-wrap','break-word'); imp(el,'word-break','normal'); });
        var tt=document.getElementById('heroTitleText'), kk=document.getElementById('heroKickerText');
        if(tt){ if(String(cfg.titleWeight||'')==='bold'||String(cfg.titleWeight||'')==='normal') imp(tt,'font-weight',cfg.titleWeight); if(String(cfg.titleStyle||'')==='italic'||String(cfg.titleStyle||'')==='normal') imp(tt,'font-style',cfg.titleStyle); }
        if(kk) imp(kk,'justify-content',align==='center'?'center':(align==='right'?'flex-end':'flex-start'));
        var ov=document.getElementById('websiteHeroOverlay'), hh=document.getElementById('home');
        if(ov&&hh){
          var bg=String(ov.style.backgroundImage||getComputedStyle(ov).backgroundImage||''), re=/url\(\s*(["']?)(.*?)\1\s*\)/ig, mm, heroUrl=''; while((mm=re.exec(bg))) if(mm[2])heroUrl=mm[2];
          var oc=String(cfg.overlayColor||'').trim(), oo=(cfg.overlayOpacity==null?'':String(cfg.overlayOpacity).trim());
          var overlayConfigured=(cfg.overlayConfigured===true||String(cfg.overlayConfigured).toLowerCase()==='true'||(/^#[0-9a-f]{6}$/i.test(oc)&&oo!==''));
          var pct=Math.max(0,Math.min(100,Number(oo===''?72:oo)||0)), rgb=/^#[0-9a-f]{6}$/i.test(oc)?[parseInt(oc.slice(1,3),16),parseInt(oc.slice(3,5),16),parseInt(oc.slice(5,7),16)]:[5,28,44];
          var rgba='rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+(pct/100).toFixed(3)+')';
          var tn=normalize(n), managed=!visible||overlayConfigured;
          [hh,ov].forEach(function(el){el.classList.toggle('lp-hero-overlay-managed',managed); if(managed)el.style.setProperty('--lp-hero-overlay-rgba',visible?rgba:'rgba(0,0,0,0)');else el.style.removeProperty('--lp-hero-overlay-rgba');});
          if(!visible){ if(heroUrl)imp(ov,'background-image','url("'+heroUrl.replace(/"/g,'%22')+'")'); imp(ov,'filter','none'); }
          else if(overlayConfigured&&heroUrl){ ov.style.removeProperty('filter'); if(tn===1||tn===9)imp(ov,'background-image','linear-gradient('+rgba+','+rgba+'),url("'+heroUrl.replace(/"/g,'%22')+'")'); else imp(ov,'background-image','url("'+heroUrl.replace(/"/g,'%22')+'")'); }
        }
        resolve();
      };
      if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
    });
  }
  async function fetchCriticalUi(){
    var fallbackTemplate=committed;
    var fallbackHero=readHeroCache(fallbackTemplate);
    if(!api){
      await lastCssReady; await applyCriticalHero(fallbackHero,fallbackTemplate); revealCriticalBoot();
      return {template:'Template'+fallbackTemplate,hero:fallbackHero,source:'cache'};
    }
    try{
      var sep=api.indexOf('?')===-1?'?':'&';
      var criticalUrl=api+sep+'mode=uicritical&_ts='+Date.now();
      var response=await Promise.race([
        fetch(criticalUrl,{cache:'no-store'}),
        new Promise(function(_,reject){setTimeout(function(){reject(new Error('UI setting timeout'));},3500);})
      ]);
      if(!response.ok) throw new Error('HTTP '+response.status);
      var result=await response.json();
      if(!result || result.success===false) throw new Error(result&&result.message||'โหลด UI setting ไม่สำเร็จ');
      var data=result.data||result;
      var n=normalize(data.template || (data.templateSetting&&data.templateSetting.template) || 'Template1');
      var hero=data.hero || data.heroContent || null;
      committed=n; pending=n; writeCache(n); markChecked();
      applyTemplate(n,{cache:false});
      writeHeroCache(n,hero);
      window.LP360_UI_CRITICAL_DATA={template:'Template'+n,hero:hero||{configured:false,template:'Template'+n},source:'server'};
      await lastCssReady;
      await applyCriticalHero(window.LP360_UI_CRITICAL_DATA.hero,n);
      revealCriticalBoot();
      return window.LP360_UI_CRITICAL_DATA;
    }catch(err){
      console.warn('critical ui setting:',err);
      await lastCssReady;
      await applyCriticalHero(fallbackHero,fallbackTemplate);
      window.LP360_UI_CRITICAL_DATA={template:'Template'+fallbackTemplate,hero:fallbackHero||{configured:false,template:'Template'+fallbackTemplate},source:'cache',error:String(err&&err.message||err)};
      revealCriticalBoot();
      return window.LP360_UI_CRITICAL_DATA;
    }
  }

  async function fetchServerTemplate(){
    if(!api) return committed;
    var sep=api.indexOf('?')===-1?'?':'&';
    var response=await fetch(api+sep+'mode=templatesetting&_ts='+Date.now(),{cache:'no-store'});
    if(!response.ok) throw new Error('HTTP '+response.status);
    var result=await response.json();
    var n=parseServerResult(result);
    committed=n;
    writeCache(n);
    if(!isSwitcherOpen()){
      pending=n;
      applyTemplate(n,{cache:false});
    }else{
      refreshChoices();
    }
    markChecked();
    return n;
  }
  async function saveServerTemplate(n){
    if(!api) throw new Error('ไม่พบ URL ของ Apps Script');
    var token='';
    try { token=sessionStorage.getItem(tokenKey)||''; } catch (_) {}
    if(!token) throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้ง');
    var response=await fetch(api,{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({mode:'templatesettingadmin',token:token,template:'Template'+n})
    });
    if(!response.ok) throw new Error('HTTP '+response.status);
    var result=await response.json();
    if(!result || result.success===false) throw new Error(result && result.message || 'บันทึก Template ไม่สำเร็จ');
    return normalize((result.data && result.data.template) || 'Template'+n);
  }

  committed=readCache();
  pending=committed;
  current=committed;
  applyTemplate(committed,{cache:false});
  window.LP360_UI_CRITICAL_PROMISE=fetchCriticalUi();

  function setupAdminUi(){
    var modal=document.getElementById('templateSwitcherModal');
    var openBtn=document.getElementById('templateSwitcherButton');
    if(!modal || !openBtn) return;
    var grid=modal.querySelector('.template-switcher-grid');
    var closeBtn=modal.querySelector('.template-switcher-close');
    var cancelBtn=document.getElementById('templateSwitcherCancel');
    var saveBtn=document.getElementById('templateSwitcherSave');
    var status=modal.querySelector('.template-switcher-status');
    if(!grid || !closeBtn || !cancelBtn || !saveBtn || !status) return;

    function setTemplateSaving(value){
      savingTemplate=value; saveBtn.classList.toggle('is-saving',value);
      saveBtn.setAttribute('aria-busy',value?'true':'false');
      saveBtn.disabled=value || pending===committed;
      cancelBtn.disabled=value; closeBtn.disabled=value;
      grid.querySelectorAll('button').forEach(function(x){x.disabled=value;});
    }
    grid.innerHTML='';
    VALID.forEach(function(n){
      var b=document.createElement('button');
      b.type='button';
      b.className='template-choice';
      b.setAttribute('data-template',String(n));
      b.setAttribute('aria-label','ดูตัวอย่าง Template'+n);
      b.innerHTML='<strong>Template'+n+'</strong>';
      b.addEventListener('click',function(){
        pending=n;
        applyTemplate(n,{cache:false,preview:true});
        status.className='template-switcher-status is-preview';
        status.textContent='กำลังดูตัวอย่าง Template'+n+' — ยังไม่ได้บันทึก';
        refreshChoices();
      });
      grid.appendChild(b);
    });

    function openSwitcher(){
      pending=committed;
      if(current!==committed) applyTemplate(committed,{cache:false});
      refreshChoices();
      status.className='template-switcher-status';
      status.textContent='เลือก Template เพื่อดูตัวอย่าง แล้วกด “บันทึก Template”';
      modal.hidden=false;
      modal.setAttribute('aria-hidden','false');
      openBtn.hidden=true;
    }
    function closeWithoutSave(allowDiscard){
      if(savingTemplate) return;
      if(pending!==committed && !allowDiscard){
        showUnsavedWarning();
        return;
      }
      pending=committed;
      applyTemplate(committed,{cache:true});
      modal.hidden=true;
      modal.setAttribute('aria-hidden','true');
      openBtn.hidden=false;
    }
    function closeAfterSave(){
      modal.hidden=true;
      modal.setAttribute('aria-hidden','true');
      openBtn.hidden=false;
    }

    openBtn.addEventListener('click',openSwitcher);
    closeBtn.addEventListener('click',function(){closeWithoutSave(false);});
    cancelBtn.addEventListener('click',function(){closeWithoutSave(true);});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape' && !modal.hidden) closeWithoutSave();
    });

    saveBtn.addEventListener('click',async function(){
      if(savingTemplate) return;
      var chosen=pending;
      if(chosen===committed){
        status.className='template-switcher-status is-success';
        status.textContent='Template'+committed+' เป็น Template ที่บันทึกอยู่แล้ว';
        setTimeout(closeAfterSave,250);
        return;
      }
      status.className='template-switcher-status';
      status.textContent='กำลังบันทึก Template'+chosen+'...';
      setTemplateSaving(true);
      try{
        var saved=await saveServerTemplate(chosen);
        committed=saved;
        pending=saved;
        applyTemplate(saved,{cache:true});
        markChecked();
        status.className='template-switcher-status is-success';
        status.textContent='บันทึก Template'+saved+' แล้ว';
        setTimeout(closeAfterSave,350);
      }catch(err){
        status.className='template-switcher-status is-error';
        status.textContent='บันทึกไม่สำเร็จ: '+err.message+' — กรุณาลองบันทึกอีกครั้ง';
      }finally{
        setTemplateSaving(false);
        refreshChoices();
      }
    });

    refreshChoices();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupAdminUi,{once:true});
  else setupAdminUi();

  window.LP360TemplateSwitcher={
    getCurrent:function(){return 'Template'+current;},
    getSaved:function(){return 'Template'+committed;},
    apply:function(n){
      var value=normalize(n);
      committed=value;
      pending=value;
      return applyTemplate(value,{cache:true});
    },
    refresh:fetchServerTemplate
  };
})();
