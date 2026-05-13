import { useRef, useState } from 'react';

import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

import type { PlayerSeed, Position } from './types';

const POSITION_COLOR: Record<Position, string> = {
  gk: '#fbbf24',
  def: '#60a5fa',
  mid: '#34d399',
  fwd: '#f472b6',
};

interface Props {
  seed: PlayerSeed;
  x: number;
  z: number;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (x: number, z: number) => void;
  onDragEnd: () => void;
}

export function PlayerToken({ seed, x, z, isSelected, onSelect, onDrag, onDragEnd }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { camera, gl } = useThree();
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const hit = useRef(new THREE.Vector3());

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setDragging(true);
    onSelect();
    gl.domElement.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    ndc.current.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(ndc.current, camera);
    if (raycaster.current.ray.intersectPlane(dragPlane.current, hit.current)) {
      onDrag(hit.current.x, hit.current.z);
    }
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (!dragging) return;
    setDragging(false);
    gl.domElement.releasePointerCapture(event.pointerId);
    onDragEnd();
  }

  const color = POSITION_COLOR[seed.position];
  let elevation = 1;
  if (dragging) elevation = 2.5;
  else if (hovered || isSelected) elevation = 1.5;

  return (
    <group position={[x, elevation, z]}>
      <mesh
        ref={meshRef}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          gl.domElement.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          setHovered(false);
          gl.domElement.style.cursor = 'auto';
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        castShadow
      >
        <cylinderGeometry args={[1.3, 1.3, 2, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.3 : 0.1}
          roughness={0.45}
        />
      </mesh>

      <Html position={[0, 2.2, 0]} center distanceFactor={20}>
        <div
          style={{
            background: 'rgba(11, 15, 20, 0.85)',
            color: '#e6edf6',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: `1px solid ${color}`,
          }}
        >
          {seed.webName}
        </div>
      </Html>
    </group>
  );
}
