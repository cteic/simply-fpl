import { SAVED_ENTRY_ID_KEY } from '@/lib/saved-entry-key';

/**
 * Set on `<html>` before the home hero is parsed when a returning visitor has
 * a saved team. `globals.css` hides the server-rendered hero while it is set,
 * so returning visitors never see the hero flash before their dashboard.
 */
export const SAVED_ENTRY_HINT_ATTRIBUTE = 'data-saved-entry';

/**
 * Inline script for the home route. It mirrors `resolveHomeChoice`: a saved
 * team wins unless the URL carries `?change=1` or `?clear=1`.
 */
export const SAVED_ENTRY_HINT_SCRIPT = `try{var p=new URLSearchParams(location.search);if(p.get('change')!=='1'&&p.get('clear')!=='1'){var v=Number(localStorage.getItem(${JSON.stringify(SAVED_ENTRY_ID_KEY)}));if(Number.isInteger(v)&&v>0)document.documentElement.setAttribute(${JSON.stringify(SAVED_ENTRY_HINT_ATTRIBUTE)},'')}}catch(e){}`;

/** Drops the hint once the client has decided to show the hero. */
export function clearSavedEntryHint(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.removeAttribute(SAVED_ENTRY_HINT_ATTRIBUTE);
}
