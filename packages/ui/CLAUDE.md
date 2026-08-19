# packages/ui — cross-platform components

One component definition that works on web and native, via Tamagui.

Read `DESIGN_SYSTEM.md` in this package before building anything here.

## Rules

- Tamagui is the only styling library. Never introduce another.
- Use Tamagui primitives (`<XStack>`, `<YStack>`, `<Stack>`, `<Text>`) rather
  than raw `<View>` or `<div>`.
- Reference design tokens with the `$` prefix (`backgroundColor="$surface"`,
  `color="$t1"`). Never hard-code a hex value.
- No business logic, no API calls, no hooks beyond local UI state.
- Don't build a component twice for web and native — that is what this package
  exists to prevent.

Most components belong here rather than in an app. Build in an app only when the
thing is genuinely app-specific: page-level layouts, error boundaries, routing
shells.
