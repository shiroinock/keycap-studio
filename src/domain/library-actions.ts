import type { Study } from "./model";
export type DeletedStudy = { study: Study; index: number };
export function restoreStudy(current: Study[], deleted: DeletedStudy) {
  if (current.length >= 200)
    throw new Error(
      "200件に達しているため復元できません。先に別のセットを削除してください。",
    );
  const study = structuredClone(deleted.study);
  if (current.some((s) => s.id === study.id)) study.id = crypto.randomUUID();
  const studies = [...current];
  studies.splice(Math.min(deleted.index, studies.length), 0, study);
  return { studies, id: study.id };
}
