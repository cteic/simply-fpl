import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fplClient, formatPrice, predictPriceChanges } from '@simplyfpl/fpl-client';

const COLORS = {
  bg: '#0f1117',
  surface: '#1e2330',
  accent: '#00d4a0',
  text: '#f9fafb',
  muted: '#6b7280',
  rise: '#00d4a0',
  fall: '#ef4444',
};

type Filter = 'all' | 'rise' | 'fall';

export default function PricesScreen() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data: bootstrap, isLoading } = useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => fplClient.getBootstrapStatic(),
    staleTime: 60 * 60 * 1000,
  });

  const changes = bootstrap ? predictPriceChanges(bootstrap) : [];
  const filtered = filter === 'all' ? changes : changes.filter(c => c.direction === filter);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {(['all', 'rise', 'fall'] as Filter[]).map(f => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'rise' ? '↑ Risers' : '↓ Fallers'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />}

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.player.id)}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.playerName}>{item.player.web_name}</Text>
              <Text style={styles.teamName}>{item.team.short_name}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.price}>{formatPrice(item.player.now_cost)}</Text>
              <Text
                style={[
                  styles.direction,
                  item.direction === 'rise' ? styles.rise : styles.fall,
                ]}
              >
                {item.direction === 'rise' ? '↑' : '↓'}{' '}
                {Math.round(item.probability * 100)}%
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>No price changes predicted right now.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2330',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e2330',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#1a3a30' },
  filterText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: COLORS.accent },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f2e',
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  playerName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  teamName: { color: COLORS.muted, fontSize: 12 },
  price: { color: COLORS.text, fontSize: 14 },
  direction: { fontSize: 13, fontWeight: '700' },
  rise: { color: COLORS.rise },
  fall: { color: COLORS.fall },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 60, fontSize: 15 },
});
