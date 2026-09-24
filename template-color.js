(function(){
  'use strict';
  var palettes=[
    {name:'สีเดิม',primary:'#f1663c',secondary:'#ff873f',soft:'#fff2e9',dark:'#30343a'},
    {name:'ฟ้าน้ำทะเล',primary:'#087e91',secondary:'#20b5c2',soft:'#e9f8fa',dark:'#123d50'},
    {name:'เขียวธรรมชาติ',primary:'#287b53',secondary:'#71b86e',soft:'#ebf7ed',dark:'#1d4739'},
    {name:'ส้มอาทิตย์',primary:'#d65a31',secondary:'#f6aa4d',soft:'#fff1e2',dark:'#593b30'},
    {name:'ม่วงสร้างสรรค์',primary:'#7148ad',secondary:'#ad79d8',soft:'#f3ebfc',dark:'#392e58'},
    {name:'ชมพูโรส',primary:'#c45479',secondary:'#e791a4',soft:'#fff0f5',dark:'#624153'}
  ];
  var api=window.APP_CONFIG && (window.APP_CONFIG.EXEC_URL||window.APP_CONFIG.API_URL)||'';
  var tokenKey=window.LP360_TEMPLATE_ADMIN_TOKEN_KEY||'';
  var site=window.LP360_TEMPLATE_SITE||'site';
  var saved={},pending=1,active=1,loading=false,request=0;
  var button,modal,grid,status,saveButton;
  function template(){var value=window.LP360TemplateSwitcher?.getCurrent()||'Template1';return /^Template[1-9]$/.test(value)?value:'Template1';}
  function cacheKey(t){return 'LP360:COLOR:'+site+':'+encodeURIComponent(api)+':'+t;}
  function remembered(t){try{var n=Number(localStorage.getItem(cacheKey(t)));return n>=1&&n<=6?n:1;}catch(_){return 1;}}
  function apply(n){
    n=Math.max(1,Math.min(6,Number(n)||1));
    var body=document.body,p=palettes[n-1];
    body.classList.toggle('lp-color-themed',n!==1);
    body.style.setProperty('--lp-color-primary',p.primary);
    body.style.setProperty('--lp-color-secondary',p.secondary);
    body.style.setProperty('--lp-color-soft',p.soft);
    body.style.setProperty('--lp-color-dark',p.dark);
    body.dataset.lpColorTheme=String(n);
    grid?.querySelectorAll('button').forEach(function(choice){var chosen=Number(choice.dataset.palette)===n;choice.classList.toggle('is-selected',chosen);choice.setAttribute('aria-pressed',String(chosen));});
  }
  async function load(t){
    var sequence=++request;
    var colorStyle=document.getElementById('templateColorStyle');if(colorStyle)document.head.appendChild(colorStyle);
    apply(remembered(t));
    if(!api)return;
    try{
      var url=new URL(api);url.searchParams.set('mode','templatecolorsetting');url.searchParams.set('template',t);url.searchParams.set('_ts',Date.now());
      var response=await fetch(url.toString(),{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      var result=await response.json();if(!result||result.success===false)throw new Error(result?.message||'โหลดธีมสีไม่สำเร็จ');
      if(sequence!==request||template()!==t)return;
      var value=Number(result.data?.palette)||1;saved[t]=value;
      try{localStorage.setItem(cacheKey(t),String(value));}catch(_){}
      if(modal.hidden)apply(value);
    }catch(error){console.warn('theme color:',error);}
  }
  function close(discard){if(loading)return;if(discard)apply(saved[active]||remembered(active));modal.hidden=true;button.hidden=false;}
  function init(){
    button=document.getElementById('templateColorButton');modal=document.getElementById('templateColorDialog');
    if(!button||!modal)return;
    grid=modal.querySelector('.template-color-grid');status=modal.querySelector('.template-color-status');saveButton=modal.querySelector('.template-color-save');
    palettes.forEach(function(p,i){
      var choice=document.createElement('button');choice.type='button';choice.className='template-color-choice';choice.dataset.palette=String(i+1);
      choice.innerHTML='<span class="template-color-preview" style="--sample-primary:'+p.primary+';--sample-secondary:'+p.secondary+';--sample-soft:'+p.soft+';--sample-dark:'+p.dark+'"><span class="sample-nav"></span><span class="sample-heading"></span><span class="sample-copy"></span><span class="sample-button"></span><span class="sample-image"></span></span><span class="template-color-name">'+p.name+'</span>';
      choice.addEventListener('click',function(){pending=i+1;apply(pending);status.textContent='กำลังดูตัวอย่าง — กด “บันทึก” เพื่อใช้งาน';});grid.appendChild(choice);
    });
    button.addEventListener('click',function(){active=template();pending=saved[active]||remembered(active);apply(pending);status.textContent='เลือกสีสำหรับ '+active;modal.hidden=false;button.hidden=true;});
    modal.querySelector('.template-color-cancel').addEventListener('click',function(){close(true);});
    modal.querySelector('.template-color-close').addEventListener('click',function(){close(true);});
    saveButton.addEventListener('click',async function(){
      if(loading)return;
      var token='';try{token=sessionStorage.getItem(tokenKey)||'';}catch(_){}
      if(!token){status.textContent='กรุณาเข้าสู่ระบบผู้ดูแลก่อนบันทึก';return;}
      loading=true;saveButton.disabled=true;saveButton.classList.add('is-saving');status.textContent='กำลังบันทึกธีมสี...';
      try{
        var response=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({mode:'templatecolorsettingadmin',token:token,template:active,palette:pending})});
        if(!response.ok)throw new Error('HTTP '+response.status);
        var result=await response.json();if(!result||result.success===false)throw new Error(result?.message||'บันทึกไม่สำเร็จ');
        saved[active]=pending;try{localStorage.setItem(cacheKey(active),String(pending));}catch(_){}
        status.textContent='บันทึกธีมสีแล้ว';loading=false;close(false);
      }catch(error){status.textContent='บันทึกไม่สำเร็จ: '+(error.message||error);}
      finally{loading=false;saveButton.disabled=false;saveButton.classList.remove('is-saving');}
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!modal.hidden){e.stopPropagation();close(true);}},true);
    window.addEventListener('lp360:templatechange',function(e){
      if(!modal.hidden)close(true);
      var next=e.detail?.template||template();if(!/^Template[1-9]$/.test(next))return;
      load(next);
    });
    load(template());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
