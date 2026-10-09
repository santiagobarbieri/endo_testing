'use strict';
var studio=(()=>{
 let sequence=0,boardId=null,importMode='replace';
 const deletedBoards=[];
 const boards=[];
 const warholIds=[...keys,'dark','mid','light','mosaic-grid','mosaic-gap'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const copyCanvas=input=>{const canvas=document.createElement('canvas');canvas.width=input.width;canvas.height=input.height;canvas.getContext('2d').drawImage(input,0,0);return canvas;};
 const copyInto=(input,target)=>{target.width=input.width;target.height=input.height;target.getContext('2d').drawImage(input,0,0);};
 const board=()=>boards.find(b=>b.id===boardId);
 const layer=()=>board()?.layers.find(l=>l.id===board().activeLayer);
 const entry=()=>layer()?.effects.find(e=>e.uid===layer().activeEffect);
 const api={syncing:false};
 const frames=new Map();
 function ensureFrames(){
  const world=$('world');
  for(const [id,frame] of frames)if(!boards.some(b=>b.id===id)){frame.node.remove();frames.delete(id);}
  if(!boards.length){world.replaceChildren();return;}
  boards.forEach(b=>{
   let frame=frames.get(b.id);
   if(!frame){
    const node=document.createElement('div');node.className='workspace-frame';node.dataset.board=String(b.id);
    const label=button('',()=>api.selectBoard(b.id),'frame-label');label.ondblclick=()=>{api.selectBoard(b.id);renameFrame(b,label);};
    const body=document.createElement('div');body.className='frame-body';
    const canvas=frames.size===0?($('preview')||document.createElement('canvas')):document.createElement('canvas');canvas.hidden=false;
    const placeholder=button('+ Imagen',()=>{api.selectBoard(b.id);requestImage('replace');},'frame-placeholder');
    body.append(canvas,placeholder);node.append(label,body);world.append(node);frame={node,label,body,canvas,placeholder};frames.set(b.id,frame);
   }
   frame.canvas.id=b.id===boardId?'preview':`frame-preview-${b.id}`;
   frame.canvas.style.transform='';frame.canvas.setAttribute('aria-label',`Vista previa de ${b.name}`);
   frame.node.classList.toggle('selected',b.id===boardId);frame.node.style.left=`${b.x||0}px`;frame.node.style.top=`${b.y||0}px`;frame.body.style.width=`${b.width}px`;frame.body.style.height=`${b.height}px`;
   if(frame.label.dataset.renaming!=='true')frame.label.textContent=b.name;frame.label.setAttribute('aria-pressed',String(b.id===boardId));frame.placeholder.hidden=!!b.layers.length;
  });
 }
 api.selectBoard=id=>{if(boardId===id||!boards.some(b=>b.id===id))return;commit();boardId=id;original=false;syncEditor();refresh();schedule();};
 function capture(id){
  if(id!=='warhol')return clone(graphicStates[id]);
  return {values:Object.fromEntries(warholIds.map(id=>[id,$(id).value])),mosaic:$('mosaic').checked,pool:colorPool.slice(),selected:selectedPoolColor,orders:clone(tileInkOrders),palettes:clone(tilePalettes)};
 }
 const warholDefault=capture('warhol');
 function defaults(id){return id==='warhol'?clone(warholDefault):defaultGraphicSettings(id);}
 function apply(id,settings,ui=false){
  if(id==='warhol'){
   for(const [key,value] of Object.entries(settings.values))$(key).value=value;
   $('mosaic').checked=settings.mosaic;colorPool=settings.pool.slice();selectedPoolColor=settings.selected;
   tileInkOrders=clone(settings.orders);tilePalettes=clone(settings.palettes);
   if(ui){renderPool();syncInk();$('randomize-mosaic').disabled=!settings.mosaic;
    for(const key of keys)$(`${key}-value`).value=$(key).value;
    $('mosaic-gap-value').value=$('mosaic-gap').value;
    document.querySelectorAll('[data-palette]').forEach(button=>button.setAttribute('aria-pressed','false'));
   }
  }else graphicStates[id]=clone(settings);
 }
 function commit(){const e=entry();if(e&&e.id===activeEffect)e.settings=capture(e.id);}
 function button(text,fn,cls,label){const b=document.createElement('button');b.textContent=text;b.className=cls||'';if(label)b.setAttribute('aria-label',label);b.onclick=fn;return b;}
 function renameFrame(b,element){
  if(element.dataset.renaming==='true')return;
  element.dataset.renaming='true';const input=document.createElement('input');input.className='frame-name-editor';input.value=b.name;input.maxLength=80;input.dataset.frameName=String(b.id);input.setAttribute('aria-label','Nombre del frame');element.replaceChildren(input);
  let done=false;
  function finish(cancel=false){if(done)return;done=true;if(!cancel)b.name=input.value.trim()||b.name;else input.value=b.name;delete element.dataset.renaming;refresh();schedule();}
  input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();finish();}else if(event.key==='Escape'){event.preventDefault();finish(true);}});
  input.addEventListener('blur',()=>finish());input.addEventListener('pointerdown',event=>event.stopPropagation());input.addEventListener('click',event=>event.stopPropagation());input.focus();input.select();
 }
 function renderLayerTree(){
  const container=$('layer-list');
  const editor=container.querySelector('input[data-frame-name]');if(editor){const b=boards.find(b=>String(b.id)===editor.dataset.frameName);if(b&&editor.value.trim())b.name=editor.value.trim();}
  container.replaceChildren();
  boards.forEach(b=>{
   const group=document.createElement('div');group.className='frame-tree-group';
   const row=document.createElement('div');row.className='frame-tree-row'+(b===board()?' selected':'');
   const toggle=button(b.collapsed?'›':'⌄',()=>{b.collapsed=!b.collapsed;renderLayerTree();},'row-action',b.collapsed?'Expandir frame':'Contraer frame');toggle.setAttribute('aria-expanded',String(!b.collapsed));
   const name=button(b.name,()=>api.selectBoard(b.id),'row-select frame-tree-name');name.setAttribute('aria-pressed',String(b===board()));name.ondblclick=()=>{api.selectBoard(b.id);const current=document.querySelector(`[data-tree-frame="${b.id}"]`);renameFrame(b,current);};name.dataset.treeFrame=String(b.id);
   const icon=document.createElement('span');icon.className='frame-tree-icon';icon.textContent='#';icon.setAttribute('aria-hidden','true');row.append(toggle,icon,name);group.append(row);
   const children=document.createElement('div');children.className='frame-tree-children';children.hidden=!!b.collapsed;
   if(!b.layers.length){const note=document.createElement('span');note.className='frame-tree-empty';note.textContent='Sin capas';children.append(note);}
   b.layers.slice().reverse().forEach(l=>{
    const layerRow=document.createElement('div');layerRow.className='layer-row'+(b===board()&&l===layer()?' selected':'');
    const visible=button(l.visible?'◉':'○',()=>{l.visible=!l.visible;refresh();schedule();},'row-toggle',l.visible?'Ocultar capa':'Mostrar capa');visible.setAttribute('aria-pressed',String(l.visible));
    const choose=button(l.name,()=>{commit();boardId=b.id;b.activeLayer=l.id;original=false;syncEditor();refresh();schedule();},'row-select');choose.setAttribute('aria-pressed',String(b===board()&&l===layer()));choose.title=l.name;
    choose.addEventListener('dblclick',()=>{if(typeof attoUI!=='undefined'&&attoUI)attoUI.showInspector('layers');$('layer-name').focus();});layerRow.append(visible,choose);children.append(layerRow);
   });
   group.append(children);container.append(group);
  });
 }
 function refresh(){
  const current=board(),selected=layer();
  $('board-delete').disabled=!current;$('board-rename').disabled=!current;$('board-undo').hidden=!deletedBoards.length;
  if(!current){
   for(const id of ['board-list','layer-list','effect-stack'])$(id).replaceChildren();
   for(const id of ['layer-copy','layer-remove','layer-up','layer-down','export','compare'])$(id).disabled=true;
   for(const id of ['layer-properties','effect-editor'])$(id).hidden=true;
   $('effect-empty').hidden=false;$('image-empty').hidden=false;
   $('layer-count').textContent='0';$('stack-count').textContent='0';
   $('filename').textContent='WORKSPACE';$('dimensions').textContent='';$('viewlabel').textContent='SIN FRAMES';$('import').textContent='Importar imagen ↗';
   ensureFrames();if(typeof studioView!=='undefined'&&studioView)studioView.refresh();return;
  }
  $('layer-count').textContent=String(boards.length);$('stack-count').textContent=String(selected?.effects.length||0);
  $('board-list').replaceChildren();
  boards.forEach(b=>{
   const item=button('',()=>api.selectBoard(b.id),'board-item');
   const title=document.createElement('span');title.textContent=b.name;const size=document.createElement('small');size.textContent=`${b.width} × ${b.height}`;
   item.append(title,size);item.setAttribute('aria-pressed',String(b===current));$('board-list').append(item);
  });
  renderLayerTree();
  for(const id of ['layer-copy','layer-remove'])$(id).disabled=!selected;
  const pos=current.layers.indexOf(selected);$('layer-up').disabled=!selected||pos===current.layers.length-1;$('layer-down').disabled=!selected||pos===0;
  $('layer-properties').hidden=!selected;
  $('image-empty').hidden=!!selected;
  if(selected){$('layer-name').value=selected.name;$('layer-blend').value=selected.blend;
   for(const key of ['opacity','size','x','y']){$(`layer-${key}`).value=selected[key];$(`layer-${key}-value`).value=`${selected[key]}%`;}
   selected.adjustments??={brightness:0,saturation:0,contrast:0};
   for(const key of ['brightness','saturation','contrast']){$(`image-${key}`).value=selected.adjustments[key];$(`image-${key}-value`).value=selected.adjustments[key]>0?'+'+selected.adjustments[key]:String(selected.adjustments[key]);}
  }
  $('effect-stack').replaceChildren();
  selected?.effects.forEach((e,i)=>{
   const name=effectLibrary.find(f=>f.id===e.id).name,row=document.createElement('div');row.className='stack-row'+(e===entry()?' selected':'');
   const enabled=button(e.enabled?'◉':'○',()=>{e.enabled=!e.enabled;refresh();schedule();},'row-toggle',e.enabled?'Desactivar '+name:'Activar '+name);enabled.setAttribute('aria-pressed',String(e.enabled));
   const choose=button(name,()=>{commit();selected.activeEffect=e.uid;if(typeof attoUI!=='undefined'&&attoUI)attoUI.showInspector('effects');syncEditor();refresh();schedule();},'row-select');choose.setAttribute('aria-pressed',String(e===entry()));
   const up=button('↑',()=>moveEffect(i,-1),'row-action','Aplicar antes');up.disabled=i===0;
   const down=button('↓',()=>moveEffect(i,1),'row-action','Aplicar después');down.disabled=i===selected.effects.length-1;
   const remove=button('×',()=>{commit();selected.effects.splice(i,1);selected.activeEffect=selected.effects[Math.min(i,selected.effects.length-1)]?.uid;syncEditor();refresh();schedule();},'row-action','Quitar '+name);
   row.append(enabled,choose,up,down,remove);$('effect-stack').append(row);
  });
  $('stack-hint').textContent=selected?.effects.length?'Se aplican de arriba hacia abajo. Elegí otro efecto para sumarlo.':'Elegí un efecto de la biblioteca para agregarlo.';
  $('effect-editor').hidden=!entry();
  $('effect-empty').hidden=!!entry();
  $('filename').textContent=current.name.toUpperCase();$('dimensions').textContent=`${current.width} × ${current.height} PX`;
  $('export-size').textContent=`PNG / ${current.width} × ${current.height} px`;
  $('export').disabled=false;$('compare').disabled=!current.layers.length;
  $('import').textContent=selected?'Cambiar imagen ↗':'Importar imagen ↗';
  $('export').textContent='Exportar frame ↗';$('export').title='Exportar '+current.name;
  ensureFrames();
  if(typeof studioView!=='undefined'&&studioView)studioView.refresh();
 }
 function moveEffect(index,direction){commit();const list=layer().effects;[list[index],list[index+direction]]=[list[index+direction],list[index]];refresh();schedule();}
 function syncEditor(){
  const e=entry();if(!e){$('effect-editor').hidden=true;document.querySelectorAll('[data-effect]').forEach(b=>b.setAttribute('aria-pressed','false'));return;}
  apply(e.id,e.settings,true);api.syncing=true;selectEffect(e.id);api.syncing=false;
 }
 api.chooseEffect=id=>{
  if(typeof attoUI!=='undefined'&&attoUI)attoUI.showInspector('effects');
  commit();const selected=layer();
  if(!selected){api.syncing=true;selectEffect(id);api.syncing=false;status('Agregá una imagen para aplicar el efecto');return;}
  let e=selected.effects.find(e=>e.id===id);
  if(!e){e={uid:++sequence,id,enabled:true,settings:defaults(id)};selected.effects.push(e);}
  selected.activeEffect=e.uid;original=false;syncEditor();refresh();schedule();
 };
 api.importDestination=()=>{const destination={board:boardId,layer:layer()?.id,mode:importMode};importMode='replace';commit();return destination;};
 api.acceptImage=(input,file,destination)=>{
  const image=copyCanvas(input);
  let current=boards.find(b=>b.id===destination?.board)||board();
  if(!current){current={id:++sequence,name:`Frame ${boards.length+1}`,width:image.width,height:image.height,automatic:false,x:0,y:0,layers:[],activeLayer:null};boards.push(current);boardId=current.id;}
  let selected=destination?.mode==='replace'?current.layers.find(l=>l.id===destination.layer):null;
  if(selected){selected.image=image;selected.imageRevision=(selected.imageRevision||0)+1;selected.cache=null;}
  else{
   const id=effectLibrary.some(e=>e.id===activeEffect)?activeEffect:'warhol';
   selected={id:++sequence,name:file.name||`Imagen ${current.layers.length+1}`,image,imageRevision:1,visible:true,blend:'source-over',opacity:100,size:100,x:0,y:0,adjustments:{brightness:0,saturation:0,contrast:0},effects:[{uid:++sequence,id,enabled:true,settings:defaults(id)}]};
   selected.activeEffect=selected.effects[0].uid;current.layers.push(selected);
   if(current.automatic){current.width=image.width;current.height=image.height;current.automatic=false;}
  }
  current.activeLayer=selected.id;boardId=current.id;loaded=true;original=false;basename=current.name;syncEditor();refresh();schedule();status('Imagen lista / '+selected.name);
 };
 function renderLayer(l,ratio,current=board()){
  const fit=Math.min(current.width/l.image.width,current.height/l.image.height)*l.size/100;
  const displayWidth=Math.max(1,Math.round(l.image.width*fit*ratio)),displayHeight=Math.max(1,Math.round(l.image.height*fit*ratio));
  const limit=Math.min(1,16000/displayWidth,16000/displayHeight,Math.sqrt(40000000/(displayWidth*displayHeight)));
  const width=Math.max(1,Math.round(displayWidth*limit)),height=Math.max(1,Math.round(displayHeight*limit));
  const signature=JSON.stringify([width,height,l.adjustments,l.effects]);
  if(l.cache?.signature===signature)return {canvas:l.cache.canvas,width:displayWidth,height:displayHeight};
  const input=document.createElement('canvas');input.width=width;input.height=height;input.getContext('2d').drawImage(l.image,0,0,width,height);
  adjustImage(input,l.adjustments);
  let rendered=input;
  for(const e of l.effects){
   if(!e.enabled)continue;
   if(e.id==='warhol'){
    apply(e.id,e.settings);copyInto(rendered,source);
    if(e.settings.mosaic)mosaic();else effect(result);
    rendered=copyCanvas(result);
   }else{const next=document.createElement('canvas');renderGraphicEffect(rendered,next,e.id,e.settings);rendered=next;}
  }
  l.cache={signature,canvas:rendered};return {canvas:rendered,width:displayWidth,height:displayHeight};
 }
 function compose(current,ratio){
  const composite=document.createElement('canvas'),raw=document.createElement('canvas');
  composite.width=raw.width=Math.max(1,Math.round(current.width*ratio));composite.height=raw.height=Math.max(1,Math.round(current.height*ratio));
  const ctx=composite.getContext('2d'),rawCtx=raw.getContext('2d');
  for(const l of current.layers){
   if(!l.visible)continue;
   const rendered=renderLayer(l,ratio,current),x=(composite.width-rendered.width)/2+l.x/100*composite.width,y=(composite.height-rendered.height)/2+l.y/100*composite.height;
   for(const context of [ctx,rawCtx]){context.globalAlpha=l.opacity/100;context.globalCompositeOperation=l.blend;}
   ctx.drawImage(rendered.canvas,x,y,rendered.width,rendered.height);rawCtx.drawImage(l.image,x,y,rendered.width,rendered.height);
  }
  return {composite,raw};
 }
 api.draw=(full=false)=>{
  commit();ensureFrames();const current=board();
  if(!current){loaded=false;if(typeof studioView!=='undefined'&&studioView)studioView.refresh();return;}
  const saved=capture(activeEffect);
  loaded=!!current.layers.length;
  if(full){const image=compose(current,1);copyInto(image.composite,result);copyInto(image.raw,source);}
  else{
   let selectedImage;
   for(const b of boards){
    const ratio=typeof studioView!=='undefined'&&studioView?studioView.previewRatio(b):Math.min(1,1400/Math.max(b.width,b.height));
    const frame=frames.get(b.id),signature=JSON.stringify([b.width,b.height,ratio,b.layers.map(l=>[l.id,l.imageRevision,l.visible,l.blend,l.opacity,l.size,l.x,l.y,l.adjustments,l.effects])]);
    if(frame.cache?.signature!==signature)frame.cache={signature,...compose(b,ratio)};
    const image=frame.cache,presented=signature+'|'+String(original&&b===current);
    if(frame.presented!==presented){copyInto(original&&b===current?image.raw:image.composite,frame.canvas);frame.presented=presented;}
    if(b===current)selectedImage=image;
   }
   copyInto(selectedImage.composite,result);copyInto(selectedImage.raw,source);
  }
  apply(activeEffect,saved);
  $('compare').textContent=original?'Ver efectos':'Ver original';$('compare').setAttribute('aria-pressed',String(original));
  $('viewlabel').textContent=`${current.name.toUpperCase()} / FRAME SELECCIONADO`;
  if(typeof studioView!=='undefined'&&studioView)studioView.refresh();
 };
 function requestImage(mode){importMode=mode;$('file').click();}
 for(const id of ['layer-add','add-image'])$(id).onclick=()=>requestImage('add');
 for(const id of ['import'])$(id).onclick=()=>requestImage('replace');
 $('file').addEventListener('cancel',()=>{importMode='replace';});
 $('layer-up').onclick=()=>moveLayer(1);$('layer-down').onclick=()=>moveLayer(-1);
 function moveLayer(direction){if(!board())return;commit();const list=board().layers,i=list.indexOf(layer());if(i<0||i+direction<0||i+direction>=list.length)return;[list[i],list[i+direction]]=[list[i+direction],list[i]];refresh();schedule();}
 $('layer-copy').onclick=()=>{commit();const l=layer();if(!l)return;const duplicate={...l,id:++sequence,name:l.name+' copia',adjustments:clone(l.adjustments),effects:clone(l.effects),cache:null};board().layers.push(duplicate);board().activeLayer=duplicate.id;syncEditor();refresh();schedule();};
 $('layer-remove').onclick=()=>{commit();const current=board(),selected=layer();if(!selected)return;current.layers.splice(current.layers.indexOf(selected),1);current.activeLayer=current.layers.at(-1)?.id;syncEditor();refresh();schedule();};
 $('layer-name').onchange=()=>{if(!layer())return;layer().name=$('layer-name').value.trim()||'Imagen';refresh();};
 $('layer-blend').onchange=()=>{if(!layer())return;layer().blend=$('layer-blend').value;schedule();};
 for(const key of ['opacity','size','x','y'])$(`layer-${key}`).oninput=()=>{if(!layer())return;layer()[key]=Number($(`layer-${key}`).value);$(`layer-${key}-value`).value=`${layer()[key]}%`;schedule();};
 for(const key of ['brightness','saturation','contrast'])$(`image-${key}`).oninput=()=>{const selected=layer();if(!selected)return;const value=Number($(`image-${key}`).value);selected.adjustments[key]=value;$(`image-${key}-value`).value=value>0?'+'+value:String(value);original=false;schedule();};
 $('image-reset').onclick=()=>{if(!layer())return;layer().adjustments={brightness:0,saturation:0,contrast:0};refresh();original=false;schedule();};
 let dragging=null;
 $('drop').addEventListener('pointerdown',event=>{
  if(event.button!==0||!layer()||!layer().visible||event.target.closest('.frame-label')||!event.target.closest('.workspace-frame'))return;
  if(typeof studioView!=='undefined'&&studioView&&studioView.isPanning(event))return;
  const b=board(),zoom=typeof studioView!=='undefined'&&studioView?studioView.zoom():1;
  dragging={id:event.pointerId,x:event.clientX,y:event.clientY,startX:layer().x,startY:layer().y,width:b.width*zoom,height:b.height*zoom,layer:layer()};
  $('drop').setPointerCapture(event.pointerId);event.preventDefault();
 });
 $('drop').addEventListener('pointermove',event=>{
  if(!dragging||dragging.id!==event.pointerId)return;
  const l=dragging.layer;l.x=Math.max(-100,Math.min(100,Math.round(dragging.startX+(event.clientX-dragging.x)/dragging.width*100)));l.y=Math.max(-100,Math.min(100,Math.round(dragging.startY+(event.clientY-dragging.y)/dragging.height*100)));
  for(const key of ['x','y']){$(`layer-${key}`).value=l[key];$(`layer-${key}-value`).value=`${l[key]}%`;}
  schedule();
 });
 for(const type of ['pointerup','pointercancel'])$('drop').addEventListener(type,()=>{dragging=null;});
 let dialogMode='add';
 function openBoardDialog(mode){commit();dialogMode=mode;const b=board();$('board-dialog-title').textContent=mode==='add'?'NUEVO BOARD':'RENOMBRAR BOARD';$('board-name').value=mode==='add'?`Frame ${boards.length+1}`:b?.name||'';$('board-width').value=b?.width||1200;$('board-height').value=b?.height||1200;$('board-width').disabled=$('board-height').disabled=mode==='rename';$('board-error').textContent='';$('board-form').querySelector('[type=submit]').textContent=mode==='add'?'Crear board':'Guardar nombre';$('board-dialog').showModal();}
 $('board-add').onclick=()=>{commit();const current=board(),width=current?.width||1200,height=current?.height||1200,last=boards.at(-1),newRow=!last||boards.length%3===0;let number=1;while(boards.some(b=>b.name===`Frame ${number}`))number++;const x=newRow?0:last.x+last.width+120,y=newRow?(boards.length?Math.max(...boards.map(b=>b.y+b.height))+160:0):last.y;const b={id:++sequence,name:`Frame ${number}`,width,height,x,y,automatic:false,layers:[],activeLayer:null};boards.push(b);boardId=b.id;original=false;syncEditor();refresh();if(typeof studioView!=='undefined'&&studioView)studioView.fit();schedule();};$('board-rename').onclick=()=>{if(!board())return;renameFrame(board(),frames.get(boardId).label);};$('board-dialog-close').onclick=()=>$('board-dialog').close();
 $('board-form').onsubmit=event=>{
  event.preventDefault();const name=$('board-name').value.trim();if(!name)return;
  if(dialogMode==='rename')board().name=name;
  else{
   const width=Number($('board-width').value),height=Number($('board-height').value);
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>16000||height>16000||width*height>40000000){$('board-error').textContent='Elegí dimensiones de hasta 40 megapíxeles, con un máximo de 16000 px por lado.';return;}
   const last=boards.at(-1),newRow=!last||boards.length%3===0;
   const x=newRow?0:last.x+last.width+120,y=newRow?(boards.length?Math.max(...boards.map(b=>b.y+b.height))+160:0):last.y;
   const b={id:++sequence,name,width,height,x,y,automatic:false,layers:[],activeLayer:null};boards.push(b);boardId=b.id;original=false;
   if(typeof studioView!=='undefined'&&studioView)studioView.fit();
  }
  $('board-dialog').close();syncEditor();refresh();schedule();
 };
 $('board-delete').onclick=()=>{const selected=board();if(!selected)return;commit();const index=boards.indexOf(selected);deletedBoards.push({board:selected,index});boards.splice(index,1);boardId=boards[Math.min(index,boards.length-1)]?.id??null;original=false;syncEditor();refresh();if(typeof studioView!=='undefined'&&studioView)studioView.fit();schedule();status('Frame eliminado · podés deshacer');};
 $('board-undo').onclick=()=>{const deleted=deletedBoards.pop();if(!deleted)return;commit();boards.splice(Math.min(deleted.index,boards.length),0,deleted.board);boardId=deleted.board.id;original=false;syncEditor();refresh();if(typeof studioView!=='undefined'&&studioView)studioView.fit();schedule();};
 $('compare').onclick=()=>{original=!original;api.draw();};
 $('export').onclick=async()=>{
  if(!board())return;
  const name=`${board().name.replace(/[\\/:*?"<>|]/g,'-')}-atto.png`;
  $('export').disabled=true;
  try{
   const handle=await BasementCollection.choose(name);
   cancelAnimationFrame(frame);api.draw(true);
   const blob=await new Promise(resolve=>result.toBlob(resolve,'image/png'));
   if(!blob)throw Error('No se pudo exportar el frame.');
   const saved=await BasementCollection.save(blob,name,handle);
   status('Guardado / '+saved.name);
  }catch(error){status(error.message);}
  finally{$('export').disabled=!board();}
 };
 $('world').addEventListener('pointerdown',event=>{if(typeof studioView!=='undefined'&&studioView&&studioView.isPanning(event))return;const frame=event.target.closest('.workspace-frame');if(frame)api.selectBoard(Number(frame.dataset.board));},true);
 api.frames=frames;api.boards=boards;api.board=board;api.layer=layer;api.refresh=refresh;api.commit=commit;
 refresh();return api;
})();
