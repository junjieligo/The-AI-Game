import { createArrivalTrain } from "./arrival-train.js?v=1.10";
import { createGlobePin } from "./arrival-markers.js?v=1.10";
import * as THREE from "./vendor/three.module.js";
import { ARRIVAL_DURATION, ARRIVAL_CITY_START, arrivalSceneTime } from "./arrival-timeline.js?v=1.10";

// Original little travel diorama. The host owns the clock and lifecycle so that
// skip, tab visibility, reduced motion and soundtrack timing stay coordinated.
export function createArrivalScene(canvas, { profile = {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-14, 14, 10, -10, .1, 160);
  const flight = new THREE.Group(), city = new THREE.Group();
  scene.add(flight, city);
  const hemi = new THREE.HemisphereLight("#fff8e6", "#76917f", 2.5);
  const sunLight = new THREE.DirectionalLight("#fff2d5", 3);
  sunLight.position.set(-6, 16, 12);
  scene.add(hemi, sunLight);
  const palette = {
    cream: "#f3e7c7", stone: "#d3c3a1", dark: "#294e49", jade: "#4d8272",
    red: "#be6549", gold: "#e7bd75", water: "#85b5a5", leaf: "#9ab089",
  };
  const materials = new Map();
  const material = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra }));
    return materials.get(key);
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const ball = new THREE.SphereGeometry(1, 16, 10);
  const facetedBall = new THREE.IcosahedronGeometry(1, 1);
  const glow = material("#ffe0a0", { emissive: "#ffc567", emissiveIntensity: .6 });
  function box(parent, x, y, z, w, h, d, color, opts) {
    const mesh = new THREE.Mesh(cube, material(color, opts));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
  }
  function sphere(parent, x, y, z, sx, sy, sz, color, low = false, opts) {
    const mesh = new THREE.Mesh(low ? facetedBall : ball, material(color, opts));
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
  }
  function cylinder(parent, x, y, z, rt, rb, height, color, sides = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, height, sides), material(color));
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function line(parent, points, color, width = .035) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 4), width, 5, false), material(color));
    parent.add(mesh); return mesh;
  }
  function polygon(parent, coords, depth, color, position = [0,0,0]) {
    const shape = new THREE.Shape(); coords.forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material(color));
    mesh.position.set(...position); parent.add(mesh); return mesh;
  }
  function cloud(parent, x, y, z, s = 1) {
    const group = new THREE.Group(); parent.add(group); group.position.set(x,y,z); group.scale.setScalar(s);
    [[-.75,0,0,.9,.38,.47],[0,.2,0,.77,.63,.6],[.7,.02,0,.82,.43,.5]].forEach(([a,b,c,d,e,f]) => sphere(group,a,b,c,d,e,f,"#fff8e8"));
    group.userData.baseX=x; return group;
  }
  let seed = 903;
  function random() { seed = (seed * 16807) % 2147483647; return (seed-1)/2147483646; }

  // FLIGHT — an original toy aircraft over a tiny globe, with an unbroken
  // gold route and cloud bands. Windows, wings, jet pods and tail are geometry.
  const earth = new THREE.Group(); flight.add(earth); earth.position.y = -7;
  sphere(earth,0,0,0,8,8,8,palette.water,true);
  const continents = [
    [-3.8,6.8,1,2.2,.28,1.35],[-4.1,5.9,3.6,1.2,.25,1.4],[-1.4,7.7,.5,1.3,.22,.7],
    [1.5,7.4,1.8,2.1,.24,1.2],[4.4,6.4,1.8,1.5,.3,1.4],[3.3,5.9,4.5,.7,.22,.9],
    [0,5.6,5.7,.8,.22,1.5],[-2.8,5.3,5.5,.6,.2,.8],
  ];
  for (const [x,y,z,sx,sy,sz] of continents) {
    const land = sphere(earth,x,y,z,sx,sy,sz,"#b9c6a3",true);
    land.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x,y,z).normalize());
  }
  // Location markers belong on the land. They are geographical markers, not
  // aircraft targets: keep the approved aerial journey independent of them.
  const departure = createGlobePin(earth, -3.8, 1, palette.gold);
  const destination = createGlobePin(earth, 4.4, 1.8, palette.gold);
  flight.add(departure.group, destination.group);
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.4,3.1,1.2), new THREE.Vector3(-3.4,4.65,1.2),
    new THREE.Vector3(0,5.25,1.2), new THREE.Vector3(3.4,4.65,1.2), new THREE.Vector3(6.4,3.1,1.2),
  ]);
  const dashed = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(90)),new THREE.LineDashedMaterial({color:"#bb914f",dashSize:.24,gapSize:.18,transparent:true,opacity:.9}));
  dashed.computeLineDistances(); flight.add(dashed);
  const aircraft = new THREE.Group(); flight.add(aircraft);
  const livery = {terracotta:palette.red,jade:palette.jade,plum:"#91798e"}[profile.outfit] || palette.red;
  sphere(aircraft,0,0,0,1.9,.39,.4,palette.cream);
  sphere(aircraft,-.15,-.15,0,1.52,.23,.38,livery);
  sphere(aircraft,1.54,.12,.07,.42,.17,.3,palette.dark);
  // Broad swept wings lie in the horizontal x/z plane.
  for (const sign of [-1,1]) {
    const wing = polygon(aircraft,[[-.9,0],[.25,0],[-.75,2.25],[-1.35,2.25]],.095,palette.cream);
    wing.rotation.x = sign * Math.PI/2; wing.position.set(.4,-.02,0);
    const tail = polygon(aircraft,[[-1.5,0],[-.85,0],[-1.5,.92],[-1.9,.92]],.075,palette.cream);
    tail.rotation.x=sign*Math.PI/2; tail.position.y=.15;
    const engine=cylinder(aircraft,-.17,-.37,sign*.95,.18,.2,.75,palette.cream,10); engine.rotation.z=Math.PI/2;
    sphere(aircraft,.22,-.37,sign*.95,.035,.13,.13,palette.dark);
    for(let i=0;i<5;i++) sphere(aircraft,.95-i*.43,.09,sign*.365,.09,.1,.035,palette.dark);
  }
  const fin=polygon(aircraft,[[-1.75,.1],[-.85,.1],[-1.45,1.12],[-1.8,1.12]],.1,livery,[0,0,-.05]);
  box(aircraft,-1.55,.7,.06,.18,.1,.03,palette.gold);
  const flightClouds=[];
  [[-7,1.6,4,1.1],[-5.8,.6,5,1.4],[3,.4,5,1.2],[9,3.2,4,1.2],[-4,4,-4,1.1],[3,5,-5,.9],[8,5,-4,.7]].forEach(p => flightClouds.push(cloud(flight,...p)));

  // CITY — a hillside cutaway, recognisably Liziba: an elevated monorail
  // runs through a real open station storey, beneath the apartment floors.
  const river=box(city,0,-.65,2,31,.5,20,palette.water);
  box(city,0,-.1,-.8,23,.6,11.3,palette.stone);
  box(city,0,.25,-.8,22.8,.15,11.1,palette.cream);
  const mountains=[];
  [[-10, -7, 7,7],[-5,-9,8,10],[1,-10,8,12],[7,-9,8,9.5],[12,-7,7,7.5]].forEach(([x,z,w,h],i) => {
    const m=new THREE.Mesh(new THREE.ConeGeometry(w*.65,h,5,2),material(["#8fa99a","#9fb29e","#afbea7"][i%3]));
    m.position.set(x,h/2-1,z);m.rotation.y=i*.43;city.add(m);mountains.push(m);
  });
  // Behind the station, stepped residential neighbours climb the hill.
  for (const [x,z,w,h] of [[-7,-4,2.6,4],[-4.1,-5,2.3,6.2],[4.6,-4.6,2.4,7.1],[7.3,-4.1,2.5,5.2]]) {
    box(city,x,h/2+.35,z,w,h,2.2,"#d5c7ab");
    box(city,x,h+.45,z,w+.2,.18,2.4,palette.jade);
    for(let r=0;r<Math.floor(h/1.1);r++)for(let c=0;c<2;c++)box(city,x+(c-.5)*.9,1+r*1.05,z+1.12,.5,.55,.045,palette.cream,{emissive:"#ebba74",emissiveIntensity:.25});
  }
  // The slot spans y=2.45–3.95 and z=-.7–1.25. The train fits entirely
  // inside that corridor. Two exterior side openings stay visibly open.
  const station=new THREE.Group(); city.add(station);
  box(station,0,1.37,0,4.8,2.15,3.9,"#cfbea0");
  box(station,0,7.05,0,4.8,6.2,3.9,"#eadbb9");
  box(station,0,10.27,0,5.15,.24,4.2,palette.jade);
  box(station,0,10.47,0,4.5,.16,3.6,palette.cream);
  // Station band at the front; no opaque wall is placed across the train line.
  box(station,0,3.2,1.81,4.8,1.5,.27,palette.jade);
  const signCanvas=document.createElement("canvas");signCanvas.width=512;signCanvas.height=160;
  const ink=signCanvas.getContext("2d");ink.fillStyle="#fff0cd";ink.textAlign="center";
  ink.font='bold 69px "Noto Sans SC", sans-serif';ink.fillText("李子坝",256,78);
  ink.font='bold 29px Nunito, sans-serif';ink.fillText("L I Z I B A",256,128);
  const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
  const stationSign=new THREE.Mesh(new THREE.PlaneGeometry(3.7,1.15),new THREE.MeshBasicMaterial({map:signTexture,transparent:true,depthWrite:false}));
  stationSign.position.set(0,3.2,1.96);station.add(stationSign);
  box(station,0,3.91,1.95,5.05,.15,.55,palette.gold);
  box(station,0,2.48,1.95,5.05,.15,.55,palette.cream);
  for(const x of [-2.24,2.24]) {
    box(station,x,3.2,-1.68,.31,1.5,.55,"#d0b994");
    box(station,x,3.2,1.47,.31,1.5,.35,"#d0b994");
    // A clear, warm rim calls attention to the tunnel mouth on each side.
    box(station,x,3.91,.1,.13,.12,2.35,palette.gold);
  }
  // Apartment facade: inset jade windows, tiny balconies, golden interior light.
  for(let row=0;row<5;row++)for(let col=0;col<4;col++) {
    const x=(col-1.5)*1.08,y=4.65+row*1.05;
    box(station,x,y,1.972,.7,.63,.06,palette.jade);
    box(station,x,y,2.012,.49,.47,.025,palette.cream,{emissive:"#ffca7a",emissiveIntensity:.38});
    box(station,x,y-.38,2.08,.84,.1,.29,palette.stone);
    box(station,x,y,2.03,.035,.5,.025,palette.jade);
  }
  for(let row=0;row<5;row++)for(const z of [-1.13,0,1.13]) {
    box(station,2.415,4.65+row*1.05,z,.045,.62,.67,palette.jade);
    box(station,2.442,4.65+row*1.05,z,.018,.45,.48,palette.cream,{emissive:"#ffca7a",emissiveIntensity:.38});
  }
  // Ground-floor little shops and awnings on the river-facing facade.
  for(const x of [-1.55,0,1.55]) {
    box(station,x,1.08,1.98,1.12,1.28,.045,palette.dark);
    const awning=box(station,x,1.91,2.18,1.28,.13,.85,palette.red);awning.rotation.x=.13;
    box(station,x,1.52,2.05,.84,.28,.03,palette.gold);
  }
  // Raised track and rhythmic concrete piers. One broad monorail beam.
  box(city,0,2.35,.15,27,.34,.64,"#9b9d87");
  box(city,0,2.55,.15,27,.1,.31,palette.cream);
  for(const x of [-11,-7.5,-4,4,7.5,11]) {
    box(city,x,1.32,.15,.38,2.1,.46,"#c3b394");
    box(city,x,2.06,.15,1.1,.25,.75,"#d4c7ac");
  }
  // A single bevelled body per car prevents the front from fighting its glass/paint.
  const train = createArrivalTrain(palette); city.add(train);
  // Riverside promenade, lanterns and a tiny pavilion echo the playable town.
  for(let i=0;i<19;i++) box(city,-10.8+i*1.2,.39,3.7,1.1,.07,1.05,"#e5dab9");
  for(const x of [-10,-7,-4,4,7,10]) {
    cylinder(city,x,1.15,4.05,.045,.045,1.7,palette.red,8);
    box(city,x+.24,1.97,4.05,.53,.065,.075,palette.red);
    sphere(city,x+.43,1.72,4.05,.18,.23,.18,"#edb866",false,{emissive:"#e8a054",emissiveIntensity:.5});
  }
  function tree(x,z,scale=1) {
    const g=new THREE.Group();g.position.set(x,.36,z);g.scale.setScalar(scale);city.add(g);
    cylinder(g,0,.8,0,.09,.14,1.6,"#9d8457",7);
    sphere(g,0,1.95,0,.88,.74,.82,palette.leaf,true);
    sphere(g,-.55,1.7,.05,.57,.55,.61,"#b6c293",true);
  }
  [[-9,1.8,.9],[-6.3,2.4,.75],[6,2.7,.7],[9,1.2,1]].forEach(p=>tree(...p));
  const pavilion=new THREE.Group();pavilion.position.set(-8.5,.35,3);city.add(pavilion);
  for(const x of [-.65,.65])for(const z of [-.5,.5])cylinder(pavilion,x,.75,z,.065,.07,1.5,palette.red,8);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.35,.65,4),material(palette.jade));roof.rotation.y=Math.PI/4;roof.scale.z=.78;roof.position.y=1.8;pavilion.add(roof);
  box(pavilion,0,1.5,0,2,.1,1.6,palette.gold);
  // Reflections are quiet horizontal strokes rather than expensive post effects.
  const riverMarks=[];
  for(let i=0;i<32;i++) {
    const x=-13+random()*26,z=5+random()*5;
    const m=box(city,x,-.38,z,.3+random()*.85,.025,.035,i%4===0?"#d5be84":"#b0d0ba");riverMarks.push(m);
  }
  const boat=new THREE.Group();boat.position.set(7,-.2,7);city.add(boat);
  const hull=new THREE.Mesh(new THREE.CylinderGeometry(1,.65,.35,5),material(palette.red));hull.scale.set(1.25,1,.5);hull.rotation.y=Math.PI/2;boat.add(hull);
  box(boat,0,.38,0,1,.65,.6,palette.cream);box(boat,0,.76,0,1.35,.15,.9,palette.jade);

  // Celestial elements remain common to both shots; exactly one day/night change.
  const sky=new THREE.Group();scene.add(sky);
  const sun=sphere(sky,-13,13,-12,1.1,1.1,1.1,"#f4d897",false,{emissive:"#f7cb7f",emissiveIntensity:.5});
  const moon=sphere(sky,10,13,-12,.8,.8,.8,"#fff1cc",false,{emissive:"#fff0cc",emissiveIntensity:.6});
  const starPositions=[];for(let i=0;i<88;i++)starPositions.push((random()-.5)*45,6+random()*16,-12-random()*15);
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
  const starMat=new THREE.PointsMaterial({color:"#ffe9b9",size:.075,sizeAttenuation:false,transparent:true,opacity:0});
  starMat.size=2; const stars=new THREE.Points(starGeo,starMat);sky.add(stars);
  const cityClouds=[cloud(sky,-10,10,-8,1.5),cloud(sky,5,14,-12,1),cloud(sky,13,9,-9,1.2)];
  // Full-frame cream cloud veil conceals the camera cut, without a hard flash.
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({color:"#e9e6d8",transparent:true,opacity:0,depthTest:false,depthWrite:false}));
  veil.frustumCulled=false;veil.renderOrder=999;scene.add(veil);

  let width=1,height=1,lastTime=0,disposed=false;
  const dayColor=new THREE.Color("#e8f0e8"),duskColor=new THREE.Color("#dfb8a2"),nightColor=new THREE.Color("#233f53");
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function resize() {
    if(disposed)return;
    const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    renderer.setSize(width,height,false);render(lastTime);
  }
  function render(seconds=0) {
    if(disposed)return;
    lastTime=Math.max(0,Math.min(ARRIVAL_DURATION,seconds));const t=arrivalSceneTime(lastTime);
    const isCity=lastTime>=ARRIVAL_CITY_START;
    flight.visible=!isCity;city.visible=isCity;
    const night=ease((t-.55)/2.25);
    scene.background=night<.5?dayColor.clone().lerp(duskColor,night*2):duskColor.clone().lerp(nightColor,(night-.5)*2);
    hemi.intensity=2.5-night*.95;sunLight.intensity=3-night*1.1;
    sunLight.color.set(night<.5?"#fff0ce":"#c7d9e0");
    sun.visible=night<.8;sun.position.y=13-night*13;
    moon.visible=night>.6;stars.visible=night>.3;starMat.opacity=ease((night-.45)/.55)*.9;
    moon.scale.setScalar(.8);moon.position.y=10+night*3;
    const aspect=width/height;
    // Portrait keeps both tunnel mouths and the entire train passage inside frame.
    let halfWidth=isCity?(aspect<.85?10.8:14.8):(aspect<.85?9:11.5);
    let halfHeight=halfWidth/aspect;
    if(halfHeight<(isCity?9.9:8.1)){halfHeight=isCity?9.9:8.1;halfWidth=halfHeight*aspect;}
    camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
    if(isCity) {
      const progress=ease((lastTime-ARRIVAL_CITY_START)/(ARRIVAL_DURATION-ARRIVAL_CITY_START));
      camera.position.set(14-progress*1.8,12.5,21+progress*.4);camera.lookAt(0,4.4,0);
      train.position.x=-9+19*Math.max(0,Math.min(1,(t-2.97)/3.15));
      boat.position.x=7-(t-2.9)*.18;boat.rotation.z=Math.sin(t*2)*.025;
      riverMarks.forEach((m,i)=>m.scale.x=1+Math.sin(t*1.4+i)*.12);
    } else {
      const p=Math.max(0,Math.min(1,t/2.8));
      camera.position.set(11,10.5,20);camera.lookAt(0,1.7,0);
      const at=route.getPoint(p);aircraft.position.copy(at);aircraft.position.y+=.26;
      const tangent=route.getTangent(p);
      aircraft.rotation.z=Math.atan2(tangent.y,tangent.x);
      aircraft.rotation.x=-.12+Math.sin(t*2)*.035;
      aircraft.scale.setScalar(aspect<.85?1.35:1.15);
      flightClouds.forEach((c,i)=>c.position.x=c.userData.baseX+Math.sin(t*.5+i)*.12);
    }
    const forward=camera.getWorldDirection(new THREE.Vector3());
    const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    sun.position.copy(camera.position).addScaledVector(forward,70).addScaledVector(right,-halfWidth*.7).addScaledVector(up,halfHeight*(.55-night*.9));
    moon.position.copy(camera.position).addScaledVector(forward,70).addScaledVector(right,halfWidth*.73).addScaledVector(up,halfHeight*(.4+night*.18));
    cityClouds.forEach((c,i)=>c.position.y=[10,14,9][i]+Math.sin(t*.3+i)*.08);
    const veilUp=ease((t-2.55)/.35),veilDown=1-ease((t-2.9)/.35);
    veil.material.opacity=veilUp*veilDown;
    veil.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
    veil.quaternion.copy(camera.quaternion);
    veil.scale.set((camera.right-camera.left)/2,(camera.top-camera.bottom)/2,1);
    renderer.render(scene,camera);
  }
  function destroy() {
    if(disposed)return;disposed=true;
    const geometries=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});
    geometries.forEach(g=>g.dispose());mats.forEach(m=>{m.map?.dispose();m.dispose();});renderer.dispose();renderer.forceContextLoss();
  }
  resize();
  return { render, resize, destroy };
}
