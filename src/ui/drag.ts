// A type of our own, so dropping a picture or link does nothing.
const TYPE = 'application/x-stash-post';

export function startDrag(event: DragEvent, id: string): void {
  if (event.dataTransfer === null) return;
  event.dataTransfer.setData(TYPE, id);
  event.dataTransfer.effectAllowed = 'move';
}

export function isPostDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(TYPE) ?? false;
}

export function droppedId(event: DragEvent): string | undefined {
  return event.dataTransfer?.getData(TYPE) || undefined;
}
