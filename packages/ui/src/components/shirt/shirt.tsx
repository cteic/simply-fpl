'use client';

import { useState } from 'react';

import { YStack, styled } from 'tamagui';

const Box = styled(YStack, {
  width: 44,
  height: 44,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  variants: {
    kind: {
      gk: { backgroundColor: '$shirtGk' },
      def: { backgroundColor: '$shirtDef' },
      mid: { backgroundColor: '$shirtMid' },
      fwd: { backgroundColor: '$shirtFwd' },
      bch: { backgroundColor: '$shirtBch' },
    },
  } as const,
});

type ShirtKind = 'gk' | 'def' | 'mid' | 'fwd' | 'bch';

const FILL: Record<ShirtKind, string> = {
  gk: '#D97706',
  def: '#2563EB',
  mid: '#16A34A',
  fwd: '#DB2777',
  bch: '#9CA3AF',
};

interface ShirtProps {
  kind: ShirtKind;
  kitUrl?: string | undefined;
  kitUrl2x?: string | undefined;
  size?: number;
}

export function Shirt({ kind, kitUrl, kitUrl2x, size = 44 }: ShirtProps) {
  const [failed, setFailed] = useState(false);
  const fill = FILL[kind];
  const showImage = kitUrl !== undefined && !failed;
  const imgSize = Math.round(size * 0.82);
  const svgSize = Math.round(size * 0.61);

  return (
    <Box kind={kind} width={size} height={size}>
      {showImage ? (
        <img
          src={kitUrl}
          srcSet={kitUrl2x ? `${kitUrl} 1x, ${kitUrl2x} 2x` : undefined}
          width={imgSize}
          height={imgSize}
          alt=""
          onError={() => setFailed(true)}
          style={{ display: 'block', objectFit: 'contain' }}
        />
      ) : (
        <svg viewBox="0 0 28 28" fill="none" width={svgSize} height={svgSize}>
          <path d="M8 8h12l2 4v8H6v-8l2-4z" fill={fill} />
          <path d="M11 8v12M17 8v12" stroke="white" strokeWidth="1.3" />
        </svg>
      )}
    </Box>
  );
}

export type { ShirtKind };
