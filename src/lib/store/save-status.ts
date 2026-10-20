/** Where the person's latest changes are stored. Shared by every screen, so it survives navigation. */
export type SaveStatus = "device" | "saving" | "saved" | "error";

let status: SaveStatus = "device";
const listeners = new Set<() => void>();

export const getSaveStatus = (): SaveStatus => status;

export function setSaveStatus(next: SaveStatus): void {
  status = next;
  for (const listener of listeners) listener();
}

export function subscribeSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
