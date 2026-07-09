import { auth } from '@simplyfpl/features';
import { Card, FNote, SectionHeader, Skeleton, Text, XStack, YStack } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { useFrankWeekly } from '@/queries/frank';

const { useAuth } = auth;

interface CandidateRowProps {
  name: string;
  team: string;
  reason: string;
  last: boolean;
}

function CandidateRow({ name, team, reason, last }: CandidateRowProps) {
  return (
    <YStack
      paddingHorizontal={16}
      paddingVertical={14}
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$border"
      borderStyle="solid"
    >
      <XStack alignItems="center" gap={8} marginBottom={4}>
        <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color">
          {name}
        </Text>
        <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
          {team}
        </Text>
      </XStack>
      <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
        {reason}
      </Text>
    </YStack>
  );
}

function AiChip() {
  return (
    <XStack
      backgroundColor="$brandBg"
      borderWidth={1}
      borderStyle="solid"
      borderColor="$brand"
      borderRadius={4}
      paddingHorizontal={6}
      paddingVertical={2}
      alignItems="center"
    >
      <Text fontFamily="$body" fontSize={9} fontWeight="700" color="$brand" letterSpacing={0.8}>
        AI-POWERED
      </Text>
    </XStack>
  );
}

function ProGate() {
  return (
    <Card paddingHorizontal={20} paddingVertical={24} gap={10} alignItems="center">
      <AiChip />
      <Text
        fontFamily="$body"
        fontSize={15}
        fontWeight="600"
        color="$color"
        textAlign="center"
        marginTop={4}
      >
        Frank — AI Coach
      </Text>
      <Text fontFamily="$body" fontSize={13} color="$colorMuted" textAlign="center" lineHeight={20}>
        Weekly captain picks, transfer targets, and chip advice powered by AI. Available on Pro and
        above.
      </Text>
      <Text fontFamily="$body" fontSize={13} color="$brand" marginTop={4}>
        Subscribe at simplyfpl.com
      </Text>
    </Card>
  );
}

function WeeklyContent() {
  const { data, isLoading, isError } = useFrankWeekly();

  if (isLoading) {
    return (
      <Card paddingHorizontal={16} paddingVertical={28} alignItems="center">
        <YStack gap={8} width="100%">
          <Skeleton height={12} width="80%" />
          <Skeleton height={12} width="60%" />
          <Skeleton height={12} width="70%" />
        </YStack>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card paddingHorizontal={16} paddingVertical={28} alignItems="center">
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Frank's advice isn't ready yet. Check back after the next deadline.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {data.chipNote ? (
        <>
          <SectionHeader title="Chip Watch" />
          <Card>
            <YStack paddingHorizontal={16} paddingVertical={14}>
              <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={18}>
                {data.chipNote}
              </Text>
            </YStack>
          </Card>
        </>
      ) : null}

      <SectionHeader title={`Captain picks · GW${data.gameweek}`} />
      <Card>
        {data.captainCandidates.map((c, i) => (
          <CandidateRow
            key={`cap-${c.name}`}
            name={c.name}
            team={c.team}
            reason={c.reason}
            last={i === data.captainCandidates.length - 1}
          />
        ))}
      </Card>

      <SectionHeader title="Transfer targets" />
      <Card>
        {data.transferTargets.map((c, i) => (
          <CandidateRow
            key={`xfer-${c.name}`}
            name={c.name}
            team={c.team}
            reason={c.reason}
            last={i === data.transferTargets.length - 1}
          />
        ))}
      </Card>
    </>
  );
}

export function FrankView() {
  const { isPro } = useAuth();

  return (
    <Screen topInset>
      <XStack alignItems="center" gap={10} marginBottom={4}>
        <Text fontFamily="$body" fontSize={21} fontWeight="600" color="$color">
          Frank
        </Text>
        <AiChip />
      </XStack>

      {isPro ? <WeeklyContent /> : <ProGate />}

      <FNote>
        Frank is an AI coach. Advice is generated weekly and may not reflect late-breaking news.
        Always verify player availability before finalising your team.
      </FNote>
    </Screen>
  );
}
