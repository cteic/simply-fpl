'use client';

import { Stack, styled } from 'tamagui';

const Box = styled(Stack, {
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
}

export function Shirt({ kind }: ShirtProps) {
  const fill = FILL[kind];
  return (
    <Box kind={kind}>
      <svg viewBox="0 0 28 28" fill="none" width={27} height={27}>
        <path d="M8 8h12l2 4v8H6v-8l2-4z" fill={fill} />
        <path d="M11 8v12M17 8v12" stroke="white" strokeWidth="1.3" />
      </svg>
    </Box>
  );
}

export type { ShirtKind };
