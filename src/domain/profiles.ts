export const profileIds = [
  "cherry",
  "sa",
  "dcs",
  "dss",
  "g20",
  "f10",
  "kat",
  "kam",
  "pbs",
  "mt3",
  "mtnu",
  "asa",
  "asa-low",
  "mda",
  "moa",
  "sal",
  "jda",
  "osa-akko",
  "osa",
  "ksa",
  "lsa",
  "pff",
  "lpf",
  "slk",
  "mbk",
  "ursa",
  "dsa",
  "xda",
  "oem",
] as const;
export type ProfileId = (typeof profileIds)[number];
interface Profile {
  name: string;
  rows: { height: number; tilt: number }[];
  spaceHeight: number;
  spaceTilt: number;
  dish: number;
  uniform: boolean;
  topInset?: number;
  dishX?: number;
  functionRow?: { height: number; tilt: number };
  group?: string;
  source?: string;
  rowLabels?: string[];
  widthGap?: number;
  depthGap?: number;
}
const commercial = (
  name: string,
  group: string,
  heights: number[],
  tilts: number[],
  topInset: number,
  dish: number,
  dishX: number,
  source: string,
): Profile => ({
  name,
  group,
  rows: heights.map((height, i) => ({ height, tilt: tilts[i] })),
  spaceHeight: heights[4],
  spaceTilt: tilts[4],
  dish,
  dishX,
  topInset,
  uniform:
    heights.every((h) => h === heights[0]) && tilts.every((t) => t === 0),
  source,
});
export const profiles: Record<ProfileId, Profile> = {
  cherry: commercial(
    "Cherry",
    "定番",
    [9.4, 8.4, 7.6, 8.5, 8.5],
    [-0.12, -0.06, 0, 0.11, 0.11],
    5.2,
    0.65,
    0,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  sa: commercial(
    "SA",
    "Signature Plastics",
    [16.5, 14.5, 12.5, 14.5, 12.5],
    [-0.2, -0.1, 0, 0.14, 0],
    5.4,
    0.8,
    0.8,
    "https://spkeyboards.com/blogs/product-guides/keycap-family-specs",
  ),
  dcs: commercial(
    "DCS",
    "Signature Plastics",
    [9.9, 8.8, 7.5, 8.4, 8.4],
    [-0.14, -0.06, 0, 0.13, 0.13],
    5.3,
    0.6,
    0,
    "https://spkeyboards.com/blogs/product-guides/keycap-family-specs",
  ),
  dss: commercial(
    "DSS",
    "Signature Plastics",
    [10.2, 9.4, 8.5, 9.3, 9.3],
    [-0.15, -0.07, 0, 0.12, 0.12],
    5.5,
    0.7,
    0.7,
    "https://spkeyboards.com/blogs/product-guides/keycap-family-specs",
  ),
  g20: commercial(
    "G20",
    "Signature Plastics",
    [7, 7, 7, 7, 7],
    [0, 0, 0, 0, 0],
    2.8,
    0,
    0,
    "https://spkeyboards.com/blogs/product-guides/keycap-family-specs",
  ),
  f10: commercial(
    "F10",
    "Signature Plastics",
    [7.2, 7.2, 7.2, 7.2, 7.2],
    [0, 0, 0, 0, 0],
    2.2,
    0,
    0,
    "https://spkeyboards.com/blogs/product-guides/keycap-family-specs",
  ),
  kat: commercial(
    "KAT",
    "Keyreative",
    [13.4, 12, 10.7, 11.8, 11.8],
    [-0.16, -0.08, 0, 0.13, 0.13],
    4.8,
    0.7,
    0.7,
    "https://keyreative.store/blogs/news/keyreative-new-keycaps-height-profile-kam-preview",
  ),
  kam: commercial(
    "KAM",
    "Keyreative",
    [9.4, 9.4, 9.4, 9.4, 9.4],
    [0, 0, 0, 0, 0],
    5,
    0.6,
    0.6,
    "https://keyreative.store/products/soda-squid-kam-profile-pbt-keycaps",
  ),
  pbs: commercial(
    "PBS",
    "Keyreative",
    [7.4, 7.4, 7.4, 7.4, 7.4],
    [0, 0, 0, 0, 0],
    3.6,
    0.55,
    0.55,
    "https://keyreative.store/collections/pbs-keycaps",
  ),
  mt3: commercial(
    "MT3",
    "Matt3o",
    [14.5, 13, 11.5, 12.5, 10.5],
    [-0.22, -0.11, 0, 0.17, 0],
    5.8,
    1.1,
    1.1,
    "https://matt3o.com/mt3-keycap-profile-a-brief-history/",
  ),
  mtnu: commercial(
    "MTNU",
    "Matt3o",
    [9.5, 8.5, 7.8, 8.8, 8.8],
    [-0.12, -0.05, 0, 0.1, 0.1],
    4.8,
    0.65,
    0.65,
    "https://matt3o.com/mtnu-pre-order-phase-starts-now/",
  ),
  asa: commercial(
    "ASA",
    "Akko",
    [11.8, 10.7, 9.5, 10.8, 10.8],
    [-0.15, -0.08, 0, 0.12, 0.12],
    4.7,
    0.65,
    0.65,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  "asa-low": commercial(
    "ASA Low",
    "Akko",
    [8.7, 8.7, 8.7, 8.7, 8.7],
    [0, 0, 0, 0, 0],
    4,
    0.5,
    0.5,
    "https://en.akkogear.com/product/black-pink-keycap-set-154-key/",
  ),
  mda: commercial(
    "MDA",
    "Akko",
    [10.2, 9.6, 9.1, 9.8, 9.8],
    [-0.08, -0.04, 0, 0.07, 0.07],
    4.3,
    0.55,
    0.55,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  moa: commercial(
    "MOA",
    "Akko",
    [10, 10, 10, 10, 10],
    [0, 0, 0, 0, 0],
    3.8,
    0.65,
    0.65,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  sal: commercial(
    "SAL",
    "Akko",
    [14.8, 13.4, 11.8, 13.2, 13.2],
    [-0.17, -0.08, 0, 0.13, 0.13],
    5,
    0.75,
    0.75,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  jda: commercial(
    "JDA",
    "Akko",
    [10.5, 9.8, 9, 9.6, 9.6],
    [-0.08, -0.04, 0, 0.07, 0.07],
    4.4,
    0.5,
    0.5,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  "osa-akko": commercial(
    "OSA (Akko)",
    "Akko",
    [15.2, 13.8, 12.2, 13.6, 13.6],
    [-0.18, -0.09, 0, 0.14, 0.14],
    5.1,
    0.8,
    0.8,
    "https://en.akkogear.com/blog-ultimate-guide-to-keycap-profiles/",
  ),
  osa: commercial(
    "OSA (Keychron)",
    "Keychron",
    [11.5, 10, 9, 10.2, 10.2],
    [-0.16, -0.08, 0, 0.12, 0.12],
    4.7,
    0.65,
    0.65,
    "https://keychronsupport.zendesk.com/hc/en-us/articles/12707932580375-What-is-the-height-of-the-keycap-profile-used-for-the-Keychron-keyboards",
  ),
  ksa: commercial(
    "KSA",
    "Keychron",
    [16.4, 14.4, 12.5, 14.5, 13.2],
    [-0.21, -0.1, 0, 0.15, 0.08],
    5.3,
    0.85,
    0.85,
    "https://keychronsupport.zendesk.com/hc/en-us/articles/12707932580375-What-is-the-height-of-the-keycap-profile-used-for-the-Keychron-keyboards",
  ),
  lsa: commercial(
    "LSA",
    "Keychron",
    [5.3, 5.3, 5.3, 5.3, 5.3],
    [0, 0, 0, 0, 0],
    2.8,
    0.3,
    0.3,
    "https://keychronsupport.zendesk.com/hc/en-us/articles/12707932580375-What-is-the-height-of-the-keycap-profile-used-for-the-Keychron-keyboards",
  ),
  pff: commercial(
    "PFF",
    "FKcaps / Low",
    [5, 5, 5, 5, 5],
    [0, 0, 0, 0, 0],
    2.6,
    0.35,
    0,
    "https://fkcaps.com/pages/keycap-profiles",
  ),
  lpf: commercial(
    "LPF",
    "FKcaps / Low",
    [4.6, 4.6, 4.6, 4.6, 4.6],
    [0, 0, 0, 0, 0],
    2.5,
    0.3,
    0,
    "https://fkcaps.com/pages/keycap-profiles",
  ),
  slk: commercial(
    "SLK",
    "FKcaps / Low",
    [7.5, 7.5, 7.5, 7.5, 7.5],
    [0, 0, 0, 0, 0],
    3.2,
    0.55,
    0.55,
    "https://fkcaps.com/pages/keycap-profiles",
  ),
  mbk: commercial(
    "MBK (Choc)",
    "FKcaps / Low",
    [4, 4, 4, 4, 4],
    [0, 0, 0, 0, 0],
    2.5,
    0.4,
    0.4,
    "https://fkcaps.com/pages/keycap-profiles",
  ),
  ursa: commercial(
    "URSA (Topre)",
    "FKcaps / Low",
    [12.7, 10.8, 9, 10.5, 10.5],
    [-0.17, -0.08, 0, 0.12, 0.12],
    5,
    0.7,
    0.7,
    "https://fkcaps.com/pages/keycap-profiles",
  ),
  dsa: {
    name: "DSA",
    group: "定番",
    source: "https://spkeyboards.com/blogs/product-guides/keycap-family-specs",
    rows: Array.from({ length: 5 }, () => ({ height: 7.4, tilt: 0 })),
    spaceHeight: 7.4,
    spaceTilt: 0,
    dish: 0.65,
    dishX: 0.65,
    topInset: 5.45,
    uniform: true,
  },
  xda: {
    name: "XDA",
    group: "定番",
    source: "https://ymdkey.com/products/xda-1u-new-keycapsblank-pbt-1-55mm",
    rows: Array.from({ length: 5 }, () => ({ height: 9.6, tilt: 0 })),
    spaceHeight: 9.6,
    spaceTilt: 0,
    dish: 0.45,
    dishX: 0.45,
    topInset: 3.3,
    uniform: true,
  },
  oem: {
    name: "OEM",
    group: "定番",
    source:
      "https://keychronsupport.zendesk.com/hc/en-us/articles/12707932580375-What-is-the-height-of-the-keycap-profile-used-for-the-Keychron-keyboards",
    rows: [
      { height: 11.5, tilt: -0.16 },
      { height: 10, tilt: -0.08 },
      { height: 9, tilt: 0 },
      { height: 10.2, tilt: 0.12 },
      { height: 10.2, tilt: 0.12 },
    ],
    spaceHeight: 9.8,
    spaceTilt: 0.12,
    dish: 0.7,
    topInset: 5.2,
    uniform: false,
  },
};
export const defaultProfile: ProfileId = "cherry";
profiles.mbk.widthGap = 1.55;
profiles.mbk.depthGap = 2.55;
profiles.dsa.rowLabels = ["R3", "R3", "R3", "R3", "R3"];
profiles.sa.rowLabels = ["R1", "R2", "R3", "R4", "R3"];
profiles.kat.rowLabels = ["R4", "R3", "R2", "R1", "R1"];
profiles.mt3.functionRow = { height: 16, tilt: -0.25 };
profiles.kat.functionRow = { height: 14.3, tilt: -0.22 };
export function profileRowIndex(
  key: { row: number; y: number },
  layout: { keys: { label: string; y: number }[] },
  id: ProfileId,
) {
  return profiles[id].functionRow &&
    key.y === 0 &&
    layout.keys.some((k) => k.y === 0 && k.label === "F1")
    ? -1
    : key.row;
}
export const rowName = (row: number, id: ProfileId) =>
  row === -1 && profiles[id].functionRow
    ? id === "kat"
      ? "R5"
      : "R0"
    : (profiles[id].rowLabels?.[Math.max(0, row)] ??
      (profiles[id].uniform
        ? "R0"
        : ["R1", "R2", "R3", "R4", "R4"][Math.max(0, row)]));
