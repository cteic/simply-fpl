'use client';

import { Input as TamaguiInput, styled } from 'tamagui';

export const Input = styled(TamaguiInput, {
  unstyled: true,
  fontFamily: '$body',
  fontSize: 13,
  color: '$color',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '$border',
  borderRadius: '$3',
  paddingHorizontal: 12,
  paddingVertical: 8,
  minHeight: 34,
  outlineWidth: 0,
  outlineStyle: 'none',
  placeholderTextColor: '$colorSubtle',
  hoverStyle: { borderColor: '$borderStrong' },
  focusStyle: { borderColor: '$color', outlineWidth: 0 },
});
