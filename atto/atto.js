'use strict';
const $=id=>document.getElementById(id);
const palettes=[['#171323','#df1760','#f1efca'],['#242047','#a5cc26','#f3efb2'],['#a72438','#ee9717','#ffe778'],['#201c50','#609fab','#e4e5c4']];
const source=document.createElement('canvas'), result=document.createElement('canvas');
const keys=['contrast','balance','texture','registration'];
let loaded=false, original=false, frame=0, loadVersion=0, basename='atto';
let activeEffect='warhol';
const graphicStates=Object.fromEntries(effectLibrary.filter(e=>e.id!=='warhol').map(e=>[e.id,defaultGraphicSettings(e.id)]));
const activeName=()=>effectLibrary.find(e=>e.id===activeEffect).name.toUpperCase();
const status=message=>$('status').textContent=message;
function noise(x,y){let n=Math.imul(x+1,374761393)^Math.imul(y+1,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function hex(value){return value.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));}
function effect(canvas,input=source,tints=null){
 const w=input.width,h=input.height;canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d'), data=input.getContext('2d').getImageData(0,0,w,h), pixels=data.data;
 const colors=(tints||['dark','mid','light'].map(id=>$(id).value)).map(hex);
 const contrast=1+Number($('contrast').value)/35, balance=(Number($('balance').value)-50)/140, texture=Number($('texture').value)/100;
 const shift=Math.round(Number($('registration').value)/100*Math.max(w,h)*.008);
 const luminance=new Float32Array(w*h);
 for(let i=0;i<luminance.length;i++){const p=i*4;luminance[i]=(.2126*pixels[p]+.7152*pixels[p+1]+.0722*pixels[p+2])/255;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,p=i*4;if(!pixels[p+3])continue;
  const grain=noise(x,y), coarse=noise(Math.floor(x/3),Math.floor(y/3));
  const value=(luminance[i]-.5)*contrast+.5+balance+(grain-.5)*texture*.32+(coarse-.5)*texture*.16;
  let band=value<.30?0:value<.69?1:2;
  const displaced=luminance[y*w+Math.max(0,x-shift)];
  if(shift&&band===2&&(displaced-.5)*contrast+.5+balance<.69)band=1;
  if(grain<texture*.065)band=2;
  const ink=colors[band], wear=1-texture*.08*coarse;
  for(let c=0;c<3;c++)pixels[p+c]=Math.round(ink[c]*wear);
 }
 ctx.putImageData(data,0,0);
}
const mosaicPalettes=[
 ['#171323','#454c96','#efedd5'],['#181d19','#9dba36','#edf4bf'],
 ['#842949','#35b653','#923451'],['#512686','#b1cd33','#f0f1c5'],
 ['#1c1b21','#bbc83b','#f4d826'],['#df9414','#f4bd37','#fff0ad'],
 ['#242145','#6bb9af','#e3e8d2'],['#28205b','#737bb6','#abcbd1'],
 ['#599185','#f0b32b','#b1b3c8'],['#16141b','#993440','#f4e7e9'],
 ['#4877b0','#82ab41','#c5c65f'],['#19161e','#d32872','#f1e4d2'],
 ['#0e1417','#383c92','#848fab'],['#111416','#c6cf7d','#d43467'],
 ['#ad2938','#e39025','#edc63b'],['#518d83','#b9c447','#c4ddd0']
];
let tilePalettes=mosaicPalettes.map(palette=>palette.slice());
let tileInkOrders=null;
const defaultPool=['#171323','#df1760','#f1efca','#a5cc26','#609fab','#ee9717','#512686','#35b653'];
let colorPool=defaultPool.slice(),selectedPoolColor=0;
function renderPool(){
 const container=$('pool-colors');container.replaceChildren();
 colorPool.forEach((color,index)=>{
  const button=document.createElement('button');button.style.background=color;
  button.setAttribute('aria-label',`Color ${index+1}: ${color}`);
  button.setAttribute('aria-pressed',String(index===selectedPoolColor));
  button.onclick=()=>{selectedPoolColor=index;renderPool();};container.append(button);
 });
 $('pool-color').value=colorPool[selectedPoolColor];$('pool-remove').disabled=colorPool.length<=3;
}
function applyPool(){
 if(tileInkOrders){['dark','mid','light'].forEach((id,i)=>$(id).value=colorPool[tileInkOrders[0][i]]);syncInk();}
 schedule();
}
function randomizeMosaic(){
 tileInkOrders=Array.from({length:16},()=>{
  const indices=colorPool.map((_,i)=>i);
  for(let i=indices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
  return indices.slice(0,3);
 });
 applyPool();status(`Mosaico randomizado / ${colorPool.length} colores disponibles`);
}
function mosaic(){
 const count=Number($('mosaic-grid').value),w=source.width,h=source.height;
 const gap=Math.min(Math.round(Math.min(w,h)*Number($('mosaic-gap').value)/1000),Math.max(0,Math.floor(Math.min(w,h)/(count*3))));
 const input=document.createElement('canvas'),tile=document.createElement('canvas');
 input.width=Math.max(1,Math.ceil(w/count));input.height=Math.max(1,Math.ceil(h/count));
 input.getContext('2d').drawImage(source,0,0,input.width,input.height);
 result.width=w;result.height=h;const ctx=result.getContext('2d');
 ctx.fillStyle='#f4f1de';ctx.fillRect(0,0,w,h);
 for(let row=0;row<count;row++)for(let col=0;col<count;col++){
  const index=row*count+col;
  const mainInks=['dark','mid','light'].map(id=>$(id).value);
  const tints=index===0?mainInks:tileInkOrders?tileInkOrders[index].map(ink=>colorPool[ink]):tilePalettes[index%tilePalettes.length];
  effect(tile,input,tints);
  const x=Math.round(col*w/count)+gap,y=Math.round(row*h/count)+gap;
  const right=Math.round((col+1)*w/count),bottom=Math.round((row+1)*h/count);
  ctx.clearRect(x,y,Math.max(1,right-x-gap),Math.max(1,bottom-y-gap));
  ctx.drawImage(tile,x,y,Math.max(1,right-x-gap),Math.max(1,bottom-y-gap));
 }
}
function draw(full=false){
 if(typeof studio!=='undefined'&&studio){studio.draw(full);return;}
 if(!loaded)return;
 if(activeEffect==='warhol'){if($('mosaic').checked)mosaic();else effect(result);}
 else{
  let input=source;
  if(!full&&Math.max(source.width,source.height)>1400){input=document.createElement('canvas');const ratio=1400/Math.max(source.width,source.height);input.width=Math.max(1,Math.round(source.width*ratio));input.height=Math.max(1,Math.round(source.height*ratio));input.getContext('2d').drawImage(source,0,0,input.width,input.height);}
  renderGraphicEffect(input,result,activeEffect,graphicStates[activeEffect]);
 }
 show();
}
function show(){const canvas=$('preview'), image=original?source:result;const scale=Math.min(1,(typeof studioView!=='undefined'&&studioView?4096:1400)/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);$('compare').textContent=original?'Ver efecto':'Ver original';$('compare').setAttribute('aria-pressed',String(original));$('viewlabel').textContent=original?'ORIGINAL':activeName()+(activeEffect==='warhol'&&$('mosaic').checked?' / MOSAIC':'');}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>draw());}
async function load(file){
 if(!file||!file.type.startsWith('image/')){status('Elegí un archivo de imagen válido.');return;}
 const destination=typeof studio!=='undefined'&&studio?studio.importDestination():null;
 const version=++loadVersion,url=URL.createObjectURL(file);status('Cargando imagen…');
 try{const img=new Image();img.src=url;await img.decode();if(version!==loadVersion)return;
  if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>40000000||Math.max(img.naturalWidth,img.naturalHeight)>16000)throw new Error('Usá una imagen de hasta 40 megapíxeles y 16000 px por lado.');
  source.width=img.naturalWidth;source.height=img.naturalHeight;source.getContext('2d').drawImage(img,0,0);
  if(typeof studio!=='undefined'&&studio){studio.acceptImage(source,file,destination);return;}
  basename=(file.name||'imagen').replace(/\.[^.]+$/,'');loaded=true;original=false;$('preview').hidden=false;$('export').disabled=false;$('compare').disabled=false;
  $('filename').textContent=(file.name||'IMAGEN PEGADA').toUpperCase();$('dimensions').textContent=`${source.width} × ${source.height} PX`;$('export-size').textContent=`PNG / ${source.width} × ${source.height} px`;$('import').textContent='Cambiar imagen ↗';draw();status(`${activeName()} / Imagen lista`);
 }catch(error){if(version===loadVersion)status(error.message.startsWith('Usá')?error.message:'No se pudo abrir la imagen. Probá con PNG, JPG o WebP.');}finally{URL.revokeObjectURL(url);}
}
for(const id of ['import'])$(id).onclick=()=>$('file').click();
$('file').onchange=()=>{load($('file').files[0]);$('file').value='';};
for(const key of keys)$(key).oninput=()=>{$(`${key}-value`).value=$(key).value;schedule();};
let activeInk='dark';
function syncInk(){
 $('ink-color').value=$(activeInk).value;
 $('ink-label').textContent=`Editar ${{dark:'sombras',mid:'medios',light:'luces'}[activeInk]}`;
 document.querySelectorAll('[data-ink]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ink===activeInk)));
}
document.querySelectorAll('[data-ink]').forEach(button=>button.onclick=()=>{activeInk=button.dataset.ink;syncInk();});
$('ink-color').oninput=()=>{$(activeInk).value=$('ink-color').value;if(tileInkOrders){colorPool[tileInkOrders[0][['dark','mid','light'].indexOf(activeInk)]]=$('ink-color').value;renderPool();}document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed','false'));schedule();};
document.querySelectorAll('[data-palette]').forEach(button=>button.onclick=()=>{['dark','mid','light'].forEach((id,i)=>$(id).value=palettes[Number(button.dataset.palette)][i]);document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));syncInk();schedule();});
$('compare').onclick=()=>{original=!original;show();};
$('randomize-mosaic').onclick=()=>{original=false;randomizeMosaic();};
$('pool-color').oninput=()=>{colorPool[selectedPoolColor]=$('pool-color').value;renderPool();applyPool();};
$('pool-add').onclick=()=>{colorPool.push($('pool-color').value);selectedPoolColor=colorPool.length-1;renderPool();};
$('pool-remove').onclick=()=>{if(colorPool.length<=3)return;colorPool.splice(selectedPoolColor,1);selectedPoolColor=Math.min(selectedPoolColor,colorPool.length-1);renderPool();if(tileInkOrders)randomizeMosaic();};
renderPool();
$('mosaic').onchange=()=>{original=false;$('randomize-mosaic').disabled=!$('mosaic').checked;schedule();};
$('mosaic-grid').onchange=schedule;
$('mosaic-gap').oninput=()=>{$('mosaic-gap-value').value=$('mosaic-gap').value;schedule();};
$('reset').onclick=()=>{keys.forEach((key,i)=>{$(key).value=[65,50,28,15][i];$(`${key}-value`).value=$(key).value;});tilePalettes=mosaicPalettes.map(palette=>palette.slice());tileInkOrders=null;$('mosaic').checked=true;$('randomize-mosaic').disabled=false;$('mosaic-grid').value='4';$('mosaic-gap').value='8';$('mosaic-gap-value').value='8';document.querySelector('[data-palette="0"]').click();original=false;};
$('export').onclick=()=>{cancelAnimationFrame(frame);draw(true);result.toBlob(async blob=>{if(!blob){status('No se pudo exportar la imagen.');return;}try{const saved=await BasementCollection.save(blob,`${basename}-${activeName().toLowerCase().replaceAll(' ','-')}.png`);status('Basement Collection / '+saved.name);}catch(error){status(error.message);}},'image/png');};
const drop=$('drop');let depth=0;
drop.addEventListener('dragenter',e=>{e.preventDefault();depth++;drop.classList.add('drag');});
drop.addEventListener('dragover',e=>e.preventDefault());
drop.addEventListener('dragleave',()=>{if(--depth<=0)drop.classList.remove('drag');});
drop.addEventListener('drop',e=>{e.preventDefault();depth=0;drop.classList.remove('drag');load(e.dataTransfer.files[0]);});
document.addEventListener('paste',e=>{const item=Array.from(e.clipboardData.items).find(item=>item.type.startsWith('image/'));if(item){e.preventDefault();load(item.getAsFile());}});

function selectEffect(id){
 if(typeof studio!=='undefined'&&studio&&!studio.syncing){studio.chooseEffect(id);return;}
 activeEffect=id;original=false;
 const entry=effectLibrary.find(e=>e.id===id);
 $('effect-title').textContent=entry.name.toUpperCase();$('effect-description').textContent=entry.description;
 $('warhol-settings').hidden=id!=='warhol';$('graphic-settings').hidden=id==='warhol';
 $('iconprint-settings').hidden=id!=='iconprint';
 $('variation').textContent=id==='iconprint'?'Redistribuir iconos ↻':'Variar textura ↻';$('variation').disabled=false;
 document.querySelectorAll('[data-effect]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.effect===id)));
 if(id!=='warhol'){
  const state=graphicStates[id];
  $('amount-label').textContent=entry.amountLabel;$('scale-label').textContent=entry.scaleLabel;
  $('amount').value=state.amount;$('amount-value').value=state.amount;
  $('effect-scale').value=state.scale;$('scale-value').value=state.scale;
  $('amount-help').textContent=entry.amountHelp;$('scale-help').textContent=entry.scaleHelp;
  $('amount').title=entry.amountHelp;$('effect-scale').title=entry.scaleHelp;
  $('amount').setAttribute('aria-describedby','amount-help');$('effect-scale').setAttribute('aria-describedby','scale-help');
  if(id==='iconprint')syncIconprint();
 }
 if(!loaded)$('viewlabel').textContent=activeName();
 schedule();status(`${activeName()} / ${loaded?'Imagen lista':'Importá una imagen'}`);
}
effectLibrary.forEach((entry,i)=>{
 const button=document.createElement('button');button.className='effect-card';button.dataset.effect=entry.id;
 const glyph=document.createElement('span');glyph.className='effect-glyph';glyph.setAttribute('aria-hidden','true');glyph.textContent={warhol:'▦',xerox:'◐',news:'⠿',iconprint:'✳'}[entry.id];button.append(glyph);button.title=entry.description;
 for(const [tag,cls,text] of [['span','number',String(i+1).padStart(2,'0')],['strong','',entry.name],['span','description',entry.description]]){const label=document.createElement(tag);label.className=cls;label.textContent=text;button.append(label);}
 button.setAttribute('aria-pressed',String(entry.id===activeEffect));button.onclick=()=>selectEffect(entry.id);
 $('effect-library').append(button);
});
$('amount').oninput=()=>{graphicStates[activeEffect].amount=Number($('amount').value);$('amount-value').value=$('amount').value;schedule();};
$('effect-scale').oninput=()=>{graphicStates[activeEffect].scale=Number($('effect-scale').value);$('scale-value').value=$('effect-scale').value;schedule();};
$('variation').onclick=()=>{graphicStates[activeEffect].seed=Math.floor(Math.random()*1000000)+1;schedule();};
$('graphic-reset').onclick=()=>{graphicStates[activeEffect]=defaultGraphicSettings(activeEffect);selectEffect(activeEffect);};

let iconColorTarget='paper';
function syncIconprint(){
 const state=graphicStates.iconprint;
 $('icon-inverted').checked=state.inverted;$('icon-color-target').value=iconColorTarget;$('icon-color').value=state[iconColorTarget];
 $('variation').disabled=state.icons.length<2;
 document.querySelectorAll('[data-print-icon]').forEach(button=>button.setAttribute('aria-pressed',String(state.icons.includes(button.dataset.printIcon))));
}
printIcons.forEach(icon=>{
 const button=document.createElement('button');button.className='print-icon';button.dataset.printIcon=icon.id;button.setAttribute('aria-label',icon.name);button.title=icon.name;
 const symbol=document.createElement('span');symbol.textContent=icon.symbol;const label=document.createElement('small');label.textContent=icon.name;button.append(symbol,label);
 button.onclick=()=>{
  const state=graphicStates.iconprint,index=state.icons.indexOf(icon.id);
  if(index>=0){if(state.icons.length===1){status('Elegí al menos un icono para la trama.');return;}state.icons.splice(index,1);}else state.icons.push(icon.id);
  syncIconprint();schedule();
 };$('print-icons').append(button);
});
$('icon-inverted').onchange=()=>{graphicStates.iconprint.inverted=$('icon-inverted').checked;schedule();};
$('icon-color-target').onchange=()=>{iconColorTarget=$('icon-color-target').value;syncIconprint();};
$('icon-color').oninput=()=>{graphicStates.iconprint[iconColorTarget]=$('icon-color').value;schedule();};

$('import').textContent='Importar imagen ↗';selectEffect('warhol');
