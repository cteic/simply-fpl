'use client';

import { BenchDivider, Pitch, PitchRow, Player } from '@simplyfpl/ui';
import type { BadgeTone, ShirtKind } from '@simplyfpl/ui';

export interface LivePitchPlayer {
  key: number;
  name: string;
  detail: string;
  position: ShirtKind;
  badge: string;
  badgeTone: BadgeTone;
  kitUrl: string | undefined;
  kitUrl2x: string | undefined;
  ownershipPercent: number | undefined;
  accentColor: string | undefined;
}

interface LivePitchProps {
  teamName: string;
  formation: string;
  label: string;
  rows: LivePitchPlayer[][];
  bench: LivePitchPlayer[];
}

export function LivePitch({ teamName, formation, label, rows, bench }: LivePitchProps) {
  return (
    <Pitch teamName={teamName} formation={formation} label={label}>
      {rows.map((row, i) => (
        <PitchRow key={`row-${i}`}>
          {row.map((p) => (
            <Player
              key={p.key}
              name={p.name}
              detail={p.detail}
              position={p.position}
              badge={p.badge}
              badgeTone={p.badgeTone}
              kitUrl={p.kitUrl}
              kitUrl2x={p.kitUrl2x}
              ownershipPercent={p.ownershipPercent}
              accentColor={p.accentColor}
            />
          ))}
        </PitchRow>
      ))}
      {bench.length > 0 ? (
        <>
          <BenchDivider />
          <PitchRow>
            {bench.map((p) => (
              <Player
                key={p.key}
                name={p.name}
                detail={p.detail}
                position={p.position}
                badge={p.badge}
                badgeTone={p.badgeTone}
                kitUrl={p.kitUrl}
                kitUrl2x={p.kitUrl2x}
                ownershipPercent={p.ownershipPercent}
                accentColor={p.accentColor}
                bench
              />
            ))}
          </PitchRow>
        </>
      ) : null}
    </Pitch>
  );
}
