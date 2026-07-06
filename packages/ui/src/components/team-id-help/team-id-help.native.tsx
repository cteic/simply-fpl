import { useState } from 'react';

import { Linking } from 'react-native';

import { Text, XStack, YStack } from 'tamagui';

type TeamIdHelpTone = 'default' | 'inverse';

export const TEAM_ID_HELP_LABEL = 'How do I find my team ID?';

export const TEAM_ID_HELP_STEPS = [
  'Open the FPL site and go to your Points page.',
  "Copy the URL from your browser's address bar.",
  'Your team ID is the number right after /entry/.',
] as const;

export const TEAM_ID_HELP_EXAMPLE = {
  prefix: 'fantasy.premierleague.com/entry/',
  id: '1234567',
  suffix: '/event/38',
} as const;

const FPL_HREF = 'https://fantasy.premierleague.com/';

interface TonePalette {
  trigger: string;
  accent: string;
  accentBg: string;
  panelBg: string;
  panelBorder: string;
  stepText: string;
  urlMuted: string;
  divider: string;
}

const TONES: Record<TeamIdHelpTone, TonePalette> = {
  default: {
    trigger: '$colorMuted',
    accent: '$brand',
    accentBg: '$brandBg',
    panelBg: '$brandBg',
    panelBorder: '$border',
    stepText: '$color',
    urlMuted: '$colorSubtle',
    divider: '$border',
  },
  inverse: {
    trigger: 'rgba(255,255,255,0.72)',
    accent: '#34D399',
    accentBg: 'rgba(52,211,153,0.14)',
    panelBg: 'rgba(255,255,255,0.06)',
    panelBorder: 'rgba(255,255,255,0.12)',
    stepText: 'rgba(255,255,255,0.82)',
    urlMuted: 'rgba(255,255,255,0.5)',
    divider: 'rgba(255,255,255,0.12)',
  },
};

interface TeamIdHelpProps {
  tone?: TeamIdHelpTone;
  defaultOpen?: boolean;
}

export function TeamIdHelp({ tone = 'default', defaultOpen = false }: TeamIdHelpProps = {}) {
  const [open, setOpen] = useState(defaultOpen);
  return <TeamIdHelpView tone={tone} open={open} onToggle={() => setOpen((prev) => !prev)} />;
}

interface TeamIdHelpViewProps {
  tone: TeamIdHelpTone;
  open: boolean;
  onToggle: () => void;
}

export function TeamIdHelpView({ tone, open, onToggle }: TeamIdHelpViewProps) {
  const palette = TONES[tone];

  return (
    <YStack width="100%" maxWidth={420} alignItems="center" gap={open ? 12 : 0}>
      <XStack
        onPress={onToggle}
        alignItems="center"
        gap={6}
        paddingVertical={4}
        pressStyle={{ opacity: 0.7 }}
      >
        <Text fontFamily="$body" fontSize={11} color={palette.accent}>
          {open ? '▾' : '▸'}
        </Text>
        <Text fontFamily="$body" fontSize={13} fontWeight="500" color={palette.trigger}>
          {TEAM_ID_HELP_LABEL}
        </Text>
      </XStack>

      {open ? (
        <YStack
          width="100%"
          backgroundColor={palette.panelBg}
          borderWidth={1}
          borderColor={palette.panelBorder}
          borderRadius={12}
          paddingHorizontal={16}
          paddingVertical={14}
          gap={12}
        >
          <YStack gap={10}>
            {TEAM_ID_HELP_STEPS.map((step, index) => (
              <XStack key={step} gap={10} alignItems="flex-start">
                <Text
                  fontFamily="$mono"
                  fontSize={11}
                  fontWeight="500"
                  color={palette.accent}
                  backgroundColor={palette.accentBg}
                  width={20}
                  height={20}
                  borderRadius={10}
                  textAlign="center"
                  lineHeight={20}
                >
                  {index + 1}
                </Text>
                <Text
                  flexShrink={1}
                  fontFamily="$body"
                  fontSize={13}
                  lineHeight={19}
                  color={palette.stepText}
                >
                  {step}
                </Text>
              </XStack>
            ))}
          </YStack>

          <YStack
            gap={4}
            paddingTop={12}
            borderTopWidth={1}
            borderColor={palette.divider}
            alignItems="flex-start"
          >
            <Text fontFamily="$mono" fontSize={12} lineHeight={18} color={palette.urlMuted}>
              {TEAM_ID_HELP_EXAMPLE.prefix}
              <Text fontFamily="$mono" fontSize={12} fontWeight="500" color={palette.accent}>
                {TEAM_ID_HELP_EXAMPLE.id}
              </Text>
              {TEAM_ID_HELP_EXAMPLE.suffix}
            </Text>
            <Text fontFamily="$body" fontSize={11} color={palette.urlMuted}>
              That number is your team ID.
            </Text>
          </YStack>

          <Text
            onPress={() => {
              Linking.openURL(FPL_HREF);
            }}
            fontFamily="$body"
            fontSize={12}
            fontWeight="600"
            color={palette.accent}
            alignSelf="flex-start"
            pressStyle={{ opacity: 0.7 }}
          >
            Open the FPL site →
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
