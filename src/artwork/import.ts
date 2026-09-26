import { artworkAssetSchema, type ArtworkAsset } from "../domain/custom-art";
/** Only static, self-contained SVG artwork is accepted before rasterization. */
export function staticSvg(raw: string) {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new Error("SVGの形式が正しくありません");
  const tags = new Set(
    "svg g path rect circle ellipse line polyline polygon defs clipPath mask linearGradient radialGradient stop use title desc text tspan".split(
      " ",
    ),
  );
  const attributes = new Set(
    "id xmlns xmlns:xlink viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform fill fill-rule fill-opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity clip-path clip-rule mask gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity fx fy fr href xlink:href preserveAspectRatio font-family font-size font-weight text-anchor dominant-baseline".split(
      " ",
    ),
  );
  for (const el of doc.querySelectorAll("*")) {
    if (
      !tags.has(el.localName) ||
      el.namespaceURI !== "http://www.w3.org/2000/svg"
    )
      throw new Error(
        "このSVGには未対応の要素があります。パス化したSVGか透過PNGを使用してください。",
      );
    for (const a of [...el.attributes]) {
      if (!attributes.has(a.name))
        throw new Error(
          `SVGの ${a.name} は未対応です。スタイルを属性に変換するか透過PNGを使用してください。`,
        );
      if (
        (a.localName === "href" && !/^#[\w.-]+$/.test(a.value)) ||
        (/url\s*\(/i.test(a.value) && !/^url\(#[\w.-]+\)$/.test(a.value))
      )
        throw new Error("外部参照を含むSVGは取り込めません");
    }
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
export async function importArtwork(file: File): Promise<ArtworkAsset> {
  if (file.size > 1_000_000)
    throw new Error("絵柄は1MB以下のSVGまたはPNGにしてください");
  const svg =
    file.name.toLowerCase().endsWith(".svg") || file.type === "image/svg+xml";
  if (!svg && file.type !== "image/png")
    throw new Error("SVGまたはPNGを選んでください");
  const blob = svg
    ? new Blob([staticSvg(await file.text())], { type: "image/svg+xml" })
    : file;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (
      !img.naturalWidth ||
      !img.naturalHeight ||
      img.naturalWidth * img.naturalHeight > 16_000_000
    )
      throw new Error("画像の寸法が大きすぎるか不正です");
    const canvas = document.createElement("canvas");
    const ratio = Math.min(
      1,
      512 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を変換できません");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > 200_000)
      throw new Error(
        "絵柄の保存サイズが大きすぎます。小さいPNGにして取り込んでください",
      );
    return artworkAssetSchema.parse({
      id: crypto.randomUUID(),
      name: file.name.slice(0, 80),
      dataUrl,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
