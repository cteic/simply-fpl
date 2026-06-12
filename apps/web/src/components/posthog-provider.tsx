'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

import { auth } from '@simplyfpl/features';
import { AnalyticsConsentBanner } from '@simplyfpl/ui';

import { ANALYTICS_EVENT, sanitizePath } from '@/lib/analytics';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const CONSENT_COOKIE_NAME = 'ph_consent';
const CONSENT_MAX_AGE = 365 * 24 * 60 * 60;

type ConsentState = 'accepted' | 'declined' | null;

function readConsentCookie(): ConsentState {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)ph_consent=([^;]*)/);
  if (!match) return null;
  const v = match[1];
  return v === 'accepted' || v === 'declined' ? v : null;
}

function writeConsentCookie(value: 'accepted' | 'declined') {
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`;
}

async function resolveAnalyticsId(): Promise<string | null> {
  try {
    const res = await fetch('/api/analytics/identity', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { id: string | null };
    return body.id;
  } catch {
    return null;
  }
}

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();
  const identifyRef = useRef(false);
  const proRecordingRef = useRef(false);
  const { user, isPro } = auth.useAuth();

  useEffect(() => {
    const saved = readConsentCookie();
    if (saved !== null) setConsent(saved);
  }, []);

  // PostHog is dormant (no cookies, no network) until consent is accepted.
  // posthog-js is bundled but the SDK does nothing before .init() is called.
  useEffect(() => {
    if (consent !== 'accepted' || !POSTHOG_KEY || initialized) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'identified_only',
      // Manual capture only — prevents URL-embedded IDs reaching PostHog via autocapture.
      autocapture: false,
      session_recording: {
        maskAllInputs: true,
        blockSelector: '[data-private]',
        maskTextFn: (text: string) => {
          // Strip email-shaped strings
          let masked = text.replace(
            /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
            '***@***.***'
          );
          // Strip 4+ digit numbers (covers FPL entry IDs, league IDs, etc.)
          masked = masked.replace(/\b\d{4,}\b/g, '****');
          return masked;
        },
        // 10% of free-tier sessions are sampled. Pro sessions that touch a Pro
        // feature are force-started below (100%) so subscriber pain is always
        // visible without recording the full free cohort.
        sampleRate: 0.1,
      },
    });

    setInitialized(true);
  }, [consent, initialized]);

  // Identify authenticated users with a server-issued, salted SHA-256 hash.
  // No email, name, or raw Supabase user ID is ever sent to PostHog.
  useEffect(() => {
    if (!initialized) return;
    if (user && !identifyRef.current) {
      identifyRef.current = true;
      resolveAnalyticsId().then((id) => {
        if (id) posthog.identify(id);
      });
    }
    if (!user && identifyRef.current) {
      identifyRef.current = false;
      posthog.reset();
    }
  }, [initialized, user]);

  // Force 100% session recording for Pro users touching a Pro feature.
  useEffect(() => {
    if (!initialized || !isPro || proRecordingRef.current) return;
    proRecordingRef.current = true;
    posthog.startSessionRecording();
  }, [initialized, isPro]);

  // Capture page views with numeric segments stripped from the path.
  useEffect(() => {
    if (!initialized) return;
    posthog.capture(ANALYTICS_EVENT.PAGE_VIEWED, { path: sanitizePath(pathname) });
  }, [initialized, pathname]);

  function handleAccept() {
    writeConsentCookie('accepted');
    setConsent('accepted');
  }

  function handleDecline() {
    writeConsentCookie('declined');
    setConsent('declined');
  }

  const content = (
    <>
      {consent === null && (
        <AnalyticsConsentBanner onAccept={handleAccept} onDecline={handleDecline} />
      )}
      {children}
    </>
  );

  if (!initialized) return content;

  return <PHProvider client={posthog}>{content}</PHProvider>;
}
