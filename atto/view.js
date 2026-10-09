'use strict';
var studioView=(()=>{
 let tool='move',space=false,drag=null,renderTimer=0;
 const viewport=$('drop'),view={mode:'fit',zoom:1,x:0,y:0};
 function bounds(selected=false){
  const boards=selected&&studio.board()?[studio.board()]:studio.boards;
  if(!boards.length)return {left:0,top:0,width:1200,height:1200,cx:0,cy:0};
  const left=Math.min(...boards.map(b=>b.x)),top=Math.min(...boards.map(b=>b.y))-45;
  const right=Math.max(...boards.map(b=>b.x+b.width)),bottom=Math.max(...boards.map(b=>b.y+b.height));
  return {left,top,width:right-left,height:bottom-top,cx:(left+right)/2,cy:(top+bottom)/2};
 }
 function refresh(){
  if(view.mode!=='custom'){
   const rect=viewport.getBoundingClientRect(),area=bounds(view.mode==='selection');
   view.zoom=Math.max(.0001,Math.min(Math.max(1,rect.width-64)/area.width,Math.max(1,rect.height-64)/area.height));
   view.x=-area.cx*view.zoom;view.y=-area.cy*view.zoom;
  }
  for(const id of ['zoom-selection','board-delete','board-rename'])$(id).disabled=!studio.board();
  $('world').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.zoom})`;
  $('world').style.transformOrigin='0 0';
  $('zoom-value').textContent=Math.round(view.zoom*100)+'%';$('zoom-fit').setAttribute('aria-pressed',String(view.mode==='fit'));$('zoom-selection').setAttribute('aria-pressed',String(view.mode==='selection'));
  $('view-move').setAttribute('aria-pressed',String(tool==='move'));$('view-hand').setAttribute('aria-pressed',String(tool==='hand'));
  viewport.dataset.tool=space||tool==='hand'?'hand':'move';viewport.classList.toggle('view-dragging',!!drag);
  const labelSize=Math.max(10,Math.min(32,11/view.zoom));
  for(const [id,frame] of studio.frames){
   frame.label.style.fontSize=labelSize+'px';frame.label.style.bottom=`calc(100% + ${7/view.zoom}px)`;
   frame.body.style.outlineWidth=`${(id===studio.board().id?2:1)/view.zoom}px`;
   frame.placeholder.style.fontSize=`${12/view.zoom}px`;frame.placeholder.style.padding=`${8/view.zoom}px ${14/view.zoom}px`;
  }
 }
 function renderSoon(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>schedule(),120);}
 function setZoom(value,anchor){
  const old=view.zoom,next=Math.max(.005,Math.min(8,value)),rect=viewport.getBoundingClientRect();
  const x=anchor?anchor.x-rect.left-rect.width/2:0,y=anchor?anchor.y-rect.top-rect.height/2:0;
  view.x=x-(x-view.x)*next/old;view.y=y-(y-view.y)*next/old;view.mode='custom';view.zoom=next;refresh();renderSoon();
 }
 function fitView(selected=false){view.mode=selected?'selection':'fit';refresh();renderSoon();}
 function setTool(value){tool=value;refresh();}
 const api={refresh,zoom:()=>view.zoom,scale:()=>view.zoom,isPanning:event=>space||tool==='hand'||event.button===1,setZoom,fit:()=>fitView(false),focus:()=>fitView(true),state:view};
 api.previewRatio=(board=studio.board())=>{
  if(!board)return 1;
  const size=Math.max(board.width,board.height);
  if(board!==studio.board())return Math.min(1,512/size);
  const desired=Math.max(1400,size*view.zoom),level=[1400,2048,3072,4096].find(level=>level>=desired)||4096;
  return Math.min(1,level/size);
 };
 $('zoom-in').onclick=()=>setZoom(view.zoom*1.25);$('zoom-out').onclick=()=>setZoom(view.zoom/1.25);
 $('zoom-value').onclick=()=>setZoom(1);$('zoom-fit').onclick=()=>fitView(false);$('zoom-selection').onclick=()=>fitView(true);
 $('view-move').onclick=()=>setTool('move');$('view-hand').onclick=()=>setTool('hand');
 viewport.addEventListener('wheel',event=>{
  event.preventDefault();
  if(event.ctrlKey||event.metaKey)setZoom(view.zoom*Math.exp(-event.deltaY*.005),{x:event.clientX,y:event.clientY});
  else{view.mode='custom';view.x-=event.deltaX;view.y-=event.deltaY;refresh();}
 },{passive:false});
 viewport.addEventListener('pointerdown',event=>{
  if(event.target.closest('input')||event.button!==0&&event.button!==1)return;
  const frameLabel=event.target.closest('.frame-label');
  if(api.isPanning(event))drag={type:'view',id:event.pointerId,x:event.clientX,y:event.clientY,startX:view.x,startY:view.y};
  else if(frameLabel){
   const frame=frameLabel.closest('.workspace-frame'),board=studio.boards.find(b=>b.id===Number(frame.dataset.board));studio.selectBoard(board.id);
   // Freeze the camera before moving a frame so fitting doesn't chase it.
   view.mode='custom';drag={type:'frame',id:event.pointerId,x:event.clientX,y:event.clientY,startX:board.x,startY:board.y,board};
  }else return;
  viewport.setPointerCapture(event.pointerId);event.preventDefault();refresh();
 });
 viewport.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  if(drag.type==='view'){view.mode='custom';view.x=drag.startX+event.clientX-drag.x;view.y=drag.startY+event.clientY-drag.y;}
  else{
   drag.board.x=Math.round(drag.startX+(event.clientX-drag.x)/view.zoom);drag.board.y=Math.round(drag.startY+(event.clientY-drag.y)/view.zoom);
   const node=studio.frames.get(drag.board.id).node;node.style.left=drag.board.x+'px';node.style.top=drag.board.y+'px';
  }
  refresh();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,()=>{drag=null;refresh();});
 const editable=target=>!!target.closest('input,select,textarea,[contenteditable=true]');
 document.addEventListener('keydown',event=>{
  if(editable(event.target)||$('board-dialog').open)return;
  if(event.code==='Space'){event.preventDefault();space=true;refresh();}
  else if(event.key.toLowerCase()==='h'&&!event.metaKey&&!event.ctrlKey)setTool('hand');
  else if(event.key.toLowerCase()==='v'&&!event.metaKey&&!event.ctrlKey)setTool('move');
  else if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(view.zoom*1.25);}
  else if(event.key==='-'){event.preventDefault();setZoom(view.zoom/1.25);}
  else if(event.shiftKey&&event.code==='Digit1'){event.preventDefault();fitView(false);}
  else if(event.shiftKey&&event.code==='Digit2'){event.preventDefault();fitView(true);}
  else if(event.shiftKey&&event.code==='Digit0'){event.preventDefault();setZoom(1);}
 });
 document.addEventListener('keyup',event=>{if(event.code==='Space'){space=false;refresh();}});
 window.addEventListener('blur',()=>{space=false;drag=null;refresh();});
 new ResizeObserver(refresh).observe(viewport);refresh();return api;
})();
