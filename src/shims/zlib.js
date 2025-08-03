// src/shims/zlib.js
export function deflate() {
  throw new Error("zlib.deflate is not available in the browser");
}
export function inflate() {
  throw new Error("zlib.inflate is not available in the browser");
}

export function createUnzip() {
  throw new Error("zlib.createUnzip() is not available in the browser");
}
