'use client';
import {useEffect, useRef, useState} from 'react';
import {Pause, Play, RotateCcw} from 'lucide-react';
import {url} from './routes';

export function MotorSafetyScene({reduced}: {reduced:boolean}) {
 const host=useRef<HTMLDivElement>(null), wake=useRef<()=>void>(()=>{});
 const [fault,setFault]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false);
 const state=useRef({fault,paused,reduced});
 useEffect(()=>{state.current={fault,paused,reduced};wake.current();},[fault,paused,reduced]);
 useEffect(()=>{
  let stopped=false,dispose=()=>{};
  import('three').then(T=>{
   if(stopped||!host.current)return;const el=host.current;
   let renderer:import('three').WebGLRenderer;
   try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
   renderer.domElement.setAttribute('aria-hidden','true');el.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,70);camera.position.set(9,10,13);camera.lookAt(0,0,0);
   scene.add(new T.HemisphereLight('#eeeae2','#101212',2.6));const light=new T.DirectionalLight('#d4a36e',4);light.position.set(-2,9,4);scene.add(light);
   const mats:import('three').Material[]=[];
   const mat=(color:string,metalness=.5,roughness=.4)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness});mats.push(m);return m;};
   const copper=mat('#bf7f3b',.8,.3),iron=mat('#485440',.7,.38),black=mat('#191d1b',.2,.7),metal=mat('#a7b09f',.85,.3);
   const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:import('three').Material,parent:import('three').Object3D=scene)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;};
   const board=new T.Group();board.position.set(-3.1,-.35,0);scene.add(board);
   box(0,0,0,3.3,.12,3.8,black,board);box(-.6,.17,0,1.35,.3,1.35,iron,board);
   for(let i=0;i<8;i++){box(-1.3,.14,-.56+i*.16,.15,.08,.075,metal,board);box(.1,.14,-.56+i*.16,.15,.08,.075,metal,board);}
   for(let i=0;i<3;i++){box(.8,.2,-.95+i*.94,.47,.3,.56,black,board);box(1.43,.14,-.95+i*.94,.2,.16,.34,copper,board);}
   const motor=new T.Group();motor.position.set(2.7,0,0);scene.add(motor);
   const outer=new T.Mesh(new T.TorusGeometry(2,.2,10,64),metal);outer.rotation.x=Math.PI/2;motor.add(outer);
   const inner=new T.Mesh(new T.TorusGeometry(1.15,.09,8,48),iron);inner.rotation.x=Math.PI/2;motor.add(inner);
   const coils=new T.InstancedMesh(new T.TorusGeometry(.26,.085,8,16),copper,60),dummy=new T.Object3D();
   for(let pole=0;pole<12;pole++){
    const a=pole*Math.PI/6;const tooth=box(Math.cos(a)*1.55,0,Math.sin(a)*1.55,.55,.5,.48,iron,motor);tooth.rotation.y=-a;
    for(let turn=0;turn<5;turn++){dummy.position.set(Math.cos(a)*1.55,-.16+turn*.08,Math.sin(a)*1.55);dummy.rotation.set(Math.PI/2,0,a);dummy.updateMatrix();coils.setMatrixAt(pole*5+turn,dummy.matrix);}
   }motor.add(coils);
   const rotor=new T.Group();motor.add(rotor);
   const core=new T.Mesh(new T.CylinderGeometry(.9,.9,.52,48),iron);rotor.add(core);
   const shaft=new T.Mesh(new T.CylinderGeometry(.16,.16,1.9,24),metal);shaft.position.y=.6;rotor.add(shaft);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;const magnet=box(Math.cos(a)*.9,0,Math.sin(a)*.9,.12,.48,.45,i%2?copper:metal,rotor);magnet.rotation.y=-a;}
   const paths=[-.9,0,.9].map((z,i)=>new T.CatmullRomCurve3([new T.Vector3(-1.65,-.18,z),new T.Vector3(-.7,-.18,z),new T.Vector3(.05,-.18,z*.75),new T.Vector3(.75,-.18,z*.8)]));
   const lineMaterial=mat('#d4a36e',.6,.45),pulseMat=new T.MeshBasicMaterial({color:'#d4a36e'});mats.push(pulseMat);
   const pulses=paths.map(p=>{scene.add(new T.Mesh(new T.TubeGeometry(p,32,.034,6,false),lineMaterial));const o=new T.Mesh(new T.SphereGeometry(.07,10,8),pulseMat);scene.add(o);return o;});
   let frame=0,last=0,time=0,visible=false;
   const draw=(now:number)=>{frame=0;if(stopped||!visible||document.hidden)return;const dt=Math.max(0,Math.min((now-last)/1000||0,.05));last=now;const s=state.current;const active=!s.paused&&!s.reduced&&!s.fault;
    if(active){time+=dt;rotor.rotation.y+=dt*1.4;}
    lineMaterial.color.set(s.fault?'#485440':'#d4a36e');copper.emissive.set(s.fault?'#101212':'#343d31');
    pulses.forEach((p,i)=>{p.visible=!s.fault;p.position.copy(paths[i].getPointAt((time*.35+i/3)%1));});renderer.render(scene,camera);if(active)frame=requestAnimationFrame(draw);
   };
   const schedule=()=>{last=performance.now();if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);};wake.current=schedule;
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();schedule();};
   const ro=new ResizeObserver(resize);ro.observe(el);const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}});io.observe(el);
   const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();};document.addEventListener('visibilitychange',visibility);
   const lost=(e:Event)=>{e.preventDefault();setReady(false);cancelAnimationFrame(frame);frame=0;};renderer.domElement.addEventListener('webglcontextlost',lost);
   resize();setReady(true);
   dispose=()=>{cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{const m=o as import('three').Mesh;m.geometry?.dispose();});mats.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();wake.current=()=>{};};
  }).catch(()=>{});return()=>{stopped=true;dispose();};
 },[]);
 return <figure className="motor-scene">
  <div className="motor-scene-stage" ref={host} role="img" aria-label={fault?'Illustrative drive with PWM brake asserted and rotor stopped':'Illustrative control board connected to three phase windings and a rotating motor rotor'}>{!ready&&<img src={url('/images/scenes/boards-supervisor-768.webp')} width={768} height={512} loading="lazy" alt="Illustrative electronic control board; the hardware fault path is explained below"/>}</div>
  <div className="motor-scene-labels" aria-hidden="true"><span>DG32 → gate driver</span><span>3-phase motor · cutaway</span></div>
  <div className="motor-scene-controls"><button type="button" className="home-primary" onClick={()=>setFault(v=>!v)}>{fault?<><RotateCcw size={16}/>Reset demonstration</>:<>Inject illustrative fault<ArrowFault/></>}</button>{!reduced&&<button type="button" className="motion-pause" aria-label={paused?'Resume motor motion':'Pause motor motion'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>}</div>
  <figcaption><strong aria-live="polite">{fault?'FAULT_N asserted. PWM bridge disabled.':'Normal operation: control pulses reach the bridge.'}</strong><p>{fault?'The rotor is shown stopped to explain the control outcome. Real coast-down depends on the motor, load and external drive.':'Follow the three phase connections from the control board to the motor windings. Inject a fault to see the bridge-disable state.'}</p><small>Conceptual animation. Not a reference-board layout, timing simulation or measured motor response.</small></figcaption>
 </figure>;
}
function ArrowFault(){return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"/></svg>;}
