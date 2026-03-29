"use client";
/* eslint-disable @next/next/no-img-element */

import { Canvas, useLoader, useFrame, useThree } from "@react-three/fiber";
import { Points } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useMemo, useRef } from "react";

type ParticlePointsProps = {
  mouse: React.MutableRefObject<THREE.Vector2>;
  imagePath: string;
  scale: number;
  offsetY: number;
  depthRange?: number;
};

function ParticlePoints({
  mouse,
  imagePath,
  scale,
  offsetY,
  depthRange = 1.2,
}: ParticlePointsProps) {
  const texture = useLoader(THREE.TextureLoader, imagePath);
  const pointsRef = useRef<THREE.Points>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);

  const { positions, colors } = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    if (!img || !img.width || !img.height) {
      return { positions: new Float32Array(), colors: new Float32Array() };
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { positions: new Float32Array(), colors: new Float32Array() };
    }

    const w = (canvas.width = img.width);
    const h = (canvas.height = img.height);

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h).data;

    const tempPositions: number[] = [];
    const tempColors: number[] = [];

    // Sample every pixel for maximum detail
    const step = 1;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        const r = imageData[i] / 255;
        const g = imageData[i + 1] / 255;
        const b = imageData[i + 2] / 255;
        const a = imageData[i + 3] / 255;

        // Skip transparent pixels
        if (a < 0.1) continue;

        // Calculate luminance for depth (brighter = closer)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Radial bulge (center comes forward)
        const dxImg = x - cx;
        const dyImg = y - cy;
        const radius = Math.sqrt(dxImg * dxImg + dyImg * dyImg) / maxRadius;
        const bulge = (1 - radius) * 0.6; // center is closer, stronger effect

        // Vertical bias (upper body slightly closer)
        const verticalBias = ((h / 2 - y) / h) * 0.3;

        // Combine depth factors with better normalization
        // Luminance contributes more, bulge creates center relief, vertical adds natural tilt
        const depthValue = luminance * 0.4 + bulge * 0.4 + verticalBias * 0.2;
        const pz = (depthValue - 0.35) * depthRange; // Adjusted offset for better centering

        // Scale and center
        const px = (x - w / 2) * scale;
        const py = (h / 2 - y) * scale + offsetY;

        tempPositions.push(px, py, pz);
        tempColors.push(r, g, b);
      }
    }

    return {
      positions: new Float32Array(tempPositions),
      colors: new Float32Array(tempColors),
    };
  }, [texture, scale, offsetY, depthRange]);

  useFrame(({ camera }) => {
    if (!pointsRef.current) return;

    const geometry = pointsRef.current.geometry;
    const positionsAttr = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const positionsArray = positionsAttr.array as Float32Array;

    // Cache original positions once
    if (!basePositionsRef.current || basePositionsRef.current.length === 0) {
      basePositionsRef.current = new Float32Array(positionsArray.length);
      basePositionsRef.current.set(positionsArray);
    }

    const base = basePositionsRef.current;

    // Unproject mouse NDC to world coordinates on the z=0 plane
    const ndc = new THREE.Vector3(mouse.current.x, mouse.current.y, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    const t = -camera.position.z / dir.z;
    const worldMouse = new THREE.Vector3(
      camera.position.x + dir.x * t,
      camera.position.y + dir.y * t,
      0,
    );

    for (let i = 0; i < positionsArray.length; i += 3) {
      const bx = base[i];
      const by = base[i + 1];
      const bz = base[i + 2];

      let x = positionsArray[i];
      let y = positionsArray[i + 1];
      let z = positionsArray[i + 2];

      // Mouse influence (subtle)
      const dx = bx - worldMouse.x;
      const dy = by - worldMouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const influenceRadius = 1.0;
      const maxForce = 0.015;
      const force =
        dist < influenceRadius
          ? ((influenceRadius - dist) / influenceRadius) * maxForce
          : 0;

      // Small displacement from mouse, away from cursor
      x += (dx / dist) * force;
      y += (dy / dist) * force;

      // Spring back toward base position
      const springStrength = 0.08;
      x += (bx - x) * springStrength;
      y += (by - y) * springStrength;
      z += (bz - z) * springStrength;

      positionsArray[i] = x;
      positionsArray[i + 1] = y;
      positionsArray[i + 2] = z;
    }

    positionsAttr.needsUpdate = true;
  });

  return (
    <Points ref={pointsRef} positions={positions} colors={colors} stride={3} frustumCulled>
      <pointsMaterial
        vertexColors
        size={0.03}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}

function IapyxPoints({ mouse }: { mouse: React.MutableRefObject<THREE.Vector2> }) {
  return (
    <ParticlePoints
      mouse={mouse}
      imagePath="/Iapyx-Web-Final-4.png"
      scale={0.012}
      offsetY={-0.55}
    />
  );
}

function LogoPoints({ mouse }: { mouse: React.MutableRefObject<THREE.Vector2> }) {
  return (
    <ParticlePoints
      mouse={mouse}
      imagePath="/Iapyx Logo.png"
      scale={0.008}
      offsetY={2.75}
      depthRange={1.2}
    />
  );
}

function Starfield() {
  const count = 5000; // More particles
  const pointsRef = useRef<THREE.Points>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);
  const rotationSpeedsRef = useRef<Float32Array | null>(null);
  const randomOffsetsRef = useRef<Float32Array | null>(null);
  
  const initialPositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const rotationSpeeds = new Float32Array(count);
    const randomOffsets = new Float32Array(count * 3);
    
    // Create particles in circular/spherical pattern around center
    for (let i = 0; i < count; i++) {
      // Random angle around the center
      const theta = Math.random() * Math.PI * 2; // Horizontal angle
      const phi = Math.acos(Math.random() * 2 - 1); // Vertical angle
      
      // Distance from center (vary radius for depth)
      const radius = 8 + Math.random() * 12; // Between 8 and 20 units from center
      
      // Convert spherical to cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      const idx = i * 3;
      arr[idx] = x;
      arr[idx + 1] = y;
      arr[idx + 2] = z;
      
      // Store base positions for rotation
      basePositions[idx] = x;
      basePositions[idx + 1] = y;
      basePositions[idx + 2] = z;
      
      // Each particle has its own rotation speed (slower and varied)
      rotationSpeeds[i] = 0.02 + Math.random() * 0.06; // Between 0.02 and 0.08
      
      // Random offsets for more organic movement
      randomOffsets[idx] = Math.random() * Math.PI * 2;
      randomOffsets[idx + 1] = Math.random() * Math.PI * 2;
      randomOffsets[idx + 2] = Math.random() * Math.PI * 2;
    }
    
    basePositionsRef.current = basePositions;
    rotationSpeedsRef.current = rotationSpeeds;
    randomOffsetsRef.current = randomOffsets;
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current || !basePositionsRef.current || !rotationSpeedsRef.current || !randomOffsetsRef.current) return;

    const positionsAttr = pointsRef.current.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const positionsArray = positionsAttr.array as Float32Array;
    const basePositions = basePositionsRef.current;
    const rotationSpeeds = rotationSpeedsRef.current;
    const randomOffsets = randomOffsetsRef.current;

    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const bx = basePositions[idx];
      const by = basePositions[idx + 1];
      const bz = basePositions[idx + 2];
      
      // Each particle rotates at its own speed with random offset
      const speed = rotationSpeeds[i];
      const angle = time * speed + randomOffsets[idx];
      
      // Rotate around Y axis (vertical) with some random variation
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Add slight random drift in Y and Z for more organic movement
      const yDrift = Math.sin(time * 0.1 + randomOffsets[idx + 1]) * 0.3;
      const zDrift = Math.cos(time * 0.15 + randomOffsets[idx + 2]) * 0.2;
      
      positionsArray[idx] = bx * cos + bz * sin;
      positionsArray[idx + 1] = by + yDrift; // Add vertical drift
      positionsArray[idx + 2] = -bx * sin + bz * cos + zDrift; // Add depth drift
    }

    positionsAttr.needsUpdate = true;
  });

  return (
    <Points ref={pointsRef} positions={initialPositions} stride={3} frustumCulled>
      <pointsMaterial
        color="#ffffff"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </Points>
  );
}

function CameraRig({ mouse }: { mouse: React.MutableRefObject<THREE.Vector2> }) {
  const { camera } = useThree();
  const basePos = useRef(new THREE.Vector3(0, 0, 10));

  useFrame(() => {
    // Rotate up to ~15 degrees based on mouse X position
    const maxAngle = Math.PI / 12;
    const targetAngle = mouse.current.x * maxAngle;

    // Orbit camera around the look-at point (0, 1.2, 0)
    const radius = basePos.current.z;
    const targetX = Math.sin(targetAngle) * radius;
    const targetZ = Math.cos(targetAngle) * radius;

    // Smooth lerp
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function IapyxScene() {
  const mouse = useRef(new THREE.Vector2(0, 0));

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    mouse.current.set((x - 0.5) * 2, -(y - 0.5) * 2);
  };

  return (
    <div
      className="relative h-screen w-full bg-black"
      onPointerMove={handlePointerMove}
    >
      <Canvas camera={{ position: [0, 0, 10], fov: 40 }} gl={{ antialias: true }}>
        <color attach="background" args={["#02010a"]} />
        <fog attach="fog" args={["#02010a", 15, 50]} />
        <Suspense fallback={null}>
          <Starfield />
          <LogoPoints mouse={mouse} />
          <IapyxPoints mouse={mouse} />
        </Suspense>
        <ambientLight intensity={0.4} />
        <CameraRig mouse={mouse} />
      </Canvas>
    </div>
  );
}


