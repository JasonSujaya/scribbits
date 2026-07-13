export type StickerShineCapabilityInput = Readonly<{
  webgl: boolean;
  reduceMotion: boolean;
  hardwareConcurrency?: number;
  deviceMemoryGigabytes?: number;
}>;

export function supportsStickerShine(
  input: StickerShineCapabilityInput
): boolean {
  if (input.reduceMotion || !input.webgl) return false;
  if (
    input.hardwareConcurrency !== undefined &&
    input.hardwareConcurrency < 4
  ) {
    return false;
  }
  if (
    input.deviceMemoryGigabytes !== undefined &&
    input.deviceMemoryGigabytes < 3
  ) {
    return false;
  }
  return true;
}
