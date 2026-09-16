'use client';

import { Text, XStack, YStack } from 'tamagui';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDocumentProps {
  sections: LegalSection[];
}

export function LegalDocument({ sections }: LegalDocumentProps) {
  return (
    <YStack gap={28}>
      {sections.map((section) => (
        <YStack key={section.heading} gap={10} render="section">
          <Text render="h2" fontFamily="$body" fontSize="$11" fontWeight="600" color="$color">
            {section.heading}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text
              key={paragraph}
              render="p"
              fontFamily="$body"
              fontSize={13}
              lineHeight={21}
              color="$color"
            >
              {paragraph}
            </Text>
          ))}
          {section.bullets ? (
            <YStack gap={6} paddingLeft={4}>
              {section.bullets.map((bullet) => (
                <XStack key={bullet} gap={8} alignItems="flex-start">
                  <Text fontFamily="$body" fontSize={13} lineHeight={21} color="$colorSubtle">
                    •
                  </Text>
                  <Text fontFamily="$body" fontSize={13} lineHeight={21} color="$color" flex={1}>
                    {bullet}
                  </Text>
                </XStack>
              ))}
            </YStack>
          ) : null}
        </YStack>
      ))}
    </YStack>
  );
}
