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
import { fplClient } from '@simplyfpl/fpl-client';

const COLORS = {
  bg: '#0f1117',
  surface: '#1e2330',
  accent: '#00d4a0',
  text: '#f9fafb',
  muted: '#6b7280',
  up: '#00d4a0',
  down: '#ef4444',
  neutral: '#6b7280',
};

export default function LeaguesScreen() {
  const [leagueId, setLeagueId] = useState('');
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  const { data: league, isLoading } = useQuery({
    queryKey: ['classic-league', submittedId],
    queryFn: () => {
      if (submittedId === null) throw new Error('submittedId required');
      return fplClient.getClassicLeague(submittedId);
    },
    enabled: submittedId !== null,
    refetchInterval: 90_000,
  });

  function handleSubmit() {
    const id = parseInt(leagueId, 10);
    if (!isNaN(id) && id > 0) setSubmittedId(id);
  }

  const standings = league?.standings.results ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="League ID"
          placeholderTextColor={COLORS.muted}
          value={leagueId}
          onChangeText={setLeagueId}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
        />
        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Go</Text>
        </Pressable>
      </View>

      {league && (
        <Text style={styles.leagueName}>{league.league.name}</Text>
      )}

      {isLoading && <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />}

      <FlatList
        data={standings}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          standings.length > 0 ? (
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { flex: 0.4 }]}>Rank</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Manager</Text>
              <Text style={[styles.headerCell, { textAlign: 'right' }]}>GW</Text>
              <Text style={[styles.headerCell, { textAlign: 'right' }]}>Total</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const movement = item.last_rank - item.rank;
          let movementColor = COLORS.neutral;
          if (movement > 0) movementColor = COLORS.up;
          else if (movement < 0) movementColor = COLORS.down;
          let movementText = '—';
          if (movement > 0) movementText = `↑${movement}`;
          else if (movement < 0) movementText = `↓${Math.abs(movement)}`;

          return (
            <View style={styles.row}>
              <View style={[styles.rankCell, { flex: 0.4 }]}>
                <Text style={styles.rank}>{item.rank}</Text>
                <Text style={[styles.movement, { color: movementColor }]}>{movementText}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName} numberOfLines={1}>{item.entry_name}</Text>
                <Text style={styles.playerName} numberOfLines={1}>{item.player_name}</Text>
              </View>
              <Text style={styles.gwTotal}>{item.event_total}</Text>
              <Text style={styles.total}>{item.total}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading && submittedId ? (
            <Text style={styles.empty}>No results found. Check the league ID.</Text>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 12 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
  leagueName: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2330',
  },
  headerCell: { color: COLORS.muted, fontSize: 11, fontWeight: '600', flex: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f2e',
    gap: 4,
  },
  rankCell: { alignItems: 'center', gap: 2 },
  rank: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  movement: { fontSize: 10, fontWeight: '600' },
  entryName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  playerName: { color: COLORS.muted, fontSize: 11 },
  gwTotal: { color: COLORS.accent, fontSize: 13, fontWeight: '600', width: 36, textAlign: 'right' },
  total: { color: COLORS.text, fontSize: 13, fontWeight: '700', width: 44, textAlign: 'right' },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 60 },
});
