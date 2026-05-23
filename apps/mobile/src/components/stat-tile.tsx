import { Text, YStack } from '@simplyfpl/ui';

interface StatTileProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
}

export function StatTile({ label, value, sub, accent }: StatTileProps) {
  return (
    <YStack
      flexGrow={1}
      flexBasis="45%"
      minWidth={140}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$border"
      borderLeftWidth={3}
      borderLeftColor={accent}
      borderRadius={10}
      paddingHorizontal={16}
      paddingVertical={14}
    >
      <Text
        fontFamily="$body"
        fontSize={10}
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={0.7}
        color="$colorSubtle"
        marginBottom={8}
      >
        {label}
      </Text>
      <Text fontFamily="$mono" fontSize={26} lineHeight={28} fontWeight="400" color="$color">
        {value}
      </Text>
      <Text fontFamily="$body" fontSize={11} color="$colorMuted" marginTop={6}>
        {sub}
      </Text>
    </YStack>
  );
}
