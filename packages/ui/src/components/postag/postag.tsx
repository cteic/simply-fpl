'use client';

import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const Tag = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$8',
  color: '$colorSubtle',
  backgroundColor: '$background',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '$borderStrong',
  paddingHorizontal: 5,
  paddingVertical: 1,
  borderRadius: 3,
});

interface PostagProps {
  children: ReactNode;
}

export function Postag({ children }: PostagProps) {
  return <Tag>{children}</Tag>;
}
