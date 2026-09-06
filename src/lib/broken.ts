import type { Action, DB, Node } from '../types'
import { NTYPE_LABEL } from './util'

export interface BrokenItem {
  id: string
  bkind: 'action' | 'media' | 'cond' | 'flowstep' // نوع المرجع المكسور
  entityKind: 'pages'|'bars'|'popups'|'flows'     // أين يقع المصدر
  entityId: string
  entityLabel: string
  nodeId: string
  nodeName: string
  what: string           // ماذا كان الهدف المفقود
  actionId?: string      // معرّف الإجراء/الخطوة (للحذف)
}

// يفحص كل إجراء/مرجع عبر الموقع ويكشف ما أشار إلى كيان/مكوّن/وسيط حُذف
export function findBroken(db: DB): BrokenItem[] {
  const out: BrokenItem[] = []
  const okNode = (id?: string) => !!id && existsNode(db, id)
  const okEntity = (kind: string, id?: string) => {
    if (!id) return true // هدف بلا معرّف = سلوك احتياطي في المحرك (مثل «أقرب نافذة») وليس مكسورًا
    if (kind === 'page') return !!db.pages.find((p) => p.id === id)
    if (kind === 'bar') return !!db.bars.find((b) => b.id === id)
    if (kind === 'popup') return !!db.popups.find((p) => p.id === id)
    if (kind === 'flow') return !!db.flows.find((f) => f.id === id)
    if (kind === 'var') return !!db.variables.find((v) => v.id === id)
    if (kind === 'node') return okNode(id)
    if (kind === 'url') return true
    return false
  }
  const scanEntity = (entityKind: 'pages'|'bars'|'popups', entity: { id: string; name: string }, root: Node) => {
    const walk = (n: Node) => {
      // مراجع إجراءات
      for (const ev of Object.values(n.events || {})) for (const a of ev || []) {
        if (a.target && a.target.kind !== 'url' && !okEntity(a.target.kind, a.target.id))
          out.push(mk(entityKind, entity, n, `إجراء «${aType(a.type)}» ← ${a.target.label || 'هدف محذوف'}`, a, 'action'))
        if (a.type === 'showAndHide') {
          if (a.showId && !okNode(a.showId)) out.push(mk(entityKind, entity, n, 'إظهار مكوّن محذوف', a, 'action'))
          if (a.hideId && !okNode(a.hideId)) out.push(mk(entityKind, entity, n, 'إخفاء مكوّن محذوف', a, 'action'))
        }
        for (const sub of a.children || []) if (sub.target && sub.target.kind !== 'url' && !okEntity(sub.target.kind, sub.target.id))
          out.push(mk(entityKind, entity, n, `إجراء فرعي ← ${sub.target.label || 'هدف محذوف'}`, sub, 'action'))
      }
      // وسائط مفقودة
      if (n.type === 'image' && n.mediaId && !db.media.find((m) => m.id === n.mediaId) && !n.src) {
        out.push(mk(entityKind, entity, n, 'وسيط مفقود (صورة عنصر نائب)', undefined, 'media'))
      }
      // شرط ظهور يشير لمكوّن محذوف
      if (n.cond?.refId && !okNode(n.cond.refId)) {
        out.push(mk(entityKind, entity, n, `شرط ظهور ← ${n.cond.refLabel || 'مكوّن محذوف'}`, undefined, 'cond'))
      }
      for (const c of n.children || []) walk(c)
    }
    walk(root)
  }
  for (const p of db.pages) scanEntity('pages', { id: p.id, name: p.name }, p.root)
  for (const b of db.bars) scanEntity('bars', { id: b.id, name: b.name }, b.root)
  for (const po of db.popups) scanEntity('popups', { id: po.id, name: po.name }, po.root)
  // خطوات التدفقات (تستهدف صفحات/نوافذ/أشرطة/متغيرات قد تُحذف)
  for (const f of db.flows) {
    const walkSteps = (list: Action[]) => {
      for (const a of list) {
        if (a.target && a.target.kind !== 'url' && !okEntity(a.target.kind, a.target.id))
          out.push(mkFlow(f, a, `خطوة تدفق «${aType(a.type)}» ← ${a.target.label || 'هدف محذوف'}`))
        if (a.type === 'showAndHide') {
          if (a.showId && !okNode(a.showId)) out.push(mkFlow(f, a, 'خطوة تدفق: إظهار مكوّن محذوف'))
          if (a.hideId && !okNode(a.hideId)) out.push(mkFlow(f, a, 'خطوة تدفق: إخفاء مكوّن محذوف'))
        }
        if (a.children?.length) walkSteps(a.children)
      }
    }
    walkSteps(f.steps)
  }
  // التفرد
  const seen = new Set<string>()
  return out.filter((x) => { const k = x.entityKind + x.nodeId + x.actionId + x.what; if (seen.has(k)) return false; seen.add(k); return true })
}

function mk(entityKind: 'pages'|'bars'|'popups', entity: { id: string; name: string }, n: Node, what: string, a?: Action, bkind: BrokenItem['bkind'] = 'action'): BrokenItem {
  return { id: `b${entity.id}-${n.id}-${a?.id || Math.random().toString(36).slice(2, 7)}`, bkind, entityKind, entityId: entity.id, entityLabel: entity.name, nodeId: n.id, nodeName: `${NTYPE_LABEL[n.type]}: ${n.name}`, what, actionId: a?.id }
}

function mkFlow(f: { id: string; name: string }, a: Action, what: string): BrokenItem {
  return { id: `b${f.id}-${a.id}`, bkind: 'flowstep', entityKind: 'flows', entityId: f.id, entityLabel: f.name, nodeId: a.id, nodeName: `خطوة: ${aType(a.type)}`, what, actionId: a.id }
}

function existsNode(db: DB, id: string): boolean {
  const has = (n: Node): boolean => { if (n.id === id) return true; for (const c of n.children || []) if (has(c)) return true; return false }
  for (const p of db.pages) if (p.root && has(p.root)) return true
  for (const b of db.bars) if (b.root && has(b.root)) return true
  for (const po of db.popups) if (po.root && has(po.root)) return true
  for (const l of db.libs) if (l.root && has(l.root)) return true
  return false
}

function aType(t: string): string {
  const map: Record<string, string> = { nav:'الانتقال لصفحة', openPopup:'فتح نافذة', closePopup:'إغلاق نافذة', show:'إظهار', hide:'إخفاء', toggle:'تبديل', foldBar:'طي شريط', unfoldBar:'فتح شريط', toggleBar:'تبديل شريط', runFlow:'تشغيل تدفق', back:'رجوع', openLink:'رابط', setVar:'تعيين متغير', incVar:'زيادة متغير', toggleVar:'تبديل متغير' }
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

// يفصل الوسيط المفقود عن مكوّن الصورة (يرجع للصورة النائبة بدل مرجع ميت)
export function dropBrokenMedia(root: Node, nodeId: string): Node {
  const work = (n: Node): Node => {
    if (n.id === nodeId) return { ...n, mediaId: undefined, src: undefined }
    return { ...n, children: (n.children || []).map(work) }
  }
  return work(root)
}

// يزيل شرط الظهور المكسور
export function dropBrokenCond(root: Node, nodeId: string): Node {
  const work = (n: Node): Node => {
    if (n.id === nodeId) return { ...n, cond: undefined }
    return { ...n, children: (n.children || []).map(work) }
  }
  return work(root)
}
