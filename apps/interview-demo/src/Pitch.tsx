import { useMemo } from 'react';

import { Plane } from '@react-three/drei';
import * as THREE from 'three';

const PITCH_WIDTH = 50;
const PITCH_DEPTH = 70;

export function Pitch() {
  const lines = useMemo(() => buildPitchLines(), []);

  return (
    <group>
      <Plane args={[PITCH_WIDTH, PITCH_DEPTH]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#1f6b3a" roughness={0.85} metalness={0} />
      </Plane>

      {lines.map((line, i) => (
        <line key={i}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[line, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </line>
      ))}

      {/* Centre circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[6.5, 6.6, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function buildPitchLines(): Float32Array[] {
  const lines: Float32Array[] = [];
  const halfW = PITCH_WIDTH / 2;
  const halfD = PITCH_DEPTH / 2;
  const y = 0.02;

  // Outer rectangle
  lines.push(
    new Float32Array([
      -halfW,
      y,
      -halfD,
      halfW,
      y,
      -halfD,
      halfW,
      y,
      -halfD,
      halfW,
      y,
      halfD,
      halfW,
      y,
      halfD,
      -halfW,
      y,
      halfD,
      -halfW,
      y,
      halfD,
      -halfW,
      y,
      -halfD,
    ])
  );

  // Halfway line
  lines.push(new Float32Array([-halfW, y, 0, halfW, y, 0]));

  // Penalty boxes (top + bottom)
  const pbW = 30;
  const pbD = 14;
  const halfPB = pbW / 2;
  for (const sign of [-1, 1]) {
    const edge = sign * halfD;
    const inner = sign * (halfD - pbD);
    lines.push(
      new Float32Array([
        -halfPB,
        y,
        edge,
        -halfPB,
        y,
        inner,
        -halfPB,
        y,
        inner,
        halfPB,
        y,
        inner,
        halfPB,
        y,
        inner,
        halfPB,
        y,
        edge,
      ])
    );
  }

  return lines;
}

// Dummy export to satisfy unused-var lint if THREE namespace ends up tree-shaken.
void THREE;
