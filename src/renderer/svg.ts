import { resolveKeys, type Study, type ResolvedKey } from "../domain/model";
export const UNIT = 60,
  PAD = 24,
  WIDTH = 948,
  HEIGHT = 348;
export const fontStack =
  "'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', sans-serif";
export const esc = (s: string) =>
  s
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu,
      "\uFFFD",
    )
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
const noveltyPaths = {
  sun: "M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2",
  moon: "M18 3A10 10 0 1 0 21 18A10 10 0 0 1 18 3Z",
  spark: "M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z",
  wave: "M1 8Q6 2 12 8T23 8 M1 16Q6 10 12 16T23 16",
};
/** Shared legend artwork for the 2D keys and 3D top textures. */
export function legendMarkup(
  k: ResolvedKey,
  study: Study,
  w: number,
  h: number,
): string {
  const center = study.legend.align === "center";
  const tx = center ? w / 2 : 11;
  const anchor = center ? "middle" : "start";
  const units = (text: string) =>
    [...text].reduce((n, c) => n + (/[^\x00-\x7F]/.test(c) ? 1 : 0.65), 0);
  const chars = units(k.main);
  const max = w - 20;
  const fontSize = Math.max(5, Math.min(12, max / Math.max(1, chars)));
  const subSize = Math.max(5, Math.min(8, max / Math.max(1, units(k.sub))));
  const main =
    k.novelty === "none"
      ? `<text x="${tx}" y="${k.sub && study.legend.sublegends ? 32 : 30}" font-size="${fontSize}" text-anchor="${anchor}"${chars * fontSize > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(k.main)}</text>`
      : `<path d="${noveltyPaths[k.novelty]}" transform="translate(${w / 2 - 10} ${h / 2 - 10}) scale(.85)" fill="none" stroke="${k.ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<g fill="${k.ink}" font-family="${fontStack}" font-weight="500">${study.legend.sublegends && k.novelty === "none" ? `<text x="${tx}" y="16" font-size="${subSize}" text-anchor="${anchor}"${units(k.sub) * subSize > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(k.sub)}</text>` : ""}${main}</g>`;
}
export function keyMarkup(k: ResolvedKey, study: Study): string {
  const x = PAD + k.x * UNIT + 3,
    y = PAD + k.y * UNIT + 3,
    w = k.w * UNIT - 6,
    h = k.h * UNIT - 6;
  return `<g data-key-id="${k.id}" transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="6" fill="${k.color}"/><rect x="4" y="3" width="${w - 8}" height="${h - 9}" rx="4" fill="white" fill-opacity=".11"/><path d="M5 ${h - 6}H${w - 5}" stroke="black" stroke-opacity=".09" stroke-width="3" stroke-linecap="round"/>${legendMarkup(k, study, w, h)}</g>`;
}
export function renderSvg(study: Study): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${esc(study.name)}"><title>${esc(study.name)} — ANSI 60%</title><rect x="6" y="9" width="936" height="334" rx="15" fill="#000" opacity=".08"/><rect x="6" y="4" width="936" height="334" rx="15" fill="#D1D1CF"/><rect x="12" y="10" width="924" height="322" rx="11" fill="#BDBDBB"/>${resolveKeys(
    study,
  )
    .map((k) => keyMarkup(k, study))
    .join("")}</svg>`;
}
export function svgUrl(study: Study): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSvg(study))}`;
}
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export const safeName = (name: string) =>
  name.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 70) || "study";
export async function pngBlob(study: Study, width: number): Promise<Blob> {
  if (![1896, 2844, 3792].includes(width))
    throw new Error("出力サイズが不正です");
  await document.fonts.ready;
  const img = new Image();
  img.src = svgUrl(study);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((width * HEIGHT) / WIDTH);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG出力を利用できません");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG生成に失敗しました")),
      "image/png",
    ),
  );
}
