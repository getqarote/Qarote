/**
 * Read an image File, downscale it to fit within `max`px (preserving aspect
 * ratio), and return a PNG data URL. Used for the org logo / similar small
 * brand images: there's no object storage, so the resized data URL is stored
 * directly in the `logoUrl` column (a valid URL per `new URL()`). Downscaling
 * keeps the stored string small (a 256px PNG is a few KB).
 */
export async function fileToResizedDataUrl(
  file: File,
  max = 256
): Promise<string> {
  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Invalid image"));
    el.src = sourceUrl;
  });

  const scale = Math.min(1, max / Math.max(img.width, img.height) || 1);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}
