import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, SoftShadows } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { BuildingGeometry, DesignConfig } from '../model/geometry';
import { Building } from './Building';

export const CAMERA_PRESETS = [
  { id: 0, name: 'Front ¾' },
  { id: 1, name: 'Front' },
  { id: 2, name: 'Rear ¾' },
  { id: 3, name: 'Aerial' },
  { id: 4, name: 'Inside' },
];

function presetFor(geo: BuildingGeometry, preset: number) {
  const R = Math.max(geo.extW, geo.extD, 3);
  const h = geo.roof.type === 'apex' ? geo.roof.ridgeH : geo.extHeight;
  const target = new THREE.Vector3(0, h * 0.42, 0);
  switch (preset) {
    case 1:
      return { pos: new THREE.Vector3(0.6, h * 0.55, R * 1.35 + 5.5), target };
    case 2:
      return { pos: new THREE.Vector3(-R * 1.1 - 3, h * 0.9 + 1.2, -R * 1.1 - 3), target };
    case 3:
      return { pos: new THREE.Vector3(R * 0.5, R * 1.6 + 6, R * 0.9 + 3), target: new THREE.Vector3(0, 0.5, 0) };
    case 4:
      return { pos: new THREE.Vector3(-geo.intW / 2 + 0.45, geo.floorH + 1.5, -geo.intD / 2 + 0.45), target: new THREE.Vector3(geo.intW * 0.15, geo.floorH + 1.1, geo.intD / 2 + 1.5) };
    default:
      return { pos: new THREE.Vector3(R * 1.05 + 3.2, h * 0.8 + 1.4, R * 1.15 + 3.6), target };
  }
}

function CameraRig({ geo, preset, modelKey }: { geo: BuildingGeometry; preset: number; modelKey: string }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);
  const { camera } = useThree();
  const lastKey = useRef('');

  useEffect(() => {
    const key = modelKey + ':' + preset;
    const p = presetFor(geo, preset);
    if (lastKey.current === '') {
      camera.position.copy(p.pos);
      controls.current?.target.copy(p.target);
      lastKey.current = key;
      return;
    }
    if (key !== lastKey.current) {
      goal.current = { ...p, t: 0 };
      lastKey.current = key;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, modelKey, geo.extW, geo.extD, geo.extHeight]);

  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    g.t = Math.min(1, g.t + dt * 1.6);
    const k = 1 - Math.pow(1 - g.t, 3);
    camera.position.lerp(g.pos, Math.min(1, k * 0.35 + dt * 2));
    c.target.lerp(g.target, Math.min(1, k * 0.35 + dt * 2));
    c.update();
    if (g.t >= 1 && camera.position.distanceTo(g.pos) < 0.02) goal.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={preset === 4 ? 0.2 : 3}
      maxDistance={60}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.02}
      onStart={() => (goal.current = null)}
    />
  );
}

function Studio() {
  return (
    <>
      <Environment resolution={512} frames={1}>
        <color attach="background" args={['#e9e9e6']} />
        {/* big soft overhead */}
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[0, 9, 0]} scale={[14, 10, 1]} rotation-x={Math.PI / 2} />
        {/* key / fill wraps */}
        <Lightformer form="rect" intensity={1.6} color="#fff6ea" position={[8, 4, 6]} scale={[7, 5, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#e6f0ff" position={[-9, 3, 2]} scale={[6, 4, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#ffffff" position={[0, 2, -10]} scale={[10, 4, 1]} target={[0, 1, 0]} />
        {/* horizon band */}
        <Lightformer form="ring" intensity={0.5} color="#ffffff" position={[0, 0.5, 0]} scale={30} rotation-x={Math.PI / 2} />
      </Environment>
      <ambientLight intensity={0.15} />
      <directionalLight
        castShadow
        position={[-5.5, 13, 6.5]}
        intensity={3.2}
        color="#fff8ee"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[9, 5, -4]} intensity={0.5} color="#dfe8ff" />
      {!location.search.includes('nosoft') && <SoftShadows size={28} samples={18} focus={0.6} />}
    </>
  );
}

function Ground() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(512, 512, 40, 512, 512, 520);
    g.addColorStop(0, '#f5f5f3');
    g.addColorStop(0.55, '#eeeeeb');
    g.addColorStop(1, '#e7e7e4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <circleGeometry args={[70, 64]} />
      <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
    </mesh>
  );
}

export function Scene({ geo, cfg, preset }: { geo: BuildingGeometry; cfg: DesignConfig; preset: number }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.1, far: 200, position: [10, 4, 12] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
      style={{ background: 'linear-gradient(#f6f6f4, #e7e7e4)' }}
    >
      <color attach="background" args={['#eeeeec']} />
      <fog attach="fog" args={['#ececea', 28, 75]} />
      <Suspense fallback={null}>
        <Studio />
        <Ground />
        <ContactShadows position={[0, 0.002, 0]} opacity={0.7} scale={Math.max(geo.extW, geo.extD) * 3 + 6} blur={2.4} far={6} resolution={1024} frames={1} key={`${geo.extW}:${geo.extD}:${cfg.deckSize}`} />
        <Building geo={geo} cfg={cfg} />
        <CameraRig geo={geo} preset={preset} modelKey={cfg.modelId + ':' + cfg.orientation} />
      </Suspense>
    </Canvas>
  );
}
