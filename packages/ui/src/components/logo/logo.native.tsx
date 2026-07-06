import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { Text, XStack, styled } from 'tamagui';

type LogoVariant = 'wordmark' | 'mark' | 'lockup';
type LogoSize = 'sm' | 'md' | 'lg';
type LogoTone = 'default' | 'inverse' | 'stadium';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  tone?: LogoTone;
  href?: string;
}

const WORDMARK_SIZE: Record<LogoSize, number> = {
  sm: 13,
  md: 16,
  lg: 21,
};

const MARK_SIZE: Record<LogoSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const LOCKUP_MARK_SIZE: Record<LogoSize, number> = {
  sm: 22,
  md: 26,
  lg: 42,
};

const Wrap = styled(XStack, {
  alignItems: 'center',
  gap: 0,
});

const Glyph = styled(Text, {
  fontFamily: '$mono',
  fontWeight: '500',
  letterSpacing: -0.5,
});

const WordGlyph = styled(Text, {
  fontFamily: '$body',
  fontWeight: '700',
  letterSpacing: -0.3,
});

function wordmarkColors(tone: LogoTone): { word: string; tld: string } {
  if (tone === 'inverse' || tone === 'stadium') {
    return { word: '#FFFFFF', tld: '#34D399' };
  }
  return { word: '#0F766E', tld: '#0F766E' };
}

interface LockupMarkProps {
  size: number;
  inverse: boolean;
}

function LockupMark({ size, inverse }: LockupMarkProps) {
  const ballStroke = inverse ? '#0F766E' : '#0F766E';
  const ballFill = '#FFFFFF';
  const accent = inverse ? '#5EEAD4' : '#0F766E';
  const accentDeep = inverse ? '#2DD4BF' : '#0F766E';
  const accentMid = inverse ? '#5EEAD4' : '#0F766E';
  const accentLight = inverse ? '#99F6E4' : '#0F766E';
  const baselineStroke = inverse ? '#FFFFFF' : '#0F766E';
  const baselineOpacity = inverse ? 0.3 : 0.25;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Line
        x1={40}
        y1={50}
        x2={63}
        y2={50}
        stroke={baselineStroke}
        strokeOpacity={baselineOpacity}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Rect x={42} y={38} width={6} height={12} rx={1.5} fill={accentDeep} />
      <Rect x={50} y={30} width={6} height={20} rx={1.5} fill={accentMid} />
      <Rect x={58} y={22} width={6} height={28} rx={1.5} fill={accentLight} />
      <Path d="M16 18 L16 10 L20.5 15 L25 7 L29.5 15 L34 10 L34 18 Z" fill={accent} />
      <Rect x={14.5} y={17} width={21} height={4} rx={1.5} fill={accent} />
      <Defs>
        <ClipPath id="ballNativeClip">
          <Circle cx={25} cy={36} r={13.4} />
        </ClipPath>
      </Defs>
      <Circle cx={25} cy={36} r={14} fill={ballFill} stroke={ballStroke} strokeWidth={1.6} />
      <G clipPath="url(#ballNativeClip)" fill={ballStroke}>
        <Polygon
          points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33"
          transform="translate(25 36)"
        />
        <Polygon
          points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33"
          transform="translate(30.585 28.315) rotate(36)"
        />
        <Polygon
          points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33"
          transform="translate(34.035 38.936) rotate(108)"
        />
        <Polygon
          points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33"
          transform="translate(25 45.5) rotate(180)"
        />
        <Polygon
          points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33"
          transform="translate(15.965 38.936) rotate(252)"
        />
        <Polygon
          points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33"
          transform="translate(19.415 28.315) rotate(324)"
        />
      </G>
    </Svg>
  );
}

export function Logo({ variant = 'wordmark', size = 'md', tone = 'default' }: LogoProps) {
  const { word: wordColor, tld: tldColor } = wordmarkColors(tone);
  const inverse = tone === 'inverse' || tone === 'stadium';
  const monoColor = inverse ? '#FFFFFF' : '$color';

  if (variant === 'lockup') {
    const px = WORDMARK_SIZE[size];
    const markPx = LOCKUP_MARK_SIZE[size];
    return (
      <Wrap gap={9}>
        <LockupMark size={markPx} inverse={inverse} />
        <XStack alignItems="center" gap={0}>
          <WordGlyph fontSize={px} lineHeight={px} color={wordColor}>
            simplyfpl
          </WordGlyph>
          <WordGlyph fontSize={px} lineHeight={px} color={tldColor}>
            .com
          </WordGlyph>
        </XStack>
      </Wrap>
    );
  }

  if (variant === 'mark') {
    const px = MARK_SIZE[size];
    return (
      <Wrap>
        <Glyph fontSize={px} lineHeight={px} color={monoColor}>
          s
        </Glyph>
        <Glyph fontSize={px} lineHeight={px} color={tldColor}>
          .
        </Glyph>
      </Wrap>
    );
  }

  const px = WORDMARK_SIZE[size];
  return (
    <Wrap>
      <WordGlyph fontSize={px} lineHeight={px} color={wordColor}>
        simplyfpl
      </WordGlyph>
      <WordGlyph fontSize={px} lineHeight={px} color={tldColor}>
        .com
      </WordGlyph>
    </Wrap>
  );
}
