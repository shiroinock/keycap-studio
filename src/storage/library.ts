import { parseLibrary, type Study, type Library } from "../domain/model";
export const STORAGE_KEY = "keycap-studio.library.v2";
export const LEGACY_STORAGE_KEY = "keycap-studio.library.v1";
export function serialize(studies: Study[]): string {
  const data: Library = { schemaVersion: 2, studies };
  return JSON.stringify(data, null, 2);
}
export function loadLibrary(storage: Pick<Storage, "getItem">): Study[] | null {
  const raw =
    storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY);
  return raw === null ? null : parseLibrary(raw).studies;
}
export function saveLibrary(
  storage: Pick<Storage, "setItem">,
  studies: Study[],
): void {
  const data = serialize(studies);
  parseLibrary(data);
  storage.setItem(STORAGE_KEY, data);
}
