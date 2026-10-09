'use strict';
function adjustImage(canvas,settings={}){
 const brightness=settings.brightness||0,saturation=settings.saturation||0,contrast=settings.contrast||0;
 if(!brightness&&!saturation&&!contrast)return;
 const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=image.data;
 const exposure=2**(brightness/70),gain=2**(contrast/50),chroma=1+saturation/100;
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const r=pixels[i]*exposure,g=pixels[i+1]*exposure,b=pixels[i+2]*exposure,grey=r*.2126+g*.7152+b*.0722;
  for(let c=0;c<3;c++){
   const color=c===0?r:c===1?g:b,tone=grey+(color-grey)*chroma;
   pixels[i+c]=Math.max(0,Math.min(255,(tone-127.5)*gain+127.5));
  }
 }
 ctx.putImageData(image,0,0);
}
