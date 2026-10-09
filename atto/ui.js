'use strict';
var attoUI=(()=>{
 function tabs(keys,buttonId,panelId){
  function select(key,focus=false){
   keys.forEach(item=>{
    const selected=item===key,button=$(buttonId(item));
    button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    $(panelId(item)).hidden=!selected;
   });
   if(focus)$(buttonId(key)).focus();
  }
  keys.forEach((key,index)=>{
   const button=$(buttonId(key));button.onclick=()=>select(key);
   button.addEventListener('keydown',event=>{
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%keys.length;
    else if(event.key==='ArrowLeft')next=(index-1+keys.length)%keys.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=keys.length-1;
    else return;
    event.preventDefault();select(keys[next],true);
   });
  });
  return select;
 }
 const showInspector=tabs(['effects','layers'],key=>`tab-${key}`,key=>`panel-${key}`);
 const showWarhol=tabs(['mosaic','palette','inks','texture'],key=>`warhol-tab-${key}`,key=>`warhol-panel-${key}`);
 const showLibrary=tabs(['layers','effects'],key=>`library-tab-${key}`,key=>`library-panel-${key}`);
 showInspector('effects');showWarhol('mosaic');showLibrary('layers');
 return {showInspector,showWarhol,showLibrary};
})();
