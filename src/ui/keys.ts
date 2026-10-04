// Keeps keys typed into our fields from triggering X's shortcuts ("n" = new post).
type Handler = (event: KeyboardEvent) => void;

const guarded = new WeakMap<EventTarget, ShadowRoot>();
const fieldKeys = new WeakMap<Element, Handler>();
let takeAll: Handler | undefined;
// A key pressed in our field stays ours until released, even if the field closed.
let held: string | undefined;

export function guardFields(host: HTMLElement, root: ShadowRoot): void {
  guarded.set(host, root);
}

// The field's own listeners never see keys, so its Enter and Escape go here.
export function onFieldKey(input: HTMLInputElement, handler: Handler): void {
  fieldKeys.set(input, handler);
}

export function takeAllKeys(handler: Handler | undefined): void {
  takeAll = handler;
}

function focusedField(event: KeyboardEvent): HTMLInputElement | undefined {
  const active = event.target === null ? undefined : guarded.get(event.target)?.activeElement;
  return active instanceof HTMLInputElement ? active : undefined;
}

// Returns whether the key was ours.
function intercept(event: KeyboardEvent): boolean {
  if (event.type !== 'keydown' && event.code === held) {
    if (event.type === 'keyup') held = undefined;
    return true;
  }
  const field = focusedField(event);
  if (field !== undefined) {
    if (event.type === 'keydown') {
      held = event.code;
      fieldKeys.get(field)?.(event);
    }
    return true;
  }
  if (takeAll === undefined) return false;
  if (event.type === 'keydown') takeAll(event);
  return true;
}

for (const type of ['keydown', 'keypress', 'keyup'] as const) {
  window.addEventListener(
    type,
    (event) => {
      if (intercept(event)) event.stopImmediatePropagation();
    },
    true,
  );
}
