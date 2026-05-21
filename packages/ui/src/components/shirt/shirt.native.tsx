import { useState } from 'react';

import { Image } from 'react-native';

import Svg, { Path } from 'react-native-svg';
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
}

export function Shirt({ kind, kitUrl }: ShirtProps) {
  const [failed, setFailed] = useState(false);
  const fill = FILL[kind];
  const showImage = kitUrl !== undefined && !failed;

  return (
    <Box kind={kind}>
      {showImage && kitUrl !== undefined ? (
        <Image
          source={{ uri: kitUrl }}
          style={{ width: 36, height: 36 }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Svg viewBox="0 0 28 28" width={27} height={27}>
          <Path d="M8 8h12l2 4v8H6v-8l2-4z" fill={fill} />
          <Path d="M11 8v12M17 8v12" stroke="white" strokeWidth={1.3} />
        </Svg>
      )}
    </Box>
  );
}

export type { ShirtKind };
