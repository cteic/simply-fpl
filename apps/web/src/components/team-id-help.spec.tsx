import { isValidElement } from 'react';

import { describe, expect, it } from 'vitest';

import {
  TEAM_ID_HELP_EXAMPLE,
  TEAM_ID_HELP_LABEL,
  TEAM_ID_HELP_STEPS,
  TeamIdHelpView,
} from '@simplyfpl/ui';

function collectText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (!isValidElement(node)) return '';
  const props = node.props;
  if (props !== null && typeof props === 'object' && 'children' in props) {
    return collectText(props.children);
  }
  return '';
}

const NOOP = () => {};

describe('TeamIdHelp explainer', () => {
  it('shows only the trigger label when collapsed', () => {
    const tree = TeamIdHelpView({ tone: 'inverse', open: false, onToggle: NOOP });
    const text = collectText(tree);
    expect(text).toContain(TEAM_ID_HELP_LABEL);
    expect(text).not.toContain(TEAM_ID_HELP_STEPS[0]);
    expect(text).not.toContain(TEAM_ID_HELP_EXAMPLE.id);
  });

  it('reveals the steps and the /entry/ team-ID example when expanded', () => {
    const tree = TeamIdHelpView({ tone: 'inverse', open: true, onToggle: NOOP });
    const text = collectText(tree);
    for (const step of TEAM_ID_HELP_STEPS) {
      expect(text).toContain(step);
    }
    expect(text).toContain(TEAM_ID_HELP_EXAMPLE.prefix);
    expect(text).toContain(TEAM_ID_HELP_EXAMPLE.id);
  });
});
