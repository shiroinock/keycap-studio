import type { ResolvedKey, Study } from "../domain/model";
import { legendMarkup } from "../renderer/svg";
export function textureSource(key: ResolvedKey, study: Study) {
  const w = key.w * 60 - 6,
    h = key.h * 60 - 6;
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 4}" height="${h * 4}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${key.color}"/>${legendMarkup(key, study, w, h)}</svg>`,
    )
  );
}
