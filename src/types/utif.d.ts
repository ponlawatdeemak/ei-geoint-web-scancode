declare module 'utif' {
  export function decode(buf: ArrayBufferLike): any
  export function decodeImages(buf: ArrayBufferLike, ifds: any): void
  export function toRGBA8(ifd: any): Uint8Array
}

export {}
