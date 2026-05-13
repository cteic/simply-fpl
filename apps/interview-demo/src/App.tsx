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
  const { positions, votes, peers, clientId, setPosition, castCaptainVote } = useYRoom(room);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const peerById = useMemo(() => {
    const map = new Map<number, (typeof peers)[number]>();
    for (const peer of peers) map.set(peer.clientId, peer);
    return map;
  }, [peers]);

  const votesByPlayer = useMemo(() => {
    const out = new Map<number, number[]>(); // playerId -> voter clientIds
    votes.forEach((playerId, voterId) => {
      const arr = out.get(playerId) ?? [];
      arr.push(voterId);
      out.set(playerId, arr);
    });
    return out;
  }, [votes]);

  const myVoteId = votes.get(clientId) ?? null;

  const tally = useMemo(() => {
    const counts: Array<{ playerId: number; count: number }> = [];
    votesByPlayer.forEach((voters, playerId) => {
      counts.push({ playerId, count: voters.length });
    });
    return counts.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [votesByPlayer]);

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
            const voterIds = votesByPlayer.get(seed.id) ?? [];
            const voterColors = voterIds
              .map((id) => peerById.get(id)?.color)
              .filter((c): c is string => Boolean(c));
            return (
              <PlayerToken
                key={seed.id}
                seed={seed}
                x={x}
                z={z}
                isSelected={selectedId === seed.id}
                voteCount={voterIds.length}
                voterColors={voterColors}
                isYourCaptain={myVoteId === seed.id}
                onSelect={() => setSelectedId(seed.id)}
                onVote={() => castCaptainVote(seed.id)}
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
        <h1>FPL Captain Pick Party</h1>
        <p>
          <strong>Tap a player</strong> to cast your captain vote. <strong>Drag</strong> to move
          them around. Everyone in the room sees votes and positions update live.
        </p>
        <p>
          Open this URL in a second window — or share it with the league chat — to debate captaincy
          in real time. Optional room name: append <code>#my-room</code>.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
          Two Y.Maps under the hood — one for positions, one for votes — sync over WebRTC.{' '}
          {isLive ? 'Players from live FPL bootstrap.' : 'Mock XI (set VITE_API_URL for live).'}
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
          <div className="panel-row">
            <span>Captain votes</span>
            <span>{(votesByPlayer.get(selectedSeed.id) ?? []).length}</span>
          </div>
        </div>
      ) : null}

      <div className="panel tally">
        <div className="panel-title">Captain tally</div>
        {tally.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            No votes yet — tap a player.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tally.map(({ playerId, count }) => {
              const seed = seeds.find((s) => s.id === playerId);
              if (!seed) return null;
              const isMine = myVoteId === playerId;
              return (
                <div
                  key={playerId}
                  className="panel-row"
                  style={{ color: isMine ? 'var(--accent)' : undefined }}
                >
                  <span>
                    {isMine ? '★ ' : ''}
                    {seed.webName}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>{seed.teamShort}</span>
                  </span>
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
