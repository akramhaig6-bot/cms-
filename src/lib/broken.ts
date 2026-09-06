import type { Action, DB, Node } from '../types'
import { NTYPE_LABEL } from './util'

export interface BrokenItem {
  id: string
  entityKind: 'pages'|'bars'|'popups'      // أين يقع المكوّن المصدر
  entityId: string
  entityLabel: string
  nodeId: string
  nodeName: string
  what: string           // ماذا كان الهدف المفقود
  actionId?: string
}

// يفحص كل إجراء/مرجع عبر الموقع ويكشف ما أشار إلى كيان/مكوّن/وسيط حُذف
export function findBroken(db: DB): BrokenItem[] {
  const out: BrokenItem[] = []
  const okNode = (id?: string) => !!id && existsNode(db, id)
  const okEntity = (kind: string, id?: string) => {
    if (!id) return true
    if (kind === 'page') return !!db.pages.find((p) => p.id === id)
    if (kind === 'bar') return !!db.bars.find((b) => b.id === id)
    if (kind === 'popup') return !!db.popups.find((p) => p.id === id)
    if (kind === 'flow') return !!db.flows.find((f) => f.id === id)
    if (kind === 'node') return okNode(id)
    if (kind === 'url') return true
    return false
  }
  const scanEntity = (entityKind: 'pages'|'bars'|'popups', entity: { id: string; name: string }, root: Node) => {
    const walk = (n: Node) => {
      // مراجع إجراءات
      for (const ev of Object.values(n.events || {})) for (const a of ev || []) {
        const miss = a.target && a.target.kind !== 'url' && !okEntity(a.target.kind, a.target.id)
        if (miss) out.push(mk(db, entityKind, entity, n, `إجراء «${aType(a.type)}» ← ${a.target?.label || 'هدف محذوف'}`, a))
        if (a.type === 'showAndHide') {
          if (a.showId && !okNode(a.showId)) out.push(mk(db, entityKind, entity, n, 'إظهار مكوّن محذوف', a))
          if (a.hideId && !okNode(a.hideId)) out.push(mk(db, entityKind, entity, n, 'إخفاء مكوّن محذوف', a))
        }
        for (const sub of a.children || []) if (sub.target && !okEntity(sub.target.kind, sub.target.id)) out.push(mk(db, entityKind, entity, n, `إجراء فرعي ← ${sub.target?.label || 'هدف محذوف'}`, sub))
      }
      // وسائط مفقودة
      if (n.type === 'image' && n.mediaId && !db.media.find((m) => m.id === n.mediaId) && !n.src) {
        out.push(mk(db, entityKind, entity, n, 'وسيط مفقود (صورة عنصر نائب)'))
      }
      for (const c of n.children || []) walk(c)
    }
    walk(root)
  }
  for (const p of db.pages) scanEntity('pages', { id: p.id, name: p.name }, p.root)
  for (const b of db.bars) scanEntity('bars', { id: b.id, name: b.name }, b.root)
  for (const po of db.popups) scanEntity('popups', { id: po.id, name: po.name }, po.root)
  // التفرد
  const seen = new Set<string>()
  return out.filter((x) => { const k = x.nodeId + x.actionId + x.what; if (seen.has(k)) return false; seen.add(k); return true })
}

function mk(db: DB, entityKind: any, entity: { id: string; name: string }, n: Node, what: string, a?: Action): BrokenItem {
  return { id: `b${entity.id}-${n.id}-${a?.id || Math.random().toString(36).slice(2, 7)}`, entityKind, entityId: entity.id, entityLabel: entity.name, nodeId: n.id, nodeName: `${NTYPE_LABEL[n.type]}: ${n.name}`, what, actionId: a?.id }
}

function existsNode(db: DB, id: string): boolean {
  const has = (n: Node): boolean => { if (n.id === id) return true; for (const c of n.children || []) if (has(c)) return true; return false }
  for (const p of db.pages) if (has(p.root)) return true
  for (const b of db.bars) if (has(b.root)) return true
  for (const po of db.popups) if (has(po.root)) return true
  for (const l of db.libs) if (has(l.root)) return true
  return false
}

function aType(t: string): string {
  const map: Record<string, string> = { nav:'الانتقال لصفحة', openPopup:'فتح نافذة', closePopup:'إغلاق نافذة', show:'إظهار', hide:'إخفاء', toggle:'تبديل', foldBar:'طي شريط', unfoldBar:'فتح شريط', toggleBar:'تبديل شريط', runFlow:'تشغيل تدفق', back:'رجوع', openLink:'رابط' }
  return map[t] || t
}

// يزيل الإجراء المكسور من المكوّن المصدر
export function dropBrokenAction(root: Node, nodeId: string, actionId: string): Node {
  const work = (n: Node): Node => {
    if (n.id === nodeId) {
      const events: any = {}
      for (const k of Object.keys(n.events || {})) {
        const list = (n.events as any)[k] || []
        events[k] = list.filter((a: Action) => a.id !== actionId)
      }
      return { ...n, events }
    }
    return { ...n, children: (n.children || []).map(work) }
  }
  return work(root)
}
