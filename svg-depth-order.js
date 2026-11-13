// A fixed solid model needs per-surface visibility, not sorting by each face's
// centre. Split intersecting polygons once in model space, then walk this BSP
// back-to-front for the orthographic viewing direction. No geometry changes
// or depth-order heuristics are applied during a turn.
const EPS=1e-7;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function polygonPlane(points){
 for(let i=1;i<points.length-1;i++){
  const raw=cross(sub(points[i],points[0]),sub(points[i+1],points[0])),len=Math.hypot(...raw);
  if(len>EPS){const normal=raw.map(n=>n/len);return{normal,offset:dot(normal,points[0])};}
 }
 return null;
}
export function triangulateFaces(faces){
 return faces.flatMap((face,sourceId)=>Array.from({length:face.points.length-2},(_,i)=>{
  const points=[face.points[0],face.points[i+1],face.points[i+2]],plane=polygonPlane(points);
  return plane?{...face,sourceId,points,normal:plane.normal}:null;
 }).filter(Boolean));
}
function sideOf(points,plane){
 let front=false,back=false;
 for(const p of points){const d=dot(plane.normal,p)-plane.offset;if(d>EPS)front=true;else if(d< -EPS)back=true;}
 return front?(back?3:1):(back?2:0);
}
function split(face,plane){
 const front=[],back=[],ps=face.points;
 for(let i=0;i<ps.length;i++){
  const a=ps[i],b=ps[(i+1)%ps.length],da=dot(plane.normal,a)-plane.offset,db=dot(plane.normal,b)-plane.offset;
  if(da>=-EPS)front.push(a);if(da<=EPS)back.push(a);
  if((da>EPS&&db< -EPS)||(da< -EPS&&db>EPS)){
   const t=da/(da-db),point=a.map((n,j)=>n+(b[j]-n)*t);front.push(point);back.push(point);
  }
 }
 // Keep the original face normal/material. Splitting must not introduce a
 // shading seam or cause the material to flicker when the camera moves.
 return [front,back].map(points=>points.length>=3&&polygonPlane(points)?{...face,points}:null);
}
export function buildDepthTree(faces){
 if(!faces.length)return null;
 let plane,best=Infinity;
 // Sampling a few candidate planes avoids a deep, fragmented tree without
 // expensive all-pairs optimisation. This runs once, never per video frame.
 const stride=Math.max(1,Math.floor(faces.length/14));
 for(let i=0;i<faces.length;i+=stride){
  const candidate=polygonPlane(faces[i].points);if(!candidate)continue;
  let front=0,back=0,spanning=0;
  for(const face of faces){const side=sideOf(face.points,candidate);if(side===1)front++;else if(side===2)back++;else if(side===3)spanning++;}
  const score=spanning*5+Math.abs(front-back);
  if(score<best){best=score;plane=candidate;}
 }
 if(!plane)return null;
 const front=[],back=[],coplanar=[];
 for(const face of faces){
  const side=sideOf(face.points,plane);
  if(side===0)coplanar.push(face);else if(side===1)front.push(face);else if(side===2)back.push(face);
  else{const [f,b]=split(face,plane);if(f)front.push(f);if(b)back.push(b);}
 }
 return{plane,faces:coplanar,front:buildDepthTree(front),back:buildDepthTree(back)};
}
export function orderedDepthFaces(tree,viewDirection){
 const result=[];
 function visit(node){
  if(!node)return;
  const front=dot(node.plane.normal,viewDirection)>=0;
  visit(front?node.back:node.front);result.push(...node.faces);visit(front?node.front:node.back);
 }
 visit(tree);return result;
}
