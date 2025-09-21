export const loadBitmap = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: "none" });
    return bitmap
}