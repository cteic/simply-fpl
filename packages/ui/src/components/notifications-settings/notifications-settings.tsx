import { useState } from 'react';

import { t } from '@simplyfpl/i18n';
import type { LeagueAlertRule } from '@simplyfpl/types';

import { Text, XStack, YStack } from '../../tamagui-primitives';
import { Button } from '../button';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationPrefs {
  deadlineReminder: boolean;
  captainScored: boolean;
  bonusConfirmed: boolean;
  goalScored: boolean;
  assist: boolean;
  redCard: boolean;
  rankSwing: boolean;
  rankSwingThreshold: number;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

export interface NotificationsSettingsProps {
  isPro: boolean;
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  prefs: NotificationPrefs;
  leagueAlerts: LeagueAlertRule[];
  error?: string | null;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onTogglePref: (key: keyof NotificationPrefs, value: boolean | number | null) => void;
  onAddLeagueAlert: (rule: Omit<LeagueAlertRule, 'leagueName'>) => void;
  onRemoveLeagueAlert: (leagueId: number) => void;
}

export function NotificationsSettings({
  isPro,
  permission,
  isSubscribed,
  isLoading,
  prefs,
  leagueAlerts,
  error,
  onSubscribe,
  onUnsubscribe,
  onTogglePref,
  onAddLeagueAlert,
  onRemoveLeagueAlert,
}: NotificationsSettingsProps) {
  if (!isPro) {
    return (
      <Text fontFamily="$body" fontSize={13} color="$colorMuted">
        {t('notifications.pro_only')}
      </Text>
    );
  }

  if (permission === 'unsupported') {
    return (
      <Text fontFamily="$body" fontSize={13} color="$colorMuted">
        {t('notifications.not_supported')}
      </Text>
    );
  }

  if (permission === 'denied') {
    return (
      <Text fontFamily="$body" fontSize={13} color="$colorMuted">
        {t('notifications.blocked')}
      </Text>
    );
  }

  return (
    <YStack gap={12}>
      {!isSubscribed ? (
        <YStack gap={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('notifications.subscribe_body')}
          </Text>
          <XStack>
            <Button tone="primary" size="md" onPress={isLoading ? () => {} : onSubscribe}>
              {isLoading ? t('notifications.cta_enabling') : t('notifications.cta_enable')}
            </Button>
          </XStack>
        </YStack>
      ) : (
        <YStack gap={16}>
          <SectionLabel>Deadline & results</SectionLabel>
          <PrefToggle
            label={t('notifications.label_deadline_reminder')}
            description={t('notifications.label_deadline_desc')}
            enabled={prefs.deadlineReminder}
            onToggle={(v) => onTogglePref('deadlineReminder', v)}
          />
          <PrefToggle
            label="Bonus points confirmed"
            description="When provisional bonus becomes official"
            enabled={prefs.bonusConfirmed}
            onToggle={(v) => onTogglePref('bonusConfirmed', v)}
          />

          <SectionLabel>Captain & squad events</SectionLabel>
          <PrefToggle
            label={t('notifications.label_captain_scored')}
            description={t('notifications.label_captain_scored_desc')}
            enabled={prefs.captainScored}
            onToggle={(v) => onTogglePref('captainScored', v)}
          />
          <PrefToggle
            label="Goals scored"
            description="When a starting XI player scores a goal"
            enabled={prefs.goalScored}
            onToggle={(v) => onTogglePref('goalScored', v)}
          />
          <PrefToggle
            label="Assists"
            description="When a starting XI player gets an assist"
            enabled={prefs.assist}
            onToggle={(v) => onTogglePref('assist', v)}
          />
          <PrefToggle
            label="Red cards"
            description="When a starting XI player is sent off"
            enabled={prefs.redCard}
            onToggle={(v) => onTogglePref('redCard', v)}
          />

          <SectionLabel>League rank alerts</SectionLabel>
          <LeagueAlertList
            alerts={leagueAlerts}
            onRemove={onRemoveLeagueAlert}
            onAdd={onAddLeagueAlert}
          />

          <SectionLabel>Quiet hours (UTC)</SectionLabel>
          <QuietHoursControl
            start={prefs.quietHoursStart}
            end={prefs.quietHoursEnd}
            onUpdate={(start, end) => {
              onTogglePref('quietHoursStart', start);
              onTogglePref('quietHoursEnd', end);
            }}
          />

          <XStack marginTop={4}>
            <Button tone="ghost" size="md" onPress={isLoading ? () => {} : onUnsubscribe}>
              {isLoading ? t('notifications.cta_disabling') : t('notifications.cta_disable')}
            </Button>
          </XStack>
        </YStack>
      )}
      {error ? (
        <Text fontFamily="$body" fontSize={12} color="$colorError">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}

interface SectionLabelProps {
  children: string;
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text
      fontFamily="$body"
      fontSize={11}
      color="$colorSubtle"
      textTransform="uppercase"
      letterSpacing={0.8}
    >
      {children}
    </Text>
  );
}

interface PrefToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

function PrefToggle({ label, description, enabled, onToggle }: PrefToggleProps) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap={12}>
      <YStack flex={1} gap={2}>
        <Text fontFamily="$body" fontSize={13} color="$color">
          {label}
        </Text>
        <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
          {description}
        </Text>
      </YStack>
      <Button tone="ghost" size="sm" onPress={() => onToggle(!enabled)}>
        {enabled ? 'On' : 'Off'}
      </Button>
    </XStack>
  );
}

interface LeagueAlertListProps {
  alerts: LeagueAlertRule[];
  onRemove: (leagueId: number) => void;
  onAdd: (rule: Omit<LeagueAlertRule, 'leagueName'>) => void;
}

function LeagueAlertList({ alerts, onRemove, onAdd }: LeagueAlertListProps) {
  const [adding, setAdding] = useState(false);
  const [leagueIdInput, setLeagueIdInput] = useState('');
  const [topNInput, setTopNInput] = useState('');
  const [swingNInput, setSwingNInput] = useState('');

  function handleAdd() {
    const leagueId = parseInt(leagueIdInput, 10);
    const topN = topNInput ? parseInt(topNInput, 10) : null;
    const swingN = swingNInput ? parseInt(swingNInput, 10) : null;
    if (!leagueId || isNaN(leagueId)) return;
    if ((topN === null || isNaN(topN)) && (swingN === null || isNaN(swingN))) return;
    onAdd({
      leagueId,
      topN: topN && !isNaN(topN) ? topN : null,
      swingN: swingN && !isNaN(swingN) ? swingN : null,
    });
    setLeagueIdInput('');
    setTopNInput('');
    setSwingNInput('');
    setAdding(false);
  }

  return (
    <YStack gap={8}>
      {alerts.length === 0 && !adding ? (
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          No league alerts configured.
        </Text>
      ) : null}
      {alerts.map((alert) => (
        <XStack key={alert.leagueId} justifyContent="space-between" alignItems="center" gap={8}>
          <YStack flex={1} gap={1}>
            <Text fontFamily="$mono" fontSize={12} color="$color">
              League {alert.leagueId}
              {alert.leagueName ? ` — ${alert.leagueName}` : ''}
            </Text>
            <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
              {[
                alert.topN !== null ? `Top ${alert.topN}` : null,
                alert.swingN !== null ? `±${alert.swingN} places` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </YStack>
          <Button tone="ghost" size="sm" onPress={() => onRemove(alert.leagueId)}>
            Remove
          </Button>
        </XStack>
      ))}
      {adding ? (
        <YStack gap={6} borderWidth={1} borderColor="$borderColor" borderRadius={6} padding={10}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            League ID
          </Text>
          <LeagueInput
            value={leagueIdInput}
            placeholder="e.g. 314159"
            onChange={setLeagueIdInput}
          />
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle" marginTop={4}>
            Alert when entering / leaving top N (leave blank to skip)
          </Text>
          <LeagueInput value={topNInput} placeholder="e.g. 3" onChange={setTopNInput} />
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle" marginTop={4}>
            Alert on rank swing of ±N places (leave blank to skip)
          </Text>
          <LeagueInput value={swingNInput} placeholder="e.g. 5" onChange={setSwingNInput} />
          <XStack gap={8} marginTop={4}>
            <Button tone="primary" size="sm" onPress={handleAdd}>
              Save
            </Button>
            <Button tone="ghost" size="sm" onPress={() => setAdding(false)}>
              Cancel
            </Button>
          </XStack>
        </YStack>
      ) : (
        <XStack>
          <Button tone="ghost" size="sm" onPress={() => setAdding(true)}>
            + Add league alert
          </Button>
        </XStack>
      )}
    </YStack>
  );
}

interface LeagueInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function LeagueInput({ value, placeholder, onChange: _onChange }: LeagueInputProps) {
  return (
    <XStack
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={4}
      paddingHorizontal={8}
      paddingVertical={6}
    >
      <Text
        fontFamily="$mono"
        fontSize={13}
        color="$color"
        flex={1}
        onPress={() => {}}
        suppressHighlighting
      >
        {value || <Text color="$colorSubtle">{placeholder}</Text>}
      </Text>
    </XStack>
  );
}

interface QuietHoursControlProps {
  start: number | null;
  end: number | null;
  onUpdate: (start: number | null, end: number | null) => void;
}

function QuietHoursControl({ start, end, onUpdate }: QuietHoursControlProps) {
  const enabled = start !== null && end !== null;

  return (
    <YStack gap={8}>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap={2}>
          <Text fontFamily="$body" fontSize={13} color="$color">
            Mute notifications overnight
          </Text>
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
            {enabled
              ? `${String(start).padStart(2, '0')}:00 – ${String(end).padStart(2, '0')}:00 UTC`
              : 'Disabled'}
          </Text>
        </YStack>
        <Button
          tone="ghost"
          size="sm"
          onPress={() => onUpdate(enabled ? null : 22, enabled ? null : 8)}
        >
          {enabled ? 'Disable' : 'Enable'}
        </Button>
      </XStack>
    </YStack>
  );
}
