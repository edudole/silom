(function(){
  'use strict';
  var api = window.APP_CONFIG && (window.APP_CONFIG.EXEC_URL || window.APP_CONFIG.API_URL) || '';
  var site = String(window.LP360_TEMPLATE_SITE || 'site');
  var tokenKey = String(window.LP360_TEMPLATE_ADMIN_TOKEN_KEY || '');
  var committed = null;
  var pending = null;
  var activeTemplate = templateName();
  var panelOpen = false;
  var drag = null;
  var lastHeroImageUrl = '';
  var overlayObserver = null;

  function clamp(v,min,max){ v=Number(v); if(!isFinite(v)) v=min; return Math.max(min,Math.min(max,v)); }
  function templateName(value){
    var raw = value || document.documentElement.getAttribute('data-lp-template') || 'Template1';
    var m=String(raw).match(/(\d+)/); var n=m?Number(m[1]):1; if(n<1||n>9)n=1; return 'Template'+n;
  }
  function templateNumber(value){var m=templateName(value).match(/(\d+)/);return m?Number(m[1]):1;}
  function cacheKey(t){ return 'LP360:HERO_CONTENT:'+site+':'+encodeURIComponent(api||location.origin)+':'+templateName(t); }
  function clone(v){ return v ? JSON.parse(JSON.stringify(v)) : null; }
  function readCache(t){ try{ var x=localStorage.getItem(cacheKey(t)); return x?JSON.parse(x):null; }catch(_){return null;} }
  function writeCache(t,v){ try{ localStorage.setItem(cacheKey(t),JSON.stringify(v)); }catch(_){} }
  function clearCache(t){ try{localStorage.removeItem(cacheKey(t));}catch(_){} }

  function hero(){ return document.getElementById('home'); }
  function overlay(){ return document.getElementById('websiteHeroOverlay'); }
  function box(){ return document.querySelector('#home .hero-content'); }
  function title(){ return document.getElementById('heroTitleText'); }
  function kicker(){ return document.getElementById('heroKickerText'); }
  function desc(){ return document.getElementById('heroDescriptionText'); }
  function imp(el,p,v){ if(el) el.style.setProperty(p,String(v),'important'); }
  function remove(el,p){ if(el) el.style.removeProperty(p); }
  function setImportant(el,p,v){
    if(!el)return;
    v=String(v);
    if(el.style.getPropertyValue(p)!==v || el.style.getPropertyPriority(p)!=='important') el.style.setProperty(p,v,'important');
  }

  function validHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||'').trim());}
  function normalizeConfig(data){
    if(!data || data.configured===false) return {configured:false,template:templateName(data&&data.template)};
    var rawOverlayColor=String(data.overlayColor||'').trim();
    var rawOverlayOpacity=(data.overlayOpacity==null?'':String(data.overlayOpacity).trim());
    var overlayConfigured=(data.overlayConfigured===true || String(data.overlayConfigured).toLowerCase()==='true' || (validHex(rawOverlayColor) && rawOverlayOpacity!==''));
    return {
      configured:true, template:templateName(data.template||activeTemplate),
      xPct:clamp(data.xPct,0,98), yPct:clamp(data.yPct,0,98), widthPct:clamp(data.widthPct,20,100),
      titleSize:clamp(data.titleSize,12,140), kickerSize:clamp(data.kickerSize,8,56), descriptionSize:clamp(data.descriptionSize,9,72),
      align:['left','center','right'].indexOf(String(data.align))>=0?String(data.align):'left',
      titleColor:String(data.titleColor||'#ffffff'), kickerColor:String(data.kickerColor||'#ffffff'), descriptionColor:String(data.descriptionColor||'#ffffff'),
      titleWeight:String(data.titleWeight||'').toLowerCase()==='bold'?'bold':(String(data.titleWeight||'').toLowerCase()==='normal'?'normal':'template'),
      titleStyle:String(data.titleStyle||'').toLowerCase()==='italic'?'italic':(String(data.titleStyle||'').toLowerCase()==='normal'?'normal':'template'),
      visible:data.visible!==false && String(data.visible)!=='false' && String(data.visible)!=='0',
      overlayConfigured:overlayConfigured,
      overlayColor:validHex(rawOverlayColor)?rawOverlayColor.toLowerCase():'#051c2c',
      overlayOpacity:rawOverlayOpacity===''?72:clamp(rawOverlayOpacity,0,100),
      overlayMode:['left','right','uniform'].indexOf(String(data.overlayMode||'').toLowerCase())>=0?String(data.overlayMode).toLowerCase():'uniform'
    };
  }

  function extractBackgroundUrl(value){
    var text=String(value||''), re=/url\(\s*(["']?)(.*?)\1\s*\)/ig, m, found='';
    while((m=re.exec(text))) if(m[2]) found=m[2];
    return found;
  }
  function rememberHeroImageUrl(){
    var o=overlay(); if(!o)return lastHeroImageUrl;
    var found=extractBackgroundUrl(o.style.backgroundImage||'') || extractBackgroundUrl(getComputedStyle(o).backgroundImage||'');
    if(found) lastHeroImageUrl=found;
    return lastHeroImageUrl;
  }
  function escapedUrl(url){return String(url||'').replace(/"/g,'%22');}
  function defaultHeroBackground(url){
    if(!url)return '';
    return 'linear-gradient(90deg,rgba(5,28,44,.96) 0%,rgba(5,28,44,.79) 40%,rgba(5,28,44,.1) 78%),url("'+escapedUrl(url)+'")';
  }
  function rgbFromHex(hex){
    var h=validHex(hex)?String(hex).slice(1):'051c2c';
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function overlayRgba(cfg,alphaScale){
    var rgb=rgbFromHex(cfg.overlayColor), a=(clamp(cfg.overlayOpacity,0,100)/100)*(alphaScale==null?1:Number(alphaScale));
    a=clamp(a,0,1);
    return 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+a.toFixed(3)+')';
  }
  function overlayFill(cfg){
    var mode=['left','right','uniform'].indexOf(String(cfg.overlayMode||'').toLowerCase())>=0?String(cfg.overlayMode).toLowerCase():'uniform';
    var full=overlayRgba(cfg,1), mid=overlayRgba(cfg,.68), light=overlayRgba(cfg,.18), clear=overlayRgba(cfg,0);
    if(mode==='left') return 'linear-gradient(90deg,'+full+' 0%,'+mid+' 42%,'+light+' 76%,'+clear+' 100%)';
    if(mode==='right') return 'linear-gradient(90deg,'+clear+' 0%,'+light+' 24%,'+mid+' 58%,'+full+' 100%)';
    return 'linear-gradient(90deg,'+full+' 0%,'+full+' 100%)';
  }
  function setOverlayManaged(on, rgba, fill){
    var h=hero(), o=overlay();
    [h,o].forEach(function(el){
      if(!el)return;
      el.classList.toggle('lp-hero-overlay-managed',!!on);
      if(on){
        el.style.setProperty('--lp-hero-overlay-rgba',rgba||'rgba(0,0,0,0)');
        el.style.setProperty('--lp-hero-overlay-fill',fill||'linear-gradient(transparent,transparent)');
      } else {
        el.style.removeProperty('--lp-hero-overlay-rgba');
        el.style.removeProperty('--lp-hero-overlay-fill');
      }
    });
  }
  function clearOverlayCustom(){
    var o=overlay(); if(!o)return;
    var url=rememberHeroImageUrl();
    setOverlayManaged(false,'','');
    remove(o,'filter');
    if(url) setImportant(o,'background-image',defaultHeroBackground(url));
    else remove(o,'background-image');
  }
  function applyOverlay(cfg){
    var o=overlay(); if(!o||!cfg||cfg.configured===false)return;
    var url=rememberHeroImageUrl();
    var visible=cfg.visible!==false;
    var n=templateNumber(cfg.template||activeTemplate);
    if(!visible){
      // Hide only the configurable tint. Template5 keeps its own decorative
      // diagonal layers / LEARNING artwork and original image treatment.
      setOverlayManaged(true,'rgba(0,0,0,0)','linear-gradient(transparent,transparent)');
      if(url) setImportant(o,'background-image','url("'+escapedUrl(url)+'")');
      else setImportant(o,'background-image','none');
      if(n===5) remove(o,'filter');
      else setImportant(o,'filter','none');
      return;
    }
    remove(o,'filter');
    if(!cfg.overlayConfigured){
      setOverlayManaged(false,'','');
      if(url) setImportant(o,'background-image',defaultHeroBackground(url));
      return;
    }
    var rgba=overlayRgba(cfg), fill=overlayFill(cfg);
    setOverlayManaged(true,rgba,fill);
    if(url){
      if(n===1 || n===9) setImportant(o,'background-image',fill+',url("'+escapedUrl(url)+'")');
      else setImportant(o,'background-image','url("'+escapedUrl(url)+'")');
    } else if(n===1 || n===9){
      setImportant(o,'background-image',fill);
    }
  }
  function setupOverlayWatcher(){
    var o=overlay(); if(!o||overlayObserver)return;
    rememberHeroImageUrl();
    overlayObserver=new MutationObserver(function(){
      var url=extractBackgroundUrl(o.style.backgroundImage||''); if(url)lastHeroImageUrl=url;
      var cfg=panelOpen&&pending?pending:committed;
      if(!cfg||cfg.configured===false)return;
      Promise.resolve().then(function(){applyOverlay(cfg);});
    });
    overlayObserver.observe(o,{attributes:true,attributeFilter:['style']});
  }

  function clearCustom(){
    var b=box(), els=[title(),kicker(),desc()];
    if(b) b.classList.remove('lp-hero-content-managed');
    ['position','left','top','width','max-width','min-width','min-height','height','margin','padding','transform','box-sizing','display','flex-direction','align-items','gap','overflow'].forEach(function(p){remove(b,p);});
    els.forEach(function(el){['font-size','text-align','color','width','max-width','margin','white-space','overflow-wrap','word-break','font-weight','font-style','justify-content'].forEach(function(p){remove(el,p);});});
    clearOverlayCustom();
  }
  function applyConfig(data){
    var cfg=normalizeConfig(data), h=hero(), b=box(); if(!h||!b)return;
    if(!cfg.configured){ clearCustom(); return; }
    b.classList.add('lp-hero-content-managed');
    imp(b,'position','absolute'); imp(b,'left',cfg.xPct+'%'); imp(b,'top',cfg.yPct+'%');
    imp(b,'width','max-content'); imp(b,'max-width',Math.max(2,100-cfg.xPct)+'%'); imp(b,'min-width','0');
    imp(b,'min-height','0'); imp(b,'height','auto'); imp(b,'margin','0'); imp(b,'padding','0'); imp(b,'transform','none'); imp(b,'box-sizing','border-box'); imp(b,'overflow','visible');
    if(cfg.visible){ imp(b,'display','flex'); imp(b,'flex-direction','column'); imp(b,'align-items','stretch'); imp(b,'gap','8px'); } else imp(b,'display','none');
    [[title(),cfg.titleSize,cfg.titleColor],[kicker(),cfg.kickerSize,cfg.kickerColor],[desc(),cfg.descriptionSize,cfg.descriptionColor]].forEach(function(a){
      var el=a[0]; if(!el)return; imp(el,'font-size',a[1]+'px'); imp(el,'text-align',cfg.align); imp(el,'color',a[2]); imp(el,'width','100%'); imp(el,'max-width','100%'); imp(el,'margin','0'); imp(el,'white-space','pre-line'); imp(el,'overflow-wrap','break-word'); imp(el,'word-break','normal');
    });
    if(cfg.titleWeight==='template') remove(title(),'font-weight'); else imp(title(),'font-weight',cfg.titleWeight);
    if(cfg.titleStyle==='template') remove(title(),'font-style'); else imp(title(),'font-style',cfg.titleStyle);
    var kickerJustify=cfg.align==='center'?'center':(cfg.align==='right'?'flex-end':'flex-start');
    imp(kicker(),'justify-content',kickerJustify);
    applyOverlay(cfg);
  }
  function captureCurrent(){
    var h=hero(), b=box(); if(!h||!b)return normalizeConfig({configured:true,template:activeTemplate,xPct:5,yPct:20,widthPct:55,titleSize:56,kickerSize:12,descriptionSize:16,align:'left',titleColor:'#ffffff',kickerColor:'#ffffff',descriptionColor:'#ffffff',titleWeight:'normal',titleStyle:'normal',visible:true,overlayConfigured:false,overlayMode:'uniform'});
    var hr=h.getBoundingClientRect(), br=b.getBoundingClientRect();
    var ts=title()?parseFloat(getComputedStyle(title()).fontSize):56;
    var ks=kicker()?parseFloat(getComputedStyle(kicker()).fontSize):12;
    var ds=desc()?parseFloat(getComputedStyle(desc()).fontSize):16;
    var align=title()?getComputedStyle(title()).textAlign:'left'; if(['left','center','right'].indexOf(align)<0)align='left';
    var titleComputed=title()?getComputedStyle(title()):null;
    var titleWeight=titleComputed&&((parseInt(titleComputed.fontWeight,10)||0)>=600||/bold/i.test(titleComputed.fontWeight))?'bold':'normal';
    var titleStyle=titleComputed&&/(italic|oblique)/i.test(titleComputed.fontStyle)?'italic':'normal';
    return normalizeConfig({configured:true,template:activeTemplate,
      xPct:hr.width?((br.left-hr.left)/hr.width*100):5, yPct:hr.height?((br.top-hr.top)/hr.height*100):20,
      widthPct:hr.width?(br.width/hr.width*100):55, titleSize:ts,kickerSize:ks,descriptionSize:ds,align:align,
      titleColor:title()?getComputedStyle(title()).color:'#ffffff',kickerColor:kicker()?getComputedStyle(kicker()).color:'#ffffff',descriptionColor:desc()?getComputedStyle(desc()).color:'#ffffff',
      titleWeight:titleWeight,titleStyle:titleStyle,visible:getComputedStyle(b).display!=='none',overlayConfigured:false,overlayColor:'#051c2c',overlayOpacity:72,overlayMode:'uniform'});
  }
  function colorToHex(value){
    var v=String(value||'').trim(); if(/^#[0-9a-f]{6}$/i.test(v))return v;
    var m=v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if(!m)return '#ffffff';
    return '#'+[m[1],m[2],m[3]].map(function(x){return Math.max(0,Math.min(255,Number(x))).toString(16).padStart(2,'0');}).join('');
  }
  function parseResult(result){
    if(!result || result.success===false) throw new Error(result&&result.message||'โหลดการตั้งค่า Hero ไม่สำเร็จ');
    return normalizeConfig(result.data||result);
  }
  async function fetchSetting(t){
    t=templateName(t); if(!api)return null;
    var sep=api.indexOf('?')===-1?'?':'&';
    var response=await fetch(api+sep+'mode=herocontentsetting&template='+encodeURIComponent(t)+'&_ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    var cfg=parseResult(await response.json());
    if(cfg.configured)writeCache(t,cfg); else clearCache(t);
    if(t===activeTemplate && !panelOpen){ committed=clone(cfg); applyConfig(cfg); }
    return cfg;
  }
  async function saveSetting(cfg){
    if(!api)throw new Error('ไม่พบ URL ของ Apps Script');
    var token=''; try{token=sessionStorage.getItem(tokenKey)||'';}catch(_){}
    if(!token)throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้ง');
    var response=await fetch(api,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({mode:'herocontentadmin',token:token,template:activeTemplate,data:cfg})});
    if(!response.ok)throw new Error('HTTP '+response.status);
    var result=await response.json(); if(!result||result.success===false)throw new Error(result&&result.message||'บันทึก Hero ไม่สำเร็จ');
    return normalizeConfig(result.data||cfg);
  }

  function applyInitial(){
    activeTemplate=templateName();
    function adoptCritical(data){
      if(!data) return false;
      var t=templateName(data.template||activeTemplate);
      if(t!==activeTemplate) return false;
      var cfg=normalizeConfig(data.hero||{configured:false,template:t});
      committed=clone(cfg);
      if(cfg.configured) writeCache(t,cfg); else clearCache(t);
      applyConfig(cfg);
      return true;
    }
    if(adoptCritical(window.LP360_UI_CRITICAL_DATA)) return;
    if(window.LP360_UI_CRITICAL_PROMISE && typeof window.LP360_UI_CRITICAL_PROMISE.then==='function'){
      window.LP360_UI_CRITICAL_PROMISE.then(function(data){
        activeTemplate=templateName();
        adoptCritical(data);
      }).catch(function(e){console.warn('hero critical setting:',e);});
      return;
    }
    var cached=readCache(activeTemplate);
    if(cached){ committed=normalizeConfig(cached); applyConfig(committed); }
    fetchSetting(activeTemplate).catch(function(e){console.warn('hero content setting:',e);});
  }

  function setupUi(){
    var openBtn=document.getElementById('heroContentEditorButton'), panel=document.getElementById('heroContentEditorPanel'); if(!openBtn||!panel)return;
    if(openBtn.parentElement!==document.body) document.body.appendChild(openBtn);
    var closeBtn=document.getElementById('heroContentEditorClose'), cancelBtn=document.getElementById('heroContentEditorCancel'), saveBtn=document.getElementById('heroContentEditorSave');
    var status=document.getElementById('heroContentEditorStatus'), eye=document.getElementById('heroContentVisibility');
    var outputs={title:document.getElementById('heroTitleSizeValue'),kicker:document.getElementById('heroKickerSizeValue'),desc:document.getElementById('heroDescriptionSizeValue'),overlay:document.getElementById('heroOverlayOpacityValue')};
    var colors={title:document.getElementById('heroTitleColor'),kicker:document.getElementById('heroKickerColor'),desc:document.getElementById('heroDescriptionColor'),overlay:document.getElementById('heroOverlayColor')};
    var overlayOpacity=document.getElementById('heroOverlayOpacity');
    var overlayModeButtons=panel.querySelectorAll('[data-hero-overlay-mode]');

    var savingHero=false, unsavedHero=false;
    function setHeroSaving(value){ savingHero=value; saveBtn.disabled=value; saveBtn.classList.toggle('is-saving',value); saveBtn.setAttribute('aria-busy',value?'true':'false'); closeBtn.disabled=value; cancelBtn.disabled=value; }
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
    function setStatus(text,kind){ status.textContent=text||''; status.className='hero-editor-status'+(kind?' is-'+kind:''); }
    function syncUi(){
      if(!pending)return; outputs.title.textContent=Math.round(pending.titleSize)+'px'; outputs.kicker.textContent=Math.round(pending.kickerSize)+'px'; outputs.desc.textContent=Math.round(pending.descriptionSize)+'px';
      colors.title.value=colorToHex(pending.titleColor); colors.kicker.value=colorToHex(pending.kickerColor); colors.desc.value=colorToHex(pending.descriptionColor);
      if(colors.overlay) colors.overlay.value=colorToHex(pending.overlayColor||'#051c2c');
      if(overlayOpacity) overlayOpacity.value=String(Math.round(pending.overlayOpacity==null?72:pending.overlayOpacity));
      if(outputs.overlay) outputs.overlay.textContent=Math.round(pending.overlayOpacity==null?72:pending.overlayOpacity)+'%';
      panel.querySelectorAll('[data-hero-align]').forEach(function(btn){btn.classList.toggle('is-active',btn.getAttribute('data-hero-align')===pending.align);});
      panel.querySelectorAll('[data-hero-title-weight]').forEach(function(btn){btn.classList.toggle('is-active',btn.getAttribute('data-hero-title-weight')===pending.titleWeight);});
      panel.querySelectorAll('[data-hero-title-style]').forEach(function(btn){btn.classList.toggle('is-active',btn.getAttribute('data-hero-title-style')===pending.titleStyle);});
      overlayModeButtons.forEach(function(btn){btn.classList.toggle('is-active',btn.getAttribute('data-hero-overlay-mode')===pending.overlayMode);});
      eye.classList.toggle('is-off',!pending.visible); eye.innerHTML=pending.visible?'<i class="fa-solid fa-eye"></i> แสดง':'<i class="fa-solid fa-eye-slash"></i> ซ่อน';
    }
    function preview(){ if(!pending)return; unsavedHero=true; pending.configured=true; pending.template=activeTemplate; applyConfig(pending); syncUi(); setStatus('กำลังดูตัวอย่าง — กด “บันทึก” เพื่อบันทึกลงชีต',''); }
    function open(){
      if(savingHero || panelOpen) return;
      activeTemplate=templateName();
      var cached=readCache(activeTemplate); if(cached)committed=normalizeConfig(cached);
      pending=committed&&committed.configured?clone(committed):captureCurrent();
      if(pending.titleWeight==='template'||pending.titleStyle==='template'){
        var tc=title()?getComputedStyle(title()):null;
        if(pending.titleWeight==='template') pending.titleWeight=tc&&((parseInt(tc.fontWeight,10)||0)>=600||/bold/i.test(tc.fontWeight))?'bold':'normal';
        if(pending.titleStyle==='template') pending.titleStyle=tc&&/(italic|oblique)/i.test(tc.fontStyle)?'italic':'normal';
      }
      pending.template=activeTemplate; unsavedHero=false; panel.hidden=false; panel.setAttribute('aria-hidden','false'); panelOpen=true; document.body.classList.add('hero-content-editing'); preview(); unsavedHero=false;
    }
    function close(revert,allowDiscard){
      if(savingHero) return;
      if(revert && unsavedHero && !allowDiscard){ showUnsavedWarning(); return; }
      panel.hidden=true; panel.setAttribute('aria-hidden','true'); panelOpen=false; document.body.classList.remove('hero-content-editing');
      if(revert){ if(committed&&committed.configured)applyConfig(committed); else clearCustom(); }
      pending=null; drag=null; unsavedHero=false;
    }
    openBtn.addEventListener('click',open); closeBtn.addEventListener('click',function(){close(true);}); cancelBtn.addEventListener('click',function(){close(true,true);});
    eye.addEventListener('click',function(){ if(!pending)return; pending.visible=!pending.visible; preview(); });
    panel.querySelectorAll('[data-hero-step]').forEach(function(btn){btn.addEventListener('click',function(){ if(!pending)return; var key=btn.getAttribute('data-hero-step'), d=Number(btn.getAttribute('data-delta')||0); if(key==='titleSize')pending.titleSize=clamp(pending.titleSize+d,12,140); if(key==='kickerSize')pending.kickerSize=clamp(pending.kickerSize+d,8,56); if(key==='descriptionSize')pending.descriptionSize=clamp(pending.descriptionSize+d,9,72); preview(); });});
    panel.querySelectorAll('[data-hero-align]').forEach(function(btn){btn.addEventListener('click',function(){if(!pending)return; pending.align=btn.getAttribute('data-hero-align');preview();});});
    panel.querySelectorAll('[data-hero-title-weight]').forEach(function(btn){btn.addEventListener('click',function(){if(!pending)return; pending.titleWeight=btn.getAttribute('data-hero-title-weight')==='bold'?'bold':'normal';preview();});});
    panel.querySelectorAll('[data-hero-title-style]').forEach(function(btn){btn.addEventListener('click',function(){if(!pending)return; pending.titleStyle=btn.getAttribute('data-hero-title-style')==='italic'?'italic':'normal';preview();});});
    colors.title.addEventListener('input',function(){if(pending){pending.titleColor=this.value;preview();}}); colors.kicker.addEventListener('input',function(){if(pending){pending.kickerColor=this.value;preview();}}); colors.desc.addEventListener('input',function(){if(pending){pending.descriptionColor=this.value;preview();}});
    if(colors.overlay) colors.overlay.addEventListener('input',function(){if(pending){pending.overlayConfigured=true;pending.overlayColor=this.value;preview();}});
    if(overlayOpacity) overlayOpacity.addEventListener('input',function(){if(pending){pending.overlayConfigured=true;pending.overlayOpacity=clamp(this.value,0,100);preview();}});
    overlayModeButtons.forEach(function(btn){btn.addEventListener('click',function(){if(!pending)return; pending.overlayConfigured=true; pending.overlayMode=btn.getAttribute('data-hero-overlay-mode')||'uniform'; preview();});});
    saveBtn.addEventListener('click',async function(){ if(!pending || savingHero)return; setHeroSaving(true); setStatus('กำลังบันทึก...',''); try{ var saved=await saveSetting(pending); committed=clone(saved); pending=clone(saved); writeCache(activeTemplate,saved); applyConfig(saved); syncUi(); unsavedHero=false; setStatus('บันทึกข้อความ Header เรียบร้อย','ok'); setTimeout(function(){close(false);},550); }catch(e){setStatus('บันทึกไม่สำเร็จ: '+(e.message||e),'error');}finally{setHeroSaving(false);} });

    var b=box(); if(b){
      b.addEventListener('pointerdown',function(e){ if(!panelOpen||!pending||!pending.visible||e.button!==0)return; var h=hero(); if(!h)return; var hr=h.getBoundingClientRect(), br=b.getBoundingClientRect(); drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:br.left-hr.left,top:br.top-hr.top,width:br.width,height:br.height}; b.setPointerCapture&&b.setPointerCapture(e.pointerId); b.classList.add('hero-content-dragging'); e.preventDefault(); });
      b.addEventListener('pointermove',function(e){ if(!drag||drag.id!==e.pointerId||!pending)return; var hr=hero().getBoundingClientRect(); var left=drag.left+(e.clientX-drag.startX), top=drag.top+(e.clientY-drag.startY); left=clamp(left,0,Math.max(0,hr.width-drag.width)); top=clamp(top,0,Math.max(0,hr.height-drag.height)); pending.xPct=hr.width?left/hr.width*100:0; pending.yPct=hr.height?top/hr.height*100:0; applyConfig(pending); syncUi(); e.preventDefault(); });
      function endDrag(e){ if(!drag||drag.id!==e.pointerId)return; drag=null; b.classList.remove('hero-content-dragging'); setStatus('ตำแหน่งใหม่ยังเป็นตัวอย่าง — กด “บันทึก” เพื่อบันทึกลงชีต',''); }
      b.addEventListener('pointerup',endDrag); b.addEventListener('pointercancel',endDrag);
    }
    setupOverlayWatcher();
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&panelOpen)close(true);});
  }

  window.addEventListener('lp360:templatechange',function(e){
    var next=templateName(e&&e.detail&&e.detail.template); activeTemplate=next;
    if(panelOpen && (savingHero || unsavedHero)) return;
    if(panelOpen){ var p=document.getElementById('heroContentEditorPanel'); if(p)p.hidden=true; panelOpen=false; document.body.classList.remove('hero-content-editing'); pending=null; }
    var cached=readCache(next); committed=cached?normalizeConfig(cached):{configured:false,template:next}; applyConfig(committed);
    setTimeout(function(){fetchSetting(next).catch(function(err){console.warn('hero content setting:',err);});},40);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){applyInitial();setupUi();},{once:true}); else {applyInitial();setupUi();}
})();
