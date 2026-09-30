'use client';
import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, Pause, Play, RotateCcw} from 'lucide-react';
import {url} from './routes';

const views = [
  {name: 'Package', title: 'The interface to your board.', text: 'A QFN-64 package connects the control and safety logic to the outside world.'},
  {name: 'Die & bonds', title: 'The silicon beneath the surface.', text: 'Lift the mould compound to see the die, bond wires and leadframe. Geometry is illustrative, not a mask layout.'},
  {name: 'Safety path', title: 'Two cores. One checked result.', text: 'MAIN and CHECKER feed the comparator. A mismatch reaches the fault latch and PWM brake without application firmware.'},
] as const;

export function SemiconductorStage({reduced}: {reduced: boolean}) {
  const host = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(1), [paused, setPaused] = useState(false), [fault, setFault] = useState(false);
  const [ready, setReady] = useState(false), [unavailable, setUnavailable] = useState(false);
  const current = useRef({view, paused, reduced, fault, yaw: 0});
  const wake = useRef<() => void>(() => {});
  useEffect(() => { Object.assign(current.current, {view, paused, reduced, fault}); wake.current(); }, [view, paused, reduced, fault]);
  useEffect(() => {
    let disposed = false, cleanup = () => {};
    import('three').then(THREE => {
      if (disposed || !host.current) return;
      const el = host.current;
      let renderer: import('three').WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'}); }
      catch { setUnavailable(true); return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene(), pivot = new THREE.Group(); scene.add(pivot);
      const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
      camera.position.set(8.4, 9.6, 11.5); camera.lookAt(0, .65, 0);
      scene.add(new THREE.HemisphereLight('#eeeae2', '#101212', 2));
      const key = new THREE.DirectionalLight('#eeeae2', 4); key.position.set(3, 9, 4); scene.add(key);
      const rim = new THREE.DirectionalLight('#d4a36e', 3); rim.position.set(-6, 4, -3); scene.add(rim);
      const materials: import('three').Material[] = [], textures: import('three').Texture[] = [];
      const material = (color: string, metalness = .5, roughness = .4) => {
        const m = new THREE.MeshStandardMaterial({color, metalness, roughness}); materials.push(m); return m;
      };
      const gold = material('#d4a36e', .85, .27), silver = material('#a7b09f', .8, .35), black = material('#191d1b', .18, .65);
      const makeBox = (w: number, h: number, d: number, m: import('three').Material, x: number, y: number, z: number, group = pivot) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); group.add(mesh); return mesh;
      };
      // A measured package outline; the interior is a schematic assembly, not manufacturing data.
      const base = new THREE.Group(); pivot.add(base);
      makeBox(5.7, .26, 5.7, black, 0, -.4, 0, base);
      makeBox(3.3, .1, 3.3, silver, 0, -.57, 0, base);
      const pinGeo = new THREE.BoxGeometry(.22, .16, .5), pins = new THREE.InstancedMesh(pinGeo, silver, 64);
      const dummy = new THREE.Object3D();
      for (let side = 0; side < 4; side++) for (let i = 0; i < 16; i++) {
        const p = (i - 7.5) * .325, a = side * Math.PI / 2;
        dummy.position.set(p * Math.cos(a) + 2.73 * Math.sin(a), -.34, 2.73 * Math.cos(a) - p * Math.sin(a));
        dummy.rotation.set(0, a, 0); dummy.updateMatrix(); pins.setMatrixAt(side * 16 + i, dummy.matrix);
      }
      base.add(pins);
      const dieGroup = new THREE.Group(); pivot.add(dieGroup);
      const dieMat = material('#485440', .72, .28);
      makeBox(2.6, .17, 3.5, dieMat, 0, -.13, 0, dieGroup);
      // Fine interconnect detail is deterministic and instanced: detail without hundreds of draw calls.
      const traceMat = material('#bf7f3b', .7, .4);
      const traces = new THREE.InstancedMesh(new THREE.BoxGeometry(.012, .006, 1), traceMat, 112);
      for (let i = 0; i < 112; i++) {
        dummy.position.set(-1.2 + (i % 28) * .089, -.035, -1.25 + Math.floor(i / 28) * .82);
        dummy.scale.set(1, 1, .63 + (i % 3) * .035); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); traces.setMatrixAt(i, dummy.matrix);
      }
      dieGroup.add(traces); dummy.scale.set(1, 1, 1);
      const label = (text: string, width: number, x: number, z: number, color = '#eeeae2') => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 128;
        const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '500 48px monospace'; ctx.fillText(text, 256, 64);
        const tx = new THREE.CanvasTexture(c); textures.push(tx); tx.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshBasicMaterial({map: tx, transparent: true, depthWrite: false}); materials.push(mat);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), mat); plane.rotation.x = -Math.PI / 2; plane.position.set(x, .14, z); dieGroup.add(plane);
      };
      const coreA = material('#343d31', .35, .4), coreB = material('#343d31', .35, .4), safety = material('#bf7f3b', .45, .35);
      makeBox(.92, .13, 1.1, coreA, -.56, .03, -.84, dieGroup); label('MAIN', .78, -.56, -.84);
      makeBox(.92, .13, 1.1, coreB, .56, .03, -.84, dieGroup); label('CHECKER', .85, .56, -.84);
      makeBox(1.95, .1, .35, safety, 0, .02, .05, dieGroup); label('COMPARE', 1.2, 0, .05);
      makeBox(.84, .1, .76, coreA, -.56, .02, .87, dieGroup); label('CORDIC', .76, -.56, .87);
      makeBox(.84, .1, .76, safety, .56, .02, .87, dieGroup); label('BRAKE', .72, .56, .87);
      label('PWM / I/O', 1.3, 0, 1.49);
      const wires = new THREE.Group(); base.add(wires);
      for (let side = 0; side < 4; side++) for (let i = 0; i < 16; i++) {
        const a = side * Math.PI / 2, p = (i - 7.5) * .148;
        const start = new THREE.Vector3(p * Math.cos(a) + 1.28 * Math.sin(a), -.04, 1.72 * Math.cos(a) - p * Math.sin(a));
        const end = new THREE.Vector3((i - 7.5) * .325 * Math.cos(a) + 2.62 * Math.sin(a), -.22, 2.62 * Math.cos(a) - (i - 7.5) * .325 * Math.sin(a));
        const mid = start.clone().lerp(end, .55); mid.y = .65;
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        wires.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .013, 5, false), gold));
      }
      const lidGroup = new THREE.Group(); pivot.add(lidGroup);
      const lidMat = material('#191d1b', .14, .72); lidMat.transparent = true;
      makeBox(5.7, .64, 5.7, lidMat, 0, 0, 0, lidGroup);
      const marking = document.createElement('canvas'); marking.width = marking.height = 1024;
      const ctx = marking.getContext('2d')!; ctx.fillStyle = '#d4a36e'; ctx.font = '500 104px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DEEPGRID', 512, 400);
      ctx.fillStyle = '#eeeae2'; ctx.font = '600 82px monospace'; ctx.fillText('DG32-LITE', 512, 530);
      ctx.fillStyle = '#a7b09f'; ctx.font = '36px monospace'; ctx.fillText('QFN-64 · CONCEPT MODEL', 512, 660); ctx.beginPath(); ctx.arc(126, 128, 18, 0, 7); ctx.fill();
      const markTexture = new THREE.CanvasTexture(marking); textures.push(markTexture); markTexture.colorSpace = THREE.SRGBColorSpace;
      const markMat = new THREE.MeshBasicMaterial({map: markTexture, transparent: true, depthWrite: false}); materials.push(markMat);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), markMat); mark.rotation.x = -Math.PI / 2; mark.position.y = .326; lidGroup.add(mark);
      // Wafer reference plane: repeating die streets under the package, with a thin-film interference shader.
      const waferGeo = new THREE.CylinderGeometry(4.5, 4.5, .07, 96);
      const waferMat = new THREE.ShaderMaterial({uniforms: {time: {value: 0}}, vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec3 p; uniform float time; void main(){vec2 cell=abs(fract(p.xz*1.3)-.5);float street=step(.474,max(cell.x,cell.y));float wave=.5+.5*sin(p.x*.45+p.z*.7+time*.08);vec3 c=mix(vec3(.09,.12,.11),vec3(.26,.21,.14),wave);c=mix(c,vec3(.45,.33,.18),street*.48);gl_FragColor=vec4(c,1.0);}' }); materials.push(waferMat);
      const wafer = new THREE.Mesh(waferGeo, waferMat); wafer.position.set(.35, -1.36, -.35); pivot.add(wafer);
      const notch = makeBox(.24, .1, .24, black, .35, -1.3, 4.1);
      // Signal routes deliberately slow down the hardware relationship; they are not a timing simulation.
      const routes = new THREE.Group(); dieGroup.add(routes);
      const paths = [
        new THREE.CatmullRomCurve3([new THREE.Vector3(-.56,.25,-.9),new THREE.Vector3(-.56,.33,-.3),new THREE.Vector3(0,.25,.05)]),
        new THREE.CatmullRomCurve3([new THREE.Vector3(.56,.25,-.9),new THREE.Vector3(.56,.33,-.3),new THREE.Vector3(0,.25,.05)]),
        new THREE.CatmullRomCurve3([new THREE.Vector3(0,.25,.05),new THREE.Vector3(.56,.3,.4),new THREE.Vector3(.56,.25,1.5)])
      ];
      const signalMat = new THREE.MeshBasicMaterial({color:'#d4a36e'}); materials.push(signalMat);
      const routeMat = new THREE.MeshBasicMaterial({color:'#485440'}); materials.push(routeMat);
      const pulses = paths.map(curve => { routes.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.025,6,false),routeMat)); const dot = new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),signalMat); routes.add(dot); return dot; });
      let frame = 0, visible = true, last = 0, time = 0, lift = 1, yaw = 0;
      const draw = (stamp: number) => {
        frame = 0;
        if (disposed || !visible || document.hidden) return;
        const s = current.current, dt = Math.max(0, Math.min((stamp - last) / 1000 || 0, .05)); last = stamp;
        const target = s.view === 0 ? 0 : 1, animate = !s.reduced && !s.paused;
        if (animate) time += dt;
        lift = s.reduced ? target : THREE.MathUtils.damp(lift, target, 7, dt);
        yaw = s.reduced ? s.yaw : THREE.MathUtils.damp(yaw,s.yaw,8,dt);
        pivot.rotation.y = -.18 + yaw + (animate ? Math.sin(time*.22)*.055 : 0);
        lidGroup.position.set(-lift*.4, .39+lift*3.1, -lift*.85);
        lidMat.opacity = 1-lift*.84; markMat.opacity = 1-lift*.88; lidGroup.visible = lift < .995 || s.view === 0;
        routes.visible = s.view === 2;
        waferMat.uniforms.time.value = time;
        coreA.emissive.set(s.view===2 ? '#343d31' : '#101212'); coreB.emissive.set(s.fault ? '#bf7f3b' : '#343d31');
        paths.forEach((curve,i) => { pulses[i].position.copy(curve.getPointAt(s.fault ? (i===2 ? 1 : .98) : (time*.38 + i*.1)%1)); });
        signalMat.color.set(s.fault ? '#2f9e8c' : '#d4a36e');
        renderer.render(scene,camera);
        if (animate || Math.abs(lift-target)>.002 || Math.abs(yaw-s.yaw)>.002) frame=requestAnimationFrame(draw);
      };
      const schedule = () => { last=performance.now(); if (!frame && visible && !document.hidden) frame=requestAnimationFrame(draw); };
      wake.current=schedule;
      const resize = () => { const w=el.clientWidth,h=el.clientHeight; if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();schedule(); };
      const ro=new ResizeObserver(resize);ro.observe(el);
      const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.01});io.observe(el);
      const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();};document.addEventListener('visibilitychange',visibility);
      const lost=(e:Event)=>{e.preventDefault();setUnavailable(true);setReady(false);cancelAnimationFrame(frame);frame=0;};renderer.domElement.addEventListener('webglcontextlost',lost);
      resize();setReady(true);
      cleanup=()=>{cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{const m=o as import('three').Mesh;if(m.geometry)m.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();wake.current=()=>{};};
    }).catch((error)=>{console.error('Semiconductor scene unavailable',error);setUnavailable(true);});
    return()=>{disposed=true;cleanup();};
  }, []);
  const rotate=(delta:number)=>{current.current.yaw+=delta;wake.current();};
  return <figure className="silicon-lab">
    <div className="silicon-lab-stage" ref={host} role="img" aria-label="Illustrative DG32 package cutaway with 64 terminals, gold bond wires and labelled safety logic">
      {(!ready || unavailable) && <img className="silicon-lab-poster" src={url('/images/scenes/package-qfn-768.webp')} width={768} height={512} alt="Illustrative semiconductor package and exposed die" fetchPriority="high"/>}
    </div>
    <div className="silicon-lab-views" role="group" aria-label="Package views">{views.map((v,i)=><button key={v.name} type="button" aria-pressed={view===i} onClick={()=>{setView(i);setFault(false);}}>{v.name}</button>)}</div>
    <div className="silicon-lab-tools" role="group" aria-label="Model controls">
      <button type="button" aria-label="Rotate model left" onClick={()=>rotate(-.3)}><ArrowLeft size={16}/></button>
      <button type="button" aria-label="Rotate model right" onClick={()=>rotate(.3)}><ArrowRight size={16}/></button>
      <button type="button" aria-label="Reset model view" onClick={()=>{current.current.yaw=0;setView(1);setFault(false);wake.current();}}><RotateCcw size={16}/></button>
      {!reduced && <button type="button" aria-label={paused?'Resume scene motion':'Pause scene motion'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>}
    </div>
    <figcaption aria-live="polite"><strong>{views[view].title}</strong><p>{views[view].text}</p>{view===2&&<button className="silicon-fault-button" type="button" aria-pressed={fault} onClick={()=>setFault(v=>!v)}>{fault?'Reset illustrative fault':'Inject illustrative fault'}</button>}{view===2&&fault&&<p className="silicon-safe-state">Mismatch latched. PWM brake asserted. Visual sequence is not cycle-accurate.</p>}<small>{unavailable?'Static illustration — 3D is unavailable in this browser.':'Interactive concept · not a die photograph or mask layout.'}</small></figcaption>
  </figure>;
}
