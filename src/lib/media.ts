import type { Media, Node } from '../types'

// صورة عنصر نائب (SVG مشفرة)
export function placeholderURI(label = 'بدون صورة'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e0f2fe"/><g fill="#7dd3fc"><circle cx="200" cy="110" r="40"/><rect x="120" y="170" width="160" height="60" rx="12"/></g><text x="200" y="250" text-anchor="middle" font-size="22" fill="#0369a1" font-family="sans-serif">${label}</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export function resolveMedia(node: Node, media: Media[]): { src: string; missing: boolean } {
  if (node.src) return { src: node.src, missing: false }
  const m = node.mediaId ? media.find((x) => x.id === node.mediaId) : undefined
  if (m) return { src: m.dataUrl, missing: false }
  return { src: placeholderURI(), missing: true }
}

export function bytesToSize(b: number): string {
  if (b < 1024) return b + ' بايت'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' ك.ب'
  return (b / 1024 / 1024).toFixed(2) + ' م.ب'
}
