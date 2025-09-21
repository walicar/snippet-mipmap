export const loadImage = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: "none" });
    const { width, height } = bitmap;

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to get 2d context");
    context.drawImage(bitmap, 0, 0);

    const data = context.getImageData(0,0,width,height).data.buffer;
    return { data, width, height };
}