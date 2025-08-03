// src/shims/url.js

export function parse() {
  throw new Error("url.parse is not available in the browser");
}

export function format() {
  throw new Error("url.format is not available in the browser");
}

export function resolve() {
  throw new Error("url.resolve is not available in the browser");
}
