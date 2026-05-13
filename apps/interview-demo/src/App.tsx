import { useEffect, useMemo, useState } from 'react';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

import { Pitch } from './Pitch';
import { PlayerToken } from './PlayerToken';
import type { PlayerSeed } from './types';
import { useFplSeedXi } from './use-fpl-data';
import { useYRoom } from './use-y-room';

function readRoomFromHash(): string {
  if (typeof window === 'undefined') return 'simply-fpl-demo-default';
  const hash = window.location.hash.replace(/^#/, '');
  return hash || 'simply-fpl-demo-default';
}

export function App() {
  const [room, setRoom] = useState(readRoomFromHash);
  const { seeds, isLive } = useFplSeedXi();
  const { positions, peers, setPosition } = useYRoom(room);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    function onHashChange() {
      setRoom(readRoomFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const selectedSeed: PlayerSeed | null = useMemo(() => {
    if (selectedId === null) return null;
    return seeds.find((s) => s.id === selectedId) ?? null;
  }, [selectedId, seeds]);

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Canvas shadows camera={{ position: [0, 50, 55], fov: 40 }} dpr={[1, 2]}>
          <color attach="background" args={['#0b0f14']} />
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[20, 40, 10]}
            intensity={1.1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <Pitch />
          {seeds.map((seed) => {
            const live = positions.get(seed.id);
            const x = live?.x ?? seed.defaultX;
            const z = live?.z ?? seed.defaultZ;
            return (
              <PlayerToken
                key={seed.id}
                seed={seed}
                x={x}
                z={z}
                isSelected={selectedId === seed.id}
                onSelect={() => setSelectedId(seed.id)}
                onDrag={(nx, nz) => setPosition(seed.id, { x: nx, z: nz })}
                onDragEnd={() => {
                  /* no-op — sync is per-move */
                }}
              />
            );
          })}
          <OrbitControls
            enablePan={false}
            minDistance={30}
            maxDistance={120}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>
      </div>

      <div className="panel intro">
        <h1>Three.js + Y.js · Collaborative FPL Pitch</h1>
        <p>
          Drag any player token. Position state is a Y.js <code>Y.Map</code> synced over WebRTC, so
          another tab on this page sees the move within ~50&nbsp;ms.
        </p>
        <p>
          Open this URL in a second window — or share it — to test multiplayer. Optional room name:
          add <code>#my-room</code> to the URL.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
          {isLive
            ? 'Players from live FPL bootstrap.'
            : 'Players are mock data — set VITE_API_URL to pull from the live FPL worker.'}
        </p>
      </div>

      <div className="panel presence">
        <span className="panel-title" style={{ margin: 0 }}>
          {peers.length} online
        </span>
        <div className="presence-dots">
          {peers.map((p) => (
            <span
              key={p.clientId}
              className="presence-dot"
              style={{ background: p.color }}
              title={p.name}
            />
          ))}
        </div>
      </div>

      {selectedSeed ? (
        <div className="panel player-card">
          <div className="panel-title">Selected player</div>
          <div className="name">
            {selectedSeed.webName}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              · {selectedSeed.teamShort}
            </span>
          </div>
          <div className="panel-row">
            <span>Position</span>
            <span>{selectedSeed.position.toUpperCase()}</span>
          </div>
          <div className="panel-row">
            <span>Total pts</span>
            <span>{selectedSeed.totalPoints}</span>
          </div>
          <div className="panel-row">
            <span>Form</span>
            <span>{selectedSeed.form.toFixed(1)}</span>
          </div>
        </div>
      ) : null}

      <div className="panel footer">
        <a href="https://github.com/pete-watters/simply-fpl" target="_blank" rel="noreferrer">
          source ↗
        </a>
        &nbsp;·&nbsp;Three.js <span style={{ color: 'var(--text)' }}>r170</span> &nbsp;·&nbsp; Y.js{' '}
        <span style={{ color: 'var(--text)' }}>v13</span>
      </div>
    </div>
  );
}
