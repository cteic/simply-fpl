import { useEffect, useRef, useState } from 'react';

import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';

import type { PlayerPos, PresenceUser } from './types';

const PRESENCE_COLORS = [
  '#34d399',
  '#60a5fa',
  '#f59e0b',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#facc15',
  '#22d3ee',
];

const ANIMAL_NAMES = ['Fox', 'Badger', 'Heron', 'Otter', 'Hawk', 'Lynx', 'Stoat', 'Marten'];

function pickName() {
  const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
  return `Anon${animal}`;
}

function pickColor() {
  return PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)] ?? '#34d399';
}

/**
 * Joins a Y.js room over WebRTC (peer-to-peer via the public Yjs signaling
 * servers). Returns the live positions Map, an updater, and the set of
 * connected peers from the awareness protocol.
 */
export function useYRoom(roomName: string) {
  const [positions, setPositions] = useState<Map<number, PlayerPos>>(new Map());
  const [votes, setVotes] = useState<Map<number, number>>(new Map());
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const [clientId, setClientId] = useState<number>(0);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const positionsMapRef = useRef<Y.Map<PlayerPos> | null>(null);
  const votesMapRef = useRef<Y.Map<number> | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new WebrtcProvider(roomName, doc);
    const yPositions = doc.getMap<PlayerPos>('positions');
    const yVotes = doc.getMap<number>('captain-votes');
    docRef.current = doc;
    providerRef.current = provider;
    positionsMapRef.current = yPositions;
    votesMapRef.current = yVotes;
    setClientId(provider.awareness.clientID);

    function snapshotPositions() {
      const next = new Map<number, PlayerPos>();
      yPositions.forEach((value, key) => {
        next.set(Number(key), value);
      });
      setPositions(next);
    }

    function snapshotVotes() {
      const next = new Map<number, number>();
      yVotes.forEach((playerId, voterId) => {
        next.set(Number(voterId), playerId);
      });
      setVotes(next);
    }

    function snapshotPeers() {
      const states = provider.awareness.getStates();
      const list: PresenceUser[] = [];
      states.forEach((state, peerId) => {
        const user = (state as { user?: PresenceUser }).user;
        if (user) list.push({ ...user, clientId: peerId });
      });
      setPeers(list);
    }

    provider.awareness.setLocalStateField('user', {
      clientId: provider.awareness.clientID,
      name: pickName(),
      color: pickColor(),
    });

    yPositions.observe(snapshotPositions);
    yVotes.observe(snapshotVotes);
    provider.awareness.on('change', snapshotPeers);

    snapshotPositions();
    snapshotVotes();
    snapshotPeers();

    return () => {
      yPositions.unobserve(snapshotPositions);
      yVotes.unobserve(snapshotVotes);
      provider.awareness.off('change', snapshotPeers);
      provider.destroy();
      doc.destroy();
    };
  }, [roomName]);

  function setPosition(playerId: number, pos: PlayerPos) {
    const map = positionsMapRef.current;
    if (!map) return;
    map.set(String(playerId), pos);
  }

  function castCaptainVote(playerId: number) {
    const map = votesMapRef.current;
    if (!map || !clientId) return;
    const key = String(clientId);
    if (map.get(key) === playerId) {
      // Tapping your already-voted player retracts the vote.
      map.delete(key);
    } else {
      map.set(key, playerId);
    }
  }

  return { positions, votes, peers, clientId, setPosition, castCaptainVote };
}
