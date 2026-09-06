import type { DB, Node } from '../types'
import { findNode } from './tree'

export function anyNode(doc: DB, id?: string): Node | null {
  if (!id) return null
  for (const p of doc.pages) { const n = findNode(p.root, id); if (n) return n }
  for (const b of doc.bars) { const n = findNode(b.root, id); if (n) return n }
  for (const pp of doc.popups) { const n = findNode(pp.root, id); if (n) return n }
  for (const l of doc.libs) { const n = findNode(l.root, id); if (n) return n }
  return null
}

export function nodeLabel(doc: DB, kind: string, id?: string): string {
  if (!id) return '—'
  if (kind === 'page') return doc.pages.find((p) => p.id === id)?.name || 'صفحة محذوفة'
  if (kind === 'bar') return doc.bars.find((b) => b.id === id)?.name || 'شريط محذوف'
  if (kind === 'popup') return doc.popups.find((p) => p.id === id)?.name || 'نافذة محذوفة'
  if (kind === 'flow') return doc.flows.find((f) => f.id === id)?.name || 'تدفق محذوف'
  if (kind === 'node') {
    const n = anyNode(doc, id)
    if (n) return n.name
    const media = doc.media.find((m) => m.id === id)
    if (media) return media.name
    return 'مكوّن محذوف'
  }
  return id
}
