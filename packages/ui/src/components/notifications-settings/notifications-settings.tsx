import { Text, XStack, YStack } from '../../tamagui-primitives';
import { Button } from '../button';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationPrefs {
  deadlineReminder: boolean;
  captainScored: boolean;
}

export interface NotificationsSettingsProps {
  isPro: boolean;
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  prefs: NotificationPrefs;
  error?: string | null;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onTogglePref: (key: keyof NotificationPrefs, value: boolean) => void;
}

export function NotificationsSettings({
  isPro,
  permission,
  isSubscribed,
  isLoading,
  prefs,
  error,
  onSubscribe,
  onUnsubscribe,
  onTogglePref,
}: NotificationsSettingsProps) {
  if (!isPro) {
    return (
      <Text fontFamily="$body" fontSize={13} color="$colorMuted">
        Push notifications are a Pro feature. Upgrade to get notified when your captain scores and
        before the transfer deadline.
      </Text>
    );
  }

  if (permission === 'unsupported') {
    return (
      <Text fontFamily="$body" fontSize={13} color="$colorMuted">
        Push notifications are not supported in this browser.
      </Text>
    );
  }

  if (permission === 'denied') {
    return (
      <Text fontFamily="$body" fontSize={13} color="$colorMuted">
        Notifications are blocked. Re-enable them in your browser settings, then reload.
      </Text>
    );
  }

  return (
    <YStack gap={12}>
      {!isSubscribed ? (
        <YStack gap={8}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Get notified when your captain scores and 30 minutes before the transfer deadline.
          </Text>
          <XStack>
            <Button tone="primary" size="md" onPress={isLoading ? () => {} : onSubscribe}>
              {isLoading ? 'Enabling…' : 'Enable notifications'}
            </Button>
          </XStack>
        </YStack>
      ) : (
        <YStack gap={12}>
          <PrefToggle
            label="GW deadline reminder"
            description="30 minutes before transfers lock"
            enabled={prefs.deadlineReminder}
            onToggle={(v) => onTogglePref('deadlineReminder', v)}
          />
          <PrefToggle
            label="Captain scored"
            description="When your captain starts scoring points"
            enabled={prefs.captainScored}
            onToggle={(v) => onTogglePref('captainScored', v)}
          />
          <XStack>
            <Button tone="ghost" size="md" onPress={isLoading ? () => {} : onUnsubscribe}>
              {isLoading ? 'Disabling…' : 'Disable notifications'}
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
