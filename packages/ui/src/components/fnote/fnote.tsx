'use client';

import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const Note = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorSubtle',
  textAlign: 'center',
  marginTop: 48,
  lineHeight: 18,
});

interface FNoteProps {
  children: ReactNode;
}

export function FNote({ children }: FNoteProps) {
  return <Note>{children}</Note>;
}
