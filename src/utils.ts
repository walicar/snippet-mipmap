export const getMipCount = (width: number, height: number) =>
  Math.log2(Math.max(width, height)) + 1;

export interface Tex {
  data: ImageDataArray;
  width: number;
  height: number;
}

type Color = Uint8ClampedArray<ArrayBuffer>;

export const bilinearFilter = (
  tl: Color,
  tr: Color,
  bl: Color,
  br: Color,
  t1: number,
  t2: number,
): Color => {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const mix = (a: Color, b: Color, t: number) =>
    a.map((v, i) => lerp(v, b[i], t));

  const top = mix(tl, tr, t1);
  const bot = mix(bl, br, t1);

  return mix(top, bot, t2);
};

export const makeMip = (tex: Tex): Tex => {
  const { data: src, width: srcWidth, height: srcHeight } = tex;
  const dstWidth = Math.max(1, Math.floor(srcWidth / 2));
  const dstHeight = Math.max(1, Math.floor(srcHeight / 2));
  const length = dstWidth * dstHeight;
  const dst: ImageDataArray = new Uint8ClampedArray(length * 4);

  const getColor = (row: number, col: number) => {
    const srcOffset = (row * srcWidth + col) * 4;
    return src.subarray(srcOffset, srcOffset + 4);
  };

  // for each pixel in dst, mix its 4 corresonding pixels in src
  for (let p = 0; p < length; p++) {
    // get texel coord of dstPixel
    const dstRow = Math.floor(p / dstWidth);
    const dstCol = p % dstWidth;

    // get center texcoord in dst
    const dstU = (dstCol + 0.5) / dstWidth;
    const dstV = (dstRow + 0.5) / dstHeight;

    // get corresponding center texcoord in src
    const srcU = dstU * srcWidth - 0.5;
    const srcV = dstV * srcHeight - 0.5;

    // get topleft texel coord
    const srcRow = Math.floor(srcV);
    const srcCol = Math.floor(srcU);

    // calculate how much to mix our colors
    const t1 = srcU - srcCol;
    const t2 = srcV - srcRow;

    // get colors for each square
    const tl = getColor(srcRow, srcCol);
    const tr = getColor(srcRow + 1, srcCol);
    const bl = getColor(srcRow, srcCol + 1);
    const br = getColor(srcRow + 1, srcCol + 1);

    // get filtered color
    const dstColor = bilinearFilter(tl, tr, bl, br, t1, t2);
    const dstOffset = (dstRow * dstWidth + dstCol) * 4;
    dst.set(dstColor, dstOffset);
  }

  return {
    data: dst,
    width: dstWidth,
    height: dstHeight,
  };
};

export const makeMips = (tex: Tex): Tex[] => {
  const mipCount = getMipCount(tex.width, tex.height);
  const mips: Tex[] = [tex];

  for (let i = 1; i < mipCount; i++) {
    const srcTex = mips[i - 1];
    const mip = makeMip(srcTex);
    mips.push(mip);
  }

  return mips;
};

export const loadImage = async (url: string): Promise<Tex> => {
  const res = await fetch(url);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: 'none',
  });
  const { width, height } = bitmap;

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to get 2d context');
  context.drawImage(bitmap, 0, 0);

  const data = context.getImageData(0, 0, width, height).data;
  return { data, width, height };
};
