'use strict';
const effectLibrary=[
 {id:'warhol',name:'Warholian Velvet',description:'Tintas planas, textura de serigrafía y mosaicos de color.'},
 {id:'xerox',name:'Xerox Burn',description:'Blanco y negro, negros empastados y ruido de fotocopia.',amount:65,scale:45,amountLabel:'Quemado',scaleLabel:'Suciedad',amountHelp:'Empasta los negros y elimina los tonos intermedios.',scaleHelp:'Agrega ruido y bordes sucios de fotocopia.'},
 {id:'news',name:'Newsprint',description:'Semitono grueso, tinta corrida y papel grisáceo.',amount:60,scale:55,amountLabel:'Carga de tinta',scaleLabel:'Tamaño del punto',amountHelp:'Engrosa los puntos y empasta las zonas oscuras.',scaleHelp:'Puntos pequeños para detalle; grandes para una trama marcada.'},
 {id:'iconprint',name:'Iconprint',description:'Fondo invertido y semitono formado por iconos combinables.',amount:60,scale:65,amountLabel:'Carga de iconos',scaleLabel:'Tamaño de la trama',amountHelp:'Aumenta el tamaño de los iconos dentro de cada celda.',scaleHelp:'Una trama grande hace que los iconos se distingan mejor.',extra:{icons:['star','heart','flower'],inverted:true,paper:'#dad8cb',ink:'#25211e'}}
];
const printIcons=[{id:'dot',symbol:'●',name:'Círculo'},{id:'star',symbol:'★',name:'Estrella'},{id:'heart',symbol:'♥',name:'Corazón'},{id:'cross',symbol:'✚',name:'Cruz'},{id:'diamond',symbol:'◆',name:'Diamante'},{id:'square',symbol:'■',name:'Cuadrado'},{id:'flower',symbol:'✿',name:'Flor'},{id:'ring',symbol:'○',name:'Anillo'}];
function defaultGraphicSettings(id){const e=effectLibrary.find(e=>e.id===id);return {amount:e.amount,scale:e.scale,seed:1,...JSON.parse(JSON.stringify(e.extra||{}))};}
function renderIconprint(input,output,settings){
 const w=input.width,h=input.height;output.width=w;output.height=h;
 const ctx=output.getContext('2d'),src=input.getContext('2d').getImageData(0,0,w,h).data,data=ctx.createImageData(w,h),d=data.data;
 const invert=settings.inverted,decode=hex=>hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
 const transform=color=>decode(color).map(v=>invert?255-v:v);
 const paper=transform(settings.paper),ink=transform(settings.ink),icons=settings.icons?.length?settings.icons:['dot'];
 const pitch=Math.max(3,(4+settings.scale/100*34)*Math.min(w,h)/800),columns=Math.ceil(w/pitch),rows=Math.ceil(h/pitch),cells=[];
 const seed=settings.seed||1;
 function random(x,y){let n=Math.imul(x+seed*131,374761393)^Math.imul(y+seed*71,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
 const vertices=Array.from({length:10},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/5,r=i%2?.43:1;return [Math.cos(angle)*r,Math.sin(angle)*r];});
 function inside(shape,x,y){
  const r2=x*x+y*y;
  if(shape==='dot')return r2<=1;
  if(shape==='square')return Math.abs(x)<=.88&&Math.abs(y)<=.88;
  if(shape==='diamond')return Math.abs(x)+Math.abs(y)<=1.2;
  if(shape==='cross')return (Math.abs(x)<.3&&Math.abs(y)<1)||(Math.abs(y)<.3&&Math.abs(x)<1);
  if(shape==='ring')return r2<=1&&r2>=.42;
  if(shape==='flower')return Math.sqrt(r2)<.74+.26*Math.cos(Math.atan2(y,x)*6);
  if(shape==='heart'){y=-y+.2;x*=1.15;y*=1.15;return (x*x+y*y-1)**3-x*x*y*y*y<=0;}
  let hit=false;for(let i=0,j=9;i<10;j=i++){const [xi,yi]=vertices[i],[xj,yj]=vertices[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;
 }
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const cx=(col+.5)*pitch,cy=(row+.5)*pitch;
  // Average samples prevent fine details from flickering between cells.
  let tone=0,weight=0;
  for(const dx of [-.25,0,.25])for(const dy of [-.25,0,.25]){
   const x=Math.max(0,Math.min(w-1,Math.round(cx+dx*pitch))),y=Math.max(0,Math.min(h-1,Math.round(cy+dy*pitch))),p=(y*w+x)*4,alpha=src[p+3]/255;
   const l=(src[p]*.2126+src[p+1]*.7152+src[p+2]*.0722)/255;tone+=(invert?l:1-l)*alpha;weight+=alpha;
  }
  tone=weight?tone/weight:0;
  cells.push({cx,cy,radius:pitch*.48*Math.sqrt(tone)*(.4+settings.amount/100*.9),shape:icons[Math.floor(random(col,row)*icons.length)]});
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const cell=cells[Math.floor(y/pitch)*columns+Math.floor(x/pitch)],p=(y*w+x)*4;
  const hit=cell.radius>.01&&inside(cell.shape,(x+.5-cell.cx)/cell.radius,(y+.5-cell.cy)/cell.radius),color=hit?ink:paper;
  d[p]=color[0];d[p+1]=color[1];d[p+2]=color[2];d[p+3]=src[p+3];
 }
 ctx.putImageData(data,0,0);
}
function renderGraphicEffect(input,output,id,settings){
 const w=input.width,h=input.height;output.width=w;output.height=h;
 if(settings.amount===0){output.getContext('2d').drawImage(input,0,0);return;}
 if(id==='iconprint'){renderIconprint(input,output,settings);return;}
 const src=input.getContext('2d').getImageData(0,0,w,h), data=output.getContext('2d').createImageData(w,h),s=src.data,d=data.data;
 const a=settings.amount/100,z=settings.scale/100,seed=settings.seed||1,unit=Math.max(1,Math.min(w,h)/800);
 const clamp=v=>Math.max(0,Math.min(255,v));
 const index=(x,y)=>(Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4;
 const lum=p=>(s[p]*.2126+s[p+1]*.7152+s[p+2]*.0722)/255;
 const random=(x,y)=>{let n=Math.imul(x+seed*131,374761393)^Math.imul(y+seed*71,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4,n=random(x,y);
  let rgb=[s[p],s[p+1],s[p+2]];
  d[p+3]=s[p+3];if(!s[p+3]){d[p]=s[p];d[p+1]=s[p+1];d[p+2]=s[p+2];continue;}
  if(id==='xerox'){
   const edge=Math.min(x,y,w-1-x,h-1-y)/(Math.min(w,h)*.07);
   const threshold=.28+a*.46+(n-.5)*z*.38+Math.max(0,1-edge)*z*random(Math.floor(x/3),Math.floor(y/3))*.45;
   const v=lum(p)<threshold?8+Math.floor(n*14):232+Math.floor(n*23);rgb=[v,v,v];
  }else if(id==='news'){
   const pitch=(3+z*15)*unit,tx=(x+y*.08)/pitch,ty=y/pitch;
   const cx=Math.round(tx)*pitch-Math.round(ty)*pitch*.08,cy=Math.round(ty)*pitch;
   const tone=1-lum(index(cx,cy)),dx=tx-Math.round(tx),dy=ty-Math.round(ty);
   const ink=dx*dx+dy*dy<tone*(.28+a*.18)?1:0;
   rgb=[218,216,203].map(v=>v-ink*(180+a*22)+(n-.5)*14);
  }
  for(let c=0;c<3;c++)d[p+c]=clamp(rgb[c]);
 }
 output.getContext('2d').putImageData(data,0,0);
}
