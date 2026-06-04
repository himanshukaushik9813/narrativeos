"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const count = 800;
  const { pointer } = useThree();

  const { basePositions, positions, linePositions, sizes } = useMemo(() => {
    const basePositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.pow(Math.random(), 0.42) * 8;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi) * 0.3;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = 1.5 + Math.random() * 1.5;
    }

    const linePositions: number[] = [];
    const threshold = 1.62;
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < threshold) {
          linePositions.push(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2]
          );
        }
      }
    }

    return { basePositions, positions, linePositions: new Float32Array(linePositions), sizes };
  }, []);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const cursorX = pointer.x * 5;
    const cursorY = pointer.y * 3;

    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
      const values = positionAttr.array as Float32Array;

      for (let i = 0; i < count; i += 1) {
        const ix = i * 3;
        const bx = basePositions[ix];
        const by = basePositions[ix + 1];
        const dx = bx - cursorX;
        const dy = by - cursorY;
        const distance = Math.max(0.4, Math.sqrt(dx * dx + dy * dy));
        const repulsion = Math.max(0, 1.25 - distance) * 0.32;

        values[ix] = bx + (dx / distance) * repulsion + Math.sin(elapsed * 0.4 + i) * 0.015;
        values[ix + 1] = by + (dy / distance) * repulsion + Math.cos(elapsed * 0.35 + i) * 0.015;
        values[ix + 2] = basePositions[ix + 2];
      }
      positionAttr.needsUpdate = true;
      pointsRef.current.rotation.y = elapsed * 0.03;
      pointsRef.current.rotation.x = Math.sin(elapsed * 0.015) * 0.1;
    }

    if (linesRef.current) {
      linesRef.current.rotation.y = elapsed * 0.03;
      linesRef.current.rotation.x = Math.sin(elapsed * 0.015) * 0.1;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#efffe5" transparent opacity={0.88} sizeAttenuation />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#b4ff5a" transparent opacity={0.2} />
      </lineSegments>
    </>
  );
}

export function ParticleNetwork() {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      camera={{ position: [0, 0, 12], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.1} />
      <Particles />
    </Canvas>
  );
}
