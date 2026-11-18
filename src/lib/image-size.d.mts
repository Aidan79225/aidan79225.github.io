export interface ImageSize {
  width: number;
  height: number;
}

export function webpSize(buf: Buffer): ImageSize | null;
export function publicImageSize(src: string, publicDir?: string): ImageSize | null;
