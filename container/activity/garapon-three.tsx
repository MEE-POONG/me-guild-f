"use client";

import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Color, Group, PCFShadowMap, PMREMGenerator, RepeatWrapping, SRGBColorSpace } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type GaraponThreeProps = {
  spinning: boolean;
  motion: boolean;
  winningName: string | null;
  revealKey: string | number;
  fallback?: ReactNode;
  onReady?: () => void;
  onUnavailable?: () => void;
};
type SceneProps = Omit<GaraponThreeProps, "fallback" | "onReady" | "onUnavailable"> & { onReady: () => void; onUnavailable: () => void };
const brass = { color: "#b99a50", metalness: 0.82, roughness: 0.26 };
const green = { color: "#244936", metalness: 0.38, roughness: 0.32 };
const cream = { color: "#f0dfac", metalness: 0.18, roughness: 0.28 };
const restingBall: [number, number, number] = [0, 0.87, 1.28];
const decorativeBalls: [number, number, number, string][] = [
  [-.55,-.36,.22,"#b86c4b"],[-.22,-.60,.37,"#d9b650"],[.17,-.60,.29,"#f0e0ae"],[.54,-.36,.21,"#4e7963"],
  [-.43,-.12,-.38,"#e7ca7c"],[.03,-.31,-.54,"#a75d51"],[.47,-.18,-.38,"#d5d6ba"],[-.58,.06,.14,"#74999d"],
  [-.20,-.18,.54,"#e9cf84"],[.25,-.16,.52,"#b36f3b"],[.54,.13,.03,"#b6c491"],[-.20,.18,-.48,"#f2d98c"],
  [.20,.20,-.45,"#55826d"],[-.20,.27,.36,"#c77d61"],[.20,.25,.35,"#d5bd69"],[.03,.58,.10,"#a3b6a0"],
  [-.34,.48,-.10,"#f0e5c4"],[.36,.45,-.13,"#b66d4b"],
];

class CanvasBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Decorative renderer only. The parent owns verified results and the reveal clock. */
export function GaraponThree({ fallback = null, onReady, onUnavailable, ...sceneProps }: GaraponThreeProps) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onReady, onUnavailable });
  const unavailable = useRef(false);
  useEffect(() => { callbacks.current = { onReady, onUnavailable }; }, [onReady, onUnavailable]);
  const reportFailure = useCallback(() => {
    if (unavailable.current) return;
    unavailable.current = true; setFailed(true); callbacks.current.onUnavailable?.();
  }, []);
  const reportReady = useCallback(() => { if (!unavailable.current) { setReady(true); callbacks.current.onReady?.(); } }, []);
  return <div data-renderer={failed ? "fallback" : ready ? "three-ready" : "three-loading"} aria-hidden="true" style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
    {failed ? fallback : <CanvasBoundary fallback={fallback} onUnavailable={reportFailure}>
      <Canvas frameloop="demand" dpr={[1, 1.5]} shadows={{ type: PCFShadowMap }} camera={{ position: [5.2, 3.6, 7.5], fov: 27, near: 0.1, far: 35 }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} fallback={fallback} onCreated={({ gl, camera }) => { gl.setClearColor(new Color("#f7f2e5"), 0); gl.toneMappingExposure = .82; camera.lookAt(0, 1.7, .18); }}>
        <MachineScene {...sceneProps} onReady={reportReady} onUnavailable={reportFailure} />
      </Canvas>
    </CanvasBoundary>}
  </div>;
}
export default GaraponThree;

function woodMap() {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas texture is unavailable");
  const base = ctx.createLinearGradient(0, 0, 512, 0); base.addColorStop(0, "#966330"); base.addColorStop(.4, "#bd8a48"); base.addColorStop(.7, "#a27136"); base.addColorStop(1, "#c18d4c"); ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 105; i++) { ctx.beginPath(); for (let y = 0; y <= 512; y += 8) { const x = i * 5 + Math.sin(y * .017 + i * .72) * 6 + Math.sin(y * .035 + i) * 2; if (!y) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = i % 3 ? "#68431d26" : "#ead09b42"; ctx.lineWidth = i % 4 ? .8 : 1.8; ctx.stroke(); }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(1, 2); texture.anisotropy = 4; return texture;
}
function nameMap(name: string) {
  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Name texture is unavailable");
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  const draw = () => {
    ctx.clearRect(0, 0, 1024, 400);
    ctx.fillStyle = "#f9edc5"; ctx.strokeStyle = "#ad8b43"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.roundRect(20, 17, 984, 366, 100); ctx.fill(); ctx.stroke();
    const noto = getComputedStyle(document.documentElement).getPropertyValue("--font-noto").trim();
    ctx.font = `600 65px ${noto || '"Noto Sans Thai"'}, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#274631";
    const graphemes = [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(name)].map((part) => part.segment);
    const lines: string[] = []; let line = "";
    for (const glyph of graphemes) { if (ctx.measureText(line + glyph).width > 865 && line) { lines.push(line); line = glyph; } else line += glyph; }
    if (line) lines.push(line);
    const shown = lines.slice(0, 3); if (lines.length > 3) shown[2] = `${shown[2].slice(0, -2)}…`;
    shown.forEach((text, index) => ctx.fillText(text, 512, 200 + (index - (shown.length - 1) / 2) * 83)); texture.needsUpdate = true;
  };
  draw(); return { texture, draw };
}

function MachineScene({ spinning, motion, winningName, revealKey, onReady, onUnavailable }: SceneProps) {
  const { gl, scene, invalidate } = useThree();
  const drum = useRef<Group>(null), crank = useRef<Group>(null), winner = useRef<Group>(null);
  const firstFrame = useRef(false), readyFrame = useRef<number | null>(null), alive = useRef(true);
  const sequence = useRef({ active: false, start: null as number | null, key: revealKey });
  const wood = useMemo(() => woodMap(), []);
  const label = useMemo(() => winningName ? nameMap(winningName) : null, [winningName]);
  useEffect(() => () => wood.dispose(), [wood]);
  useLayoutEffect(() => {
    // PMREM renders into GPU memory: allocate only after commit, including under StrictMode.
    const room = new RoomEnvironment(), generator = new PMREMGenerator(gl);
    const target = (() => { try { return generator.fromScene(room, .04); } finally { room.dispose(); generator.dispose(); } })();
    const previous = scene.environment, previousIntensity = scene.environmentIntensity;
    // This Canvas owns a mutable Three scene; these are external renderer resources, not React state.
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = target.texture;
    scene.environmentIntensity = .55;
    invalidate();
    return () => {
      if (scene.environment === target.texture) {
        scene.environment = previous;
        scene.environmentIntensity = previousIntensity;
      }
      target.dispose();
    };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    let disposed = false;
    if (label) void document.fonts.ready.then(() => { if (!disposed) { label.draw(); invalidate(); } }).catch(() => undefined);
    invalidate(); return () => { disposed = true; label?.texture.dispose(); };
  }, [label, invalidate]);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onUnavailable(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useEffect(() => {
    alive.current = true; firstFrame.current = false; readyFrame.current = null; invalidate();
    return () => { alive.current = false; if (readyFrame.current !== null) cancelAnimationFrame(readyFrame.current); };
  }, [invalidate]);
  useLayoutEffect(() => {
    sequence.current = { active: spinning && motion, start: null, key: revealKey };
    if (drum.current) drum.current.rotation.x = 0;
    if (crank.current) crank.current.rotation.x = 0;
    if (winner.current) { winner.current.position.set(...restingBall); winner.current.scale.setScalar(1.35); winner.current.visible = !!winningName && !spinning || spinning && !motion; }
    invalidate();
    return () => { sequence.current.active = false; };
  }, [spinning, motion, revealKey, winningName, invalidate]);
  useFrame(() => {
    if (!firstFrame.current) { firstFrame.current = true; readyFrame.current = requestAnimationFrame(() => { if (alive.current) onReady(); }); }
    const animation = sequence.current;
    if (!animation.active) return;
    const now = performance.now(); if (animation.start === null) animation.start = now;
    const elapsed = now - animation.start, t = Math.min(1, elapsed / 1900), rotationT = Math.min(1, elapsed / 1180);
    const turn = rotationT < .5 ? 4 * rotationT ** 3 : 1 - (-2 * rotationT + 2) ** 3 / 2;
    if (drum.current) drum.current.rotation.x = turn * Math.PI * 4;
    if (crank.current) crank.current.rotation.x = turn * Math.PI * 6;
    if (winner.current) {
      const u = Math.max(0, Math.min(1, (elapsed - 1100) / 800)); winner.current.visible = elapsed >= 1100;
      const fall = Math.min(1, u / .62), bounce = Math.max(0, (u - .62) / .38);
      winner.current.position.set(0, 1.34 - .47 * fall ** 2 + Math.sin(bounce * Math.PI) * .12 * (1 - bounce), .54 + .74 * (1 - (1 - u) ** 2)); winner.current.scale.setScalar(.34 + 1.01 * Math.min(1, u * 2));
    }
    if (t < 1) invalidate(); else animation.active = false;
  });

  return <>
    <ambientLight intensity={.25} color="#fff3d6" />
    <hemisphereLight args={["#fff6dc", "#66735b", .55]} />
    <directionalLight position={[2, 9, 3]} intensity={1.9} color="#fff1d1" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-3.5} shadow-camera-right={3.5} shadow-camera-top={5} shadow-camera-bottom={-2} shadow-normalBias={.035} shadow-bias={-.00015} shadow-radius={3} />
    <directionalLight position={[5, 4, -4]} intensity={.8} color="#d5e9da" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, .1]} receiveShadow><circleGeometry args={[2.45, 64]} /><shadowMaterial transparent opacity={.10} /></mesh>
    <group position={[0, .14, 0]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[1.55, 1.65, .22, 64]} /><meshStandardMaterial {...green} /></mesh>
      <mesh position={[0, .12, 0]}><cylinderGeometry args={[1.55, 1.55, .045, 64]} /><meshStandardMaterial {...brass} /></mesh>
      <mesh position={[0, .15, 0]} receiveShadow><cylinderGeometry args={[1.45, 1.48, .04, 64]} /><meshStandardMaterial color="#35533c" metalness={.2} roughness={.5} /></mesh>
    </group>
    {[-1, 1].map((side) => <group key={side} position={[side * 1.17, 1.37, 0]} rotation={[0, 0, -side * .08]}>
      <mesh castShadow receiveShadow><boxGeometry args={[.24, 2.15, .37]} /><meshStandardMaterial map={wood} color="#dfbd80" roughness={.45} /></mesh>
      <mesh position={[0, -.86, 0]}><boxGeometry args={[.28, .18, .41]} /><meshStandardMaterial {...brass} /></mesh>
      <mesh position={[0, .86, .02]}><boxGeometry args={[.29, .22, .42]} /><meshStandardMaterial {...brass} /></mesh>
      {[.85, -.86].map((y) => <mesh key={y} position={[0, y, .23]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.044, .044, .025, 6]} /><meshStandardMaterial color="#8d6c35" metalness={.85} roughness={.25} /></mesh>)}
    </group>)}
    <mesh position={[0, .7, -.02]} castShadow><boxGeometry args={[2.4, .19, .28]} /><meshStandardMaterial {...green} /></mesh>
    <mesh position={[0, 2.37, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.105, .105, 3.12, 24]} /><meshStandardMaterial {...brass} /></mesh>
    <group position={[0, 2.37, 0]} ref={drum}>
      <mesh><sphereGeometry args={[1.04, 48, 32]} /><meshPhysicalMaterial color="#fff9eb" transmission={.82} roughness={.09} thickness={.055} ior={1.25} clearcoat={.5} clearcoatRoughness={.12} envMapIntensity={.6} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[1.065, .075, 10, 64]} /><meshStandardMaterial map={wood} color="#d3ad70" roughness={.4} /></mesh>
      {[-.045, .045].map((offset) => <mesh key={offset} rotation={[0, Math.PI / 2, 0]} position={[offset, 0, 0]}><torusGeometry args={[1.075, .017, 6, 64]} /><meshStandardMaterial {...brass} /></mesh>)}
      {[-.65, .65].map((angle) => <mesh key={angle} rotation={[0, angle, 0]}><torusGeometry args={[1.065, .038, 8, 64]} /><meshStandardMaterial {...brass} roughness={.32} /></mesh>)}
      {decorativeBalls.map(([x, y, z, color], index) => <mesh key={index} position={[x, y, z]} castShadow><sphereGeometry args={[.15, 20, 14]} /><meshStandardMaterial color={color} metalness={.12} roughness={.23} /></mesh>)}
      {Array.from({ length: 10 }, (_, index) => { const angle = index * Math.PI / 5; return <mesh key={index} position={[0, Math.cos(angle) * 1.07, Math.sin(angle) * 1.07]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.034, .034, .17, 6]} /><meshStandardMaterial {...brass} /></mesh>; })}
    </group>
    <group position={[1.61, 2.37, 0]} ref={crank}>
      <mesh position={[0, .22, 0]} castShadow><boxGeometry args={[.12, .48, .13]} /><meshStandardMaterial {...brass} /></mesh>
      <mesh position={[.16, .47, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.105, .105, .4, 24]} /><meshStandardMaterial map={wood} color="#ddb377" roughness={.3} /></mesh>
      <mesh position={[.37, .47, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.11, .11, .035, 24]} /><meshStandardMaterial {...brass} /></mesh>
    </group>
    <mesh position={[0, 1.27, .55]} rotation={[.6, 0, 0]} castShadow><cylinderGeometry args={[.2, .18, .5, 24, 1, true]} /><meshStandardMaterial {...brass} side={2} /></mesh>
    <group position={[0, .32, 1.28]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[.88, .80, .10, 64]} /><meshStandardMaterial {...brass} /></mesh>
      <mesh position={[0, .06, 0]} receiveShadow><cylinderGeometry args={[.79, .79, .03, 64]} /><meshStandardMaterial color="#34503a" roughness={.65} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, .08, 0]}><torusGeometry args={[.84, .035, 8, 64]} /><meshStandardMaterial {...brass} /></mesh>
    </group>
    <group ref={winner} position={restingBall} visible={!!winningName}>
      <mesh castShadow><sphereGeometry args={[.36, 32, 24]} /><meshPhysicalMaterial {...cream} clearcoat={1} clearcoatRoughness={.15} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.363, .016, 6, 48]} /><meshStandardMaterial {...brass} /></mesh>
      {label && <sprite position={[.11, .04, .30]} scale={[1.05, .41, 1]} renderOrder={5}><spriteMaterial map={label.texture} transparent depthTest={false} toneMapped={false} /></sprite>}
    </group>
  </>;
}
