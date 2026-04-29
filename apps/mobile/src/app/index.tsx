import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { calculateLivePoints, fplClient, getCurrentGameweek } from '@simplyfpl/fpl-client';

const COLORS = {
  bg: '#0f1117',
  surface: '#1e2330',
  accent: '#00d4a0',
  text: '#f9fafb',
  muted: '#6b7280',
  danger: '#ef4444',
};

export default function LiveRankScreen() {
  const [teamId, setTeamId] = useState('');
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  const { data: bootstrap } = useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => fplClient.getBootstrapStatic(),
    staleTime: 60 * 60 * 1000,
  });

  const currentGw = bootstrap ? getCurrentGameweek(bootstrap) : null;

  const { data: entry, isLoading: entryLoading } = useQuery({
    queryKey: ['entry', submittedId],
    queryFn: () => fplClient.getEntry(submittedId!),
    enabled: submittedId !== null,
  });

  const { data: picks, isLoading: picksLoading } = useQuery({
    queryKey: ['entry-picks', submittedId, currentGw],
    queryFn: () => fplClient.getEntryPicks(submittedId!, currentGw!),
    enabled: submittedId !== null && currentGw !== null,
    refetchInterval: 60_000,
  });

  const { data: liveGw, isLoading: liveLoading } = useQuery({
    queryKey: ['live-gw', currentGw],
    queryFn: () => fplClient.getLiveGameweek(currentGw!),
    enabled: currentGw !== null,
    refetchInterval: 60_000,
  });

  function handleSubmit() {
    const id = parseInt(teamId, 10);
    if (!isNaN(id) && id > 0) {
      setSubmittedId(id);
    }
  }

  const isLoading = entryLoading || picksLoading || liveLoading;

  const livePoints =
    picks && liveGw && bootstrap
      ? calculateLivePoints(picks, liveGw, bootstrap)
      : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="FPL team ID"
          placeholderTextColor={COLORS.muted}
          value={teamId}
          onChangeText={setTeamId}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
        />
        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Go</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator color={COLORS.accent} style={styles.loader} />}

      {entry && livePoints !== null && (
        <View style={styles.card}>
          <Text style={styles.teamName}>{entry.name}</Text>
          <Text style={styles.playerName}>
            {entry.player_first_name} {entry.player_last_name}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{livePoints}</Text>
              <Text style={styles.statLabel}>Live pts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {entry.summary_overall_rank?.toLocaleString() ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Overall rank</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{entry.summary_overall_points}</Text>
              <Text style={styles.statLabel}>Total pts</Text>
            </View>
          </View>

          {picks && bootstrap && liveGw && (
            <FlatList
              data={picks.picks.slice(0, 11)}
              keyExtractor={item => String(item.element)}
              style={styles.picksList}
              renderItem={({ item: pick }) => {
                const player = bootstrap.elements.find(e => e.id === pick.element);
                const live = liveGw.elements.find(e => e.id === pick.element);
                const pts = (live?.stats.total_points ?? 0) * pick.multiplier;
                return (
                  <View style={styles.pickRow}>
                    <Text style={styles.pickName}>
                      {player?.web_name ?? pick.element}
                      {pick.is_captain ? ' (C)' : ''}
                      {pick.is_vice_captain ? ' (V)' : ''}
                    </Text>
                    <Text style={[styles.pickPoints, pts > 6 && styles.pickPointsGood]}>
                      {pts}
                    </Text>
                  </View>
                );
              }}
            />
          )}

          {picks?.active_chip && (
            <View style={styles.chipBadge}>
              <Text style={styles.chipText}>{picks.active_chip.toUpperCase()}</Text>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  buttonText: { color: '#000', fontWeight: '700', fontSize: 15 },
  loader: { marginTop: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  teamName: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  playerName: { color: COLORS.muted, fontSize: 14, marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: COLORS.accent, fontSize: 22, fontWeight: '700' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  picksList: { marginTop: 8 },
  pickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3040',
  },
  pickName: { color: COLORS.text, fontSize: 14 },
  pickPoints: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  pickPointsGood: { color: COLORS.accent },
  chipBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#1a3a30',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
});
