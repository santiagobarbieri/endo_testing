'use strict';
// Reference layout: header, contextual configuration strip, vertical tools,
// a shared canvas, and two independent inspector regions.
const referenceLibrary = document.createElement('section');
referenceLibrary.className = 'property-panel hub-library';
referenceLibrary.setAttribute('aria-label', 'History, brushes and colors');
const referenceInspector = document.createElement('section');
referenceInspector.className = 'property-panel hub-inspector';
referenceInspector.setAttribute('aria-label', 'Frame and tool settings');
const inspectorHeader = document.createElement('header');
inspectorHeader.className = 'hub-card-heading';
const inspectorTitle = document.createElement('span');
const inspectorBack = document.createElement('button');
inspectorBack.textContent = 'Frames';
inspectorBack.onclick = () => referenceSetInspector('frames');
inspectorHeader.append(inspectorTitle, inspectorBack);
const inspectorContent = document.createElement('div');
inspectorContent.className = 'hub-inspector-content';
referenceInspector.append(inspectorHeader, inspectorContent);
right.className = 'hub-sidebar';
utilityNodes.append(inspectorHeading);
right.replaceChildren(referenceLibrary, referenceInspector);
referenceLibrary.append(tabs);
tabs.className = 'hub-library-tabs';
tabs.setAttribute('role', 'tablist');
for (const button of tabs.children) button.hidden = !['tab-add', 'tab-brushes', 'tab-colors'].includes(button.id);
const historyList = $('history-list');
hubHistory.replaceChildren(historyList);
referenceLibrary.append(hubHistory, brushPanel);
compactLibrary.open = true;

const brushSettings = document.createElement('section');
brushSettings.className = 'hub-section';
const originalColors = document.querySelector('.colors');
brushSettings.append(document.querySelector('.controls'), selectedActions, layerProperties, preview);
for (const node of [...brushPanel.children]) {
  if (node !== compactLibrary) {
    if (node === originalColors) colorPanel.append(node);
    else if (!node.matches('h2')) brushSettings.append(node);
    else node.remove();
  }
}
const frameTree = document.createElement('section');
frameTree.className = 'hub-frame-tree';
frameTree.setAttribute('aria-label', 'Frames and layers');
inspectorContent.append(frameTree, brushSettings, colorPanel, boardPanel, filterPanel, editPanel, settingsPanel, toolsPanel, addPanel);
colorPanel.id='panel-colors';
colorPanel.querySelector('h2')?.remove();
originalColors.querySelector('h2')?.remove();
const colorSurface = document.createElement('div');
colorSurface.className = 'hub-color-surface';
const colorCanvas = document.createElement('canvas');
colorCanvas.width = 372; colorCanvas.height = 270;
colorCanvas.tabIndex = 0; colorCanvas.setAttribute('role', 'slider');
colorCanvas.setAttribute('aria-label', 'Color picker; arrow keys change hue and saturation');
colorCanvas.setAttribute('aria-valuemin', '0');colorCanvas.setAttribute('aria-valuemax', '360');
const colorCursor = document.createElement('span');colorCursor.className='hub-color-cursor';
colorSurface.append(colorCanvas, colorCursor);
referenceLibrary.append(colorSurface);
let referenceLibraryTab = 'history', referenceInspectorMode = 'frames';
let pickedHue = 210, pickedSaturation = .55, pickedBrightness = 1, pickedSlot = 0;
function hsvColor(h,s,v) {
  const f = n => { const k=(n+h/60)%6; return Math.round(255*v*(1-s*Math.max(0,Math.min(k,4-k,1)))); };
  return '#'+[f(5),f(3),f(1)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function paintColorSurface() {
  const w=colorCanvas.width,h=colorCanvas.height,g=colorCanvas.getContext('2d'),image=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const dx=(x-w*.5)/(w*.5),dy=(y-h*.5)/(h*.5),hue=(Math.atan2(dy,dx)*180/Math.PI+435)%360;
    const color=hsvColor(hue,Math.min(1,Math.hypot(dx,dy)),pickedBrightness),i=(y*w+x)*4;
    image.data[i]=parseInt(color.slice(1,3),16);image.data[i+1]=parseInt(color.slice(3,5),16);image.data[i+2]=parseInt(color.slice(5,7),16);image.data[i+3]=255;
  }
  g.putImageData(image,0,0);
}
const brightnessInput=hubRange(colorPanel,'Luminosidad',0,100,100,value=>{pickedBrightness=value/100;paintColorSurface();applyPickedColor()});
function currentPaletteInputs() {
  const item=selectedLayer();return [...(item?.kind==='stroke'?$('layer-brush-palette'):$('palette')).querySelectorAll('input[type=color]')];
}
function applyPickedColor() {
  const inputs=currentPaletteInputs(),input=inputs[Math.min(pickedSlot,inputs.length-1)];
  if(!input)return;
  input.value=hsvColor(pickedHue,pickedSaturation,pickedBrightness);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  colorCanvas.setAttribute('aria-valuenow',String(Math.round(pickedHue)));
  colorCanvas.setAttribute('aria-valuetext',input.value);
}
function pickColor(event) {
  const r=colorCanvas.getBoundingClientRect(),dx=(event.clientX-r.left-r.width*.5)/(r.width*.5),dy=(event.clientY-r.top-r.height*.5)/(r.height*.5);
  pickedHue=(Math.atan2(dy,dx)*180/Math.PI+435)%360;pickedSaturation=Math.min(1,Math.hypot(dx,dy));
  colorCursor.style.left=Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100))+'%';
  colorCursor.style.top=Math.max(0,Math.min(100,(event.clientY-r.top)/r.height*100))+'%';
  applyPickedColor();
}
colorCanvas.onpointerdown=e=>{colorCanvas.setPointerCapture(e.pointerId);pickColor(e)};
colorCanvas.onpointermove=e=>{if(colorCanvas.hasPointerCapture(e.pointerId))pickColor(e)};
colorCanvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();pickedHue=(pickedHue+(e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0)+360)%360;pickedSaturation=clamp(pickedSaturation+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0),0,1);applyPickedColor()};
colorPanel.addEventListener('pointerdown',e=>{const inputs=currentPaletteInputs();if(inputs.includes(e.target))pickedSlot=inputs.indexOf(e.target)});
paintColorSurface();
function referenceSetLibrary(id) {
  referenceLibraryTab=id;
  hubHistory.hidden=id!=='history';brushPanel.hidden=id!=='brushes';colorSurface.hidden=id!=='colors';
  for(const [tab,key] of [['tab-add','history'],['tab-brushes','brushes'],['tab-colors','colors']]) {
    $(tab).setAttribute('aria-selected',String(key===id));$(tab).tabIndex=key===id?0:-1;
  }
  if(id==='history')renderHistory();
  if(id==='brushes'){compactLibrary.open=true;brushGrid.hidden=false;}
}
function referenceSetInspector(id) {
  referenceInspectorMode=id;
  const sections={frames:frameTree,brushes:brushSettings,colors:colorPanel,board:boardPanel,filters:filterPanel,edit:editPanel,settings:settingsPanel,tools:toolsPanel,add:addPanel};
  for(const [key,panel] of Object.entries(sections))panel.hidden=key!==id;
  inspectorTitle.textContent={frames:'Frames',brushes:selectedLayer()?'Layer Settings':'Brush Settings',colors:'Colors',board:'Frame Settings',filters:'Filter Settings',edit:'Edit',settings:'Settings',tools:'Tool Settings',add:'Project'}[id]||'Settings';
  inspectorBack.hidden=id==='frames';
  if(id==='frames')renderReferenceFrames();
  if(id==='colors') {
    const item=selectedLayer();
    if(item?.kind==='stroke'){colorPanel.prepend($('layer-brush-palette'));$('layer-brush-palette').hidden=false;originalColors.hidden=true;}
    else{colorPanel.prepend(originalColors);originalColors.hidden=false;}
  }else if($('layer-brush-palette').parentNode===colorPanel){$('layer-brush-editor').append($('layer-brush-palette'));}
  previewDirty=true;
}
setNextTab=function(id) {
  nextTab=id;
  if(id==='history'){referenceSetLibrary('history');referenceSetInspector('frames');}
  else if(id==='brushes'){referenceSetLibrary('brushes');referenceSetInspector('brushes');}
  else if(id==='colors'){referenceSetLibrary('colors');referenceSetInspector('colors');}
  else referenceSetInspector(id==='add'?'add':id);
  syncContext();
};
$('tab-add').onclick=()=>setNextTab('history');$('tab-brushes').onclick=()=>setNextTab('brushes');$('tab-colors').onclick=()=>setNextTab('colors');
tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=['history','brushes','colors'],i=keys.indexOf(referenceLibraryTab),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setNextTab(keys[next]);tabs.querySelector('[aria-selected=true]').focus()};
function renderReferenceFrames() {
  // Keep Endo's existing active-layer list, including reordering, groups and masks.
  const activeList=$('layer-list');activeList.remove();frameTree.replaceChildren();
  const screen=config.screen||'Screen 1';
  for(const b of boards.filter(b=>(b.config.screen||'Screen 1')===screen).slice().reverse()) {
    const heading=document.createElement('div');heading.className='hub-tree-frame';heading.classList.toggle('is-active',b.id===activeBoardId);
    const toggle=document.createElement('button');toggle.className='hub-tree-toggle';toggle.textContent=b.hubCollapsed?'›':'⌄';toggle.setAttribute('aria-label','Expand '+b.name);toggle.setAttribute('aria-expanded',String(!b.hubCollapsed));
    toggle.onclick=()=>{b.hubCollapsed=!b.hubCollapsed;renderReferenceFrames()};
    const name=document.createElement('button');name.className='hub-tree-name';name.textContent=b.name;name.setAttribute('aria-pressed',String(b.id===activeBoardId));
    name.onclick=()=>{finish();storeBoard();bindBoard(b);referenceSetInspector('frames');layerDirty=true;};
    name.ondblclick=()=>{bindBoard(b);referenceSetInspector('board');$('inspector-board-name').focus();};
    heading.append(toggle,name);frameTree.append(heading);
    if(b.hubCollapsed)continue;
    if(b.id===activeBoardId)frameTree.append(activeList);
    else for(const item of [...b.artwork,...b.references].reverse()) {
      const row=document.createElement('button');row.className='hub-tree-layer';row.textContent='↳ '+(item.name||'Layer');
      row.onclick=()=>{finish();storeBoard();bindBoard(b);selectLayer(item);};frameTree.append(row);
    }
  }
  if(!activeList.isConnected){activeList.hidden=true;frameTree.append(activeList);}else activeList.hidden=!!currentBoard().hubCollapsed;
}
const layoutPreviousContext=syncContext;
syncContext=function() {
  layoutPreviousContext();
  const item=selectedLayer();
  // The library tab and lower settings region have independent visibility.
  referenceSetLibrary(referenceLibraryTab);
  for(const [key,panel] of Object.entries({frames:frameTree,brushes:brushSettings,colors:colorPanel,board:boardPanel,filters:filterPanel,edit:editPanel,settings:settingsPanel,tools:toolsPanel,add:addPanel}))panel.hidden=key!==referenceInspectorMode;
  document.querySelector('.controls').hidden=!!item;
  layerProperties.hidden=!item;selectedActions.hidden=!item;
  if(referenceInspectorMode==='colors')originalColors.hidden=item?.kind==='stroke';
  if(referenceInspectorMode==='brushes')inspectorTitle.textContent=item?'Layer Settings':'Brush Settings';
  referenceConfigLabel.textContent=item?(item.name||'Layer'):tool==='brush'?cur.name:currentBoard().name;
};
const referenceSyncLayers=syncLayers;
syncLayers=function(){referenceSyncLayers();if(referenceInspectorMode==='frames')renderReferenceFrames()};
const referenceBind=bindBoard;
bindBoard=function(b){referenceBind(b);if(referenceInspectorMode==='frames')renderReferenceFrames();if(config.hubFilter&&referenceInspectorMode==='filters')hubFilterControls();};
showLayers=function(){referenceSetInspector('frames');layerDirty=true;};
left.hidden=true;
// Move the existing tools into the rail; no placeholder tools are invented.
const referenceRail=document.createElement('aside');referenceRail.className='hub-tool-rail';referenceRail.setAttribute('aria-label','Drawing tools');
document.querySelector('.workspace').prepend(referenceRail);referenceRail.append(dock);
brushPicker.title='Brushes';brushPicker.setAttribute('aria-label','Brushes');brushPicker.textContent='◌';brushPicker.onclick=()=>setNextTab('brushes');
// Actual Endo controls live in the reference's second header row.
const referenceConfig=document.createElement('div');referenceConfig.className='hub-config-strip';referenceConfig.setAttribute('role','toolbar');referenceConfig.setAttribute('aria-label','Editing configuration');document.querySelector('.topbar').after(referenceConfig);
const referenceConfigLabel=document.createElement('span');referenceConfigLabel.className='hub-config-label';
referenceConfig.append(referenceConfigLabel,$('align-actions'));
const guides=document.createElement('label');guides.className='check';guides.append($('smart-guides'),document.createTextNode('Smart guides'));referenceConfig.append(guides);
const referenceZoom=document.createElement('div');referenceZoom.className='hub-config-zoom';referenceZoom.append(document.querySelector('.zoom-controls'));referenceConfig.append(referenceZoom);
canvasToolbar.hidden=true;
mobileLayers.hidden=true;actions.hidden=true;projectTitle.hidden=true;
// Keep the top menu faithful to the reference and route settings into the lower panel.
const frameMenu=[...hubNav.children].find(d=>d.querySelector('summary').textContent==='Frame');
hubButton(frameMenu.querySelector('.hub-dropdown'),'Borrar frame',()=>{frameMenu.open=false;removeBoard();renderReferenceFrames();hubScreens();});
// The filter stays reachable beside the current brush without taking over the gallery.
const activeFrameFilter=document.createElement('button');activeFrameFilter.className='hub-active-filter';referenceConfig.append(activeFrameFilter);
activeFrameFilter.onclick=()=>{hubFilterControls();setNextTab('filters');};
const referenceHistory=syncHistory;
syncHistory=function(){referenceHistory();activeFrameFilter.hidden=!config.hubFilter;activeFrameFilter.textContent=config.hubFilter?effectLibrary.find(e=>e.id===config.hubFilter.id)?.name+' · Edit':'';};
// Centered preset dialog used for both New Screen and New Frame.
let referenceCreateMode='screen';
const creationForm=document.createElement('form');creationForm.id='hub-create-form';
const referenceCreate=makeDialog('hub-create-dialog','NEW SCREEN','');referenceCreate.classList.add('hub-create-dialog');referenceCreate.append(creationForm);
creationForm.innerHTML=`<div class="hub-preset-grid"></div><div class="hub-create-fields"><label class="field">Name<input id="hub-create-name" maxlength="80" required></label><label class="field">Background<input id="hub-create-background" type="color" value="#ffffff"></label><span>Size · px</span><div class="two-fields"><label class="field">X<input id="hub-create-width" type="number" min="128" max="8192" required value="1080"></label><label class="field">Y<input id="hub-create-height" type="number" min="128" max="8192" required value="1920"></label></div><p id="hub-create-error" role="status"></p><button class="hub-create-submit" type="submit">Create screen</button></div>`;
const presetOptions=[['A4',2480,3508],['A3',3508,4961],['A5',1748,2480],['IG Story',1080,1920],['IG Post',1080,1080]];
for(const [label,w,h] of presetOptions){const button=document.createElement('button');button.type='button';button.className='hub-format-card';button.innerHTML='<span class="hub-format-shape"></span><span></span>';button.lastChild.textContent=label;button.firstChild.style.aspectRatio=w+'/'+h;button.dataset.preset=label;button.onclick=()=>{$('hub-create-width').value=w;$('hub-create-height').value=h;for(const sibling of button.parentNode.children)sibling.setAttribute('aria-pressed',String(sibling===button));};creationForm.querySelector('.hub-preset-grid').append(button);}
function openReferenceCreate(mode='screen') {
  referenceCreateMode=mode;referenceCreate.querySelector('h2').textContent=mode==='screen'?'NEW SCREEN':'NEW FRAME';creationForm.querySelector('[type=submit]').textContent=mode==='screen'?'Create screen':'Create frame';
  const screenNames=[...new Set(boards.map(b=>b.config.screen||'Screen 1'))];
  $('hub-create-name').value=mode==='screen'?'Screen '+(screenNames.length+1):'Frame '+(boards.filter(b=>(b.config.screen||'Screen 1')===(config.screen||'Screen 1')).length+1);
  $('hub-create-error').textContent='';$('hub-create-background').value=mode==='frame'?config.background:'#ffffff';referenceCreate.showModal();
}
creationForm.onsubmit=e=>{
  e.preventDefault();const name=$('hub-create-name').value.trim(),width=Number($('hub-create-width').value),height=Number($('hub-create-height').value);
  if(!name||!Number.isInteger(width)||!Number.isInteger(height)||width<128||height<128||width>8192||height>8192)return;
  if(referenceCreateMode==='screen'&&boards.some(b=>(b.config.screen||'Screen 1')===name)){$('hub-create-error').textContent='Ese screen ya existe.';return;}
  finish();commit(referenceCreateMode==='screen'?'New screen':'New frame');storeBoard();const b=newBoard(referenceCreateMode==='screen'?'Frame 1':name,width,height);b.config.screen=referenceCreateMode==='screen'?name:config.screen||'Screen 1';b.config.background=$('hub-create-background').value;b.config.material='none';boards.push(b);bindBoard(b);syncBoards();hubScreens();fitAllBoards();referenceSetInspector('frames');refresh();scheduleSave();referenceCreate.close();
};
const referenceScreens=hubScreens;
hubScreens=function(){referenceScreens();const add=screenBar.lastElementChild;add.onclick=()=>openReferenceCreate('screen');};
$('board-add').onclick=()=>openReferenceCreate('frame');
const referenceWorld=syncWorld;
syncWorld=function(){referenceWorld();hubScreens();};
// Rename screens from their tab without changing their frame membership.
screenBar.addEventListener('dblclick',e=>{const b=e.target.closest('button');if(!b||b===screenBar.lastElementChild)return;const old=b.textContent,name=prompt('Screen name',old)?.trim();if(!name||name===old)return;if(boards.some(board=>(board.config.screen||'Screen 1')===name)){notify('Ese screen ya existe.');return;}hubChange(()=>{for(const board of boards)if((board.config.screen||'Screen 1')===old)board.config={...board.config,screen:name};config=currentBoard().config;});hubScreens();});
// Remove stale floating windows; Frames are always in the lower-right region.
$('close-layers').hidden=true;
nextTab='history';referenceSetLibrary('history');referenceSetInspector('frames');hubScreens();syncLayers();syncHistory();fitAllBoards();hideToolTip();

// Project naming belongs to File > Configuration, not an extra header control.
const projectNameField=document.createElement('label');projectNameField.className='field';
const projectNameLabel=document.createElement('span');projectNameLabel.textContent='Project name';
projectNameField.append(projectNameLabel,projectTitle);$('config-form').prepend(projectNameField);projectTitle.hidden=false;
