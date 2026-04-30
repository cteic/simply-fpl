import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Placeholder — auth integration added in next iteration
const COLORS = {
  bg: '#0f1117',
  surface: '#1e2330',
  accent: '#00d4a0',
  text: '#f9fafb',
  muted: '#6b7280',
};

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Account</Text>
        <Text style={styles.muted}>Sign in to save your team ID and access Pro features.</Text>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SimplyFPL Pro</Text>
        <View style={styles.featureList}>
          {[
            'Push notifications for price changes',
            'Transfer planner',
            'Effective ownership tracker',
            'Ad-free experience',
          ].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureTick}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.price}>€4 / month · €25 / year</Text>
        <Text style={styles.muted}>Subscribe via simplyfpl.com</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.muted}>SimplyFPL v0.1.0</Text>
        <Text style={styles.muted}>Data refreshes every 60 seconds during live gameweeks.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontWeight: '700', fontSize: 15 },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', gap: 8 },
  featureTick: { color: COLORS.accent, fontWeight: '700' },
  featureText: { color: COLORS.text, fontSize: 14, flex: 1 },
  price: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
});
