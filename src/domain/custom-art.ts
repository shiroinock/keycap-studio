import { z } from "zod";
export const customArtSchema = z
  .object({
    assetId: z.string().min(1).max(100),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(0.1).max(2),
    rotation: z.number().min(-180).max(180),
  })
  .strict();
export const artworkAssetSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(80),
    dataUrl: z
      .string()
      .max(200_000)
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();
export const artworkAssetsSchema = z
  .array(artworkAssetSchema)
  .max(12)
  .refine(
    (a) => new Set(a.map((v) => v.id)).size === a.length,
    "絵柄のIDが重複しています",
  );
export type CustomArt = z.infer<typeof customArtSchema>;
export type ArtworkAsset = z.infer<typeof artworkAssetSchema>;
export const defaultArt = (assetId: string): CustomArt => ({
  assetId,
  x: 0.5,
  y: 0.5,
  scale: 0.7,
  rotation: 0,
});
