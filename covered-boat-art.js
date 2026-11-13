// Orthographic illustration of the existing world.js covered boat. Dimensions,
// pointed hull profile, six-ring hip roof, tile ribs, posts and palette follow
// that model; no character or separate skiff is part of this artwork.
import { triangulateFaces, buildDepthTree, orderedDepthFaces } from './svg-depth-order.js?v=1.35';
export const BOAT_PALETTE=Object.freeze({hull:'#8e6651',deck:'#c79c62',wood:'#8d4637',roof:'#4f8071',rib:'#659184',trim:'#719886',lantern:'#edb963'});
const SCALE=58, ELEVATION=.64, LIFT=Math.sqrt(1-ELEVATION**2);
const model=[];
function face(points,color,part){model.push({points,color,part});}
function box(w,h,d,x,y,z,color,part){
 const v=[[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,-h/2,d/2],[-w/2,-h/2,d/2],[-w/2,h/2,-d/2],[w/2,h/2,-d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]].map(p=>[p[0]+x,p[1]+y,p[2]+z]);
 for(const ids of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])face(ids.map(i=>v[i]),color,part);
}
function beam(a,b,r,color,part){
 const axis=b.map((n,i)=>n-a[i]),len=Math.hypot(...axis),v=axis.map(n=>n/len);
 const ref=Math.abs(v[1])>.95?[1,0,0]:[0,1,0];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 let u=cross(v,ref);const ul=Math.hypot(...u);u=u.map(n=>n/ul);const w=cross(v,u);
 const ring=p=>Array.from({length:6},(_,i)=>p.map((n,j)=>n+r*(u[j]*Math.cos(i*Math.PI/3)+w[j]*Math.sin(i*Math.PI/3))));
 const ra=ring(a),rb=ring(b);for(let i=0;i<6;i++)face([ra[i],ra[(i+1)%6],rb[(i+1)%6],rb[i]],color,part);
}
const quad=(a,b,c,t)=>a*(1-t)**2+2*b*t*(1-t)+c*t*t;
const hullPlan=[[-1.6,0],...Array.from({length:14},(_,i)=>{const t=(i+1)/14;return[quad(-1.6,-.6,1.2,t),quad(0,-.56,-.4,t)];}),[1.6,0],...Array.from({length:14},(_,i)=>{const t=(i+1)/14;return[quad(1.6,.6,-1.2,t),quad(0,.56,.4,t)];})];
const hullTop=hullPlan.map(([x,z])=>[x,.27,z]),hullBottom=hullPlan.map(([x,z])=>[x*.95,-.06,z*.78]);
face(hullTop,BOAT_PALETTE.deck,'hull-deck');
for(let i=0;i<hullTop.length;i++){const j=(i+1)%hullTop.length;face([hullTop[i],hullBottom[i],hullBottom[j],hullTop[j]],BOAT_PALETTE.hull,'hull');}
box(2.3,.09,.75,0,.32,0,BOAT_PALETTE.deck,'deck');
for(const x of [-.8,0,.8])box(.12,.09,.86,x,.39,0,BOAT_PALETTE.wood,'bench');
for(const x of [-.6,.6])for(const z of [-.38,.38])box(.06,.9,.06,x,.77,z,BOAT_PALETTE.wood,'post');
const w=1.7,d=1.25,h=.35,roofBase=1.17;
const outline=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
const rings=Array.from({length:7},(_,k)=>{const t=k/6;return outline.map(([x,z])=>[x*(w*.32*(1-t)+w*.5*t),roofBase+h*(1-t)*.95+t**5*(.12+(Math.abs(x)+Math.abs(z)===2?.15:0)),z*(d*.035*(1-t)+d*.5*t)]);});
for(let k=0;k<6;k++)for(let n=0;n<8;n++){const m=(n+1)%8;face([rings[k][n],rings[k+1][n],rings[k+1][m],rings[k][m]],BOAT_PALETTE.roof,'roof');}
beam([-w*.34,roofBase+h*.97,0],[w*.34,roofBase+h*.97,0],.0375,BOAT_PALETTE.trim,'ridge');
for(const s of [-1,1])beam([s*w*.34,roofBase+h*.97,0],[s*w*.42,roofBase+h*1.13,0],.0325,BOAT_PALETTE.trim,'ridge');
for(let n=0;n<8;n++)beam(rings[6][n],rings[6][(n+1)%8],.026,BOAT_PALETTE.trim,'eave');
// Ribs follow the curved roof surface, never floating across its hollow pitch.
for(let i=-4;i<=4;i++)for(const s of [-1,1]){
 const x=i*w*.09;
 for(let k=0;k<5;k++){
  const p=t=>[x,roofBase+h*(1-t)*.95+t**5*.12+.009,s*(d*.035*(1-t)+d*.5*t)];
  // A tile seam is a narrow surface strip, not a six-sided tube. Keeping it
  // on the pitch preserves the detail while avoiding hundreds of hidden
  // tube faces during animated SVG projection, especially on tablets.
  const a=p(k/5),b=p((k+1)/5);
  face([[a[0]-.007,a[1],a[2]],[b[0]-.007,b[1],b[2]],[b[0]+.007,b[1],b[2]],[a[0]+.007,a[1],a[2]]],BOAT_PALETTE.rib,'rib');
 }
}
beam([.8,1.05,0],[.8,1.21,0],.009,BOAT_PALETTE.wood,'lantern-string');
for(let a=0;a<10;a++)for(let b=0;b<6;b++){
 const p=(i,j)=>{const lat=-Math.PI/2+j*Math.PI/6,lon=i*Math.PI/5;return[.8+.108*Math.cos(lat)*Math.cos(lon),.9+.14*Math.sin(lat),.108*Math.cos(lat)*Math.sin(lon)];};
 face([p(a,b),p(a+1,b),p(a+1,b+1),p(a,b+1)],BOAT_PALETTE.lantern,'lantern');
}
beam([.8,.75,0],[.8,.65,0],.008,BOAT_PALETTE.lantern,'tassel');

export function projectBoatPoint(p,yaw=.55){
 const x=p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),z=p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);
 return{x:x*SCALE,y:(z*ELEVATION-p[1]*LIFT)*SCALE,depth:z*LIFT+p[1]*ELEVATION};
}
export function coveredBoatHull(yaw=.55){return [...hullTop,...hullBottom].map(p=>projectBoatPoint(p,yaw));}
function shade(color,normal,yaw){
 let n=normal;
 if(n[1]<0)n=n.map(v=>-v);
 const nx=n[0]*Math.cos(yaw)-n[2]*Math.sin(yaw),nz=n[0]*Math.sin(yaw)+n[2]*Math.cos(yaw);
 const light=.98+.16*(-nx*.4+n[1]*.85-nz*.35);
 return '#'+color.slice(1).match(/../g).map(c=>Math.round(Math.min(255,parseInt(c,16)*light+6)).toString(16).padStart(2,'0')).join('');
}
const sourceFaces=triangulateFaces(model);
const depthTree=buildDepthTree(sourceFaces);
export function getCoveredBoatSourceFaces(){return sourceFaces;}
export function getCoveredBoatRenderFaces(yaw=.55){
 const cameraDirection=[Math.sin(yaw)*LIFT,ELEVATION,Math.cos(yaw)*LIFT];
 return orderedDepthFaces(depthTree,cameraDirection).map(f=>({...f,projected:f.points.map(p=>projectBoatPoint(p,yaw))}));
}
export function coveredBoatArtwork(yaw=.55){
 return getCoveredBoatRenderFaces(yaw).map(f=>{
  const color=shade(f.color,f.normal,yaw);
  return `<path data-boat-part="${f.part}" d="${f.projected.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ')}Z" fill="${color}" stroke="${color}" stroke-width=".12" stroke-linejoin="round"/>`;
 }).join('');
}
