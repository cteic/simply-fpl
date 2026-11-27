import type { ColorValue } from 'react-native';

import Svg, { Circle, Path } from 'react-native-svg';

export type TabIconName =
  | 'home'
  | 'leagues'
  | 'h2h'
  | 'planner'
  | 'prices'
  | 'threats'
  | 'frank'
  | 'profile';

interface TabIconProps {
  name: TabIconName;
  color: ColorValue;
  size?: number;
}

// Stroke paths on a 24-unit grid. Hand-drawn rather than pulled from an icon
// font so the tab bar adds no dependency and no font to load before first
// paint.
const PATHS: Record<TabIconName, string[]> = {
  // a rising line: the live-rank chart
  home: ['M3 17l5-5 4 3 8-9', 'M15 6h5v5'],
  // a podium
  leagues: ['M9 20V9h6v11', 'M3 20v-7h6', 'M15 20v-5h6v5', 'M2 20h20'],
  // two arrows facing each other
  h2h: ['M3 8h13', 'M12 4l4 4-4 4', 'M21 16H8', 'M12 12l-4 4 4 4'],
  // a calendar
  planner: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  // a price tag
  prices: ['M3 12V4h8l10 10-8 8z'],
  // a warning triangle
  threats: ['M12 4l9 16H3z', 'M12 10v4'],
  // a speech bubble
  frank: ['M4 5h16v11H10l-5 4v-4H4z'],
  // a person
  profile: ['M5 20c0-4 3-6 7-6s7 2 7 6'],
};

const DOTS: Partial<Record<TabIconName, { cx: number; cy: number; r: number }>> = {
  prices: { cx: 8, cy: 9, r: 1.2 },
  threats: { cx: 12, cy: 17, r: 0.6 },
  profile: { cx: 12, cy: 8, r: 3.5 },
};

export function TabIcon({ name, color, size = 22 }: TabIconProps) {
  const dot = DOTS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {dot ? <Circle cx={dot.cx} cy={dot.cy} r={dot.r} stroke={color} strokeWidth={1.8} /> : null}
    </Svg>
  );
}
