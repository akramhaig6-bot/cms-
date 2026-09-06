import type { Action, DB, Node } from '../types'
import { anyNode, nodeLabel } from '../lib/find'
import { uid, sleep } from '../lib/util'

export interface Hooks {
  toast: (msg: string, type?: 'ok'|'err'|'info') => void
  gotoPage: (pageId: string) => void
  backRequest: () => void
}

// وقت التشغيل للعميل: إظهار/إخفاء، نوافذ، أشرطة، متغيرات، سجل
export class SiteEngine {
  doc: DB
  hooks: Hooks
  visible = new Map<string, boolean>()      // تجاوزات الظهور
  folded = new Map<string, boolean>()       // طي الأشرطة
  popups: string[] = []                      // مكدس النوافذ المفتوحة (الأعلى آخر)
  vars: Record<string, any> = {}
  busy = new Map<string, boolean>()          // تدفقات قيد التشغيل
  progressRunning = new Map<string, { pct: number; cancel: boolean }>()
  listeners = new Set<() => void>()

  constructor(doc: DB, hooks: Hooks) { this.doc = doc; this.hooks = hooks; this.vars = {}; for (const v of doc.variables) if (!(v.id in this.vars)) this.vars[v.id] = v.def }
  setDoc(d: DB) { this.doc = d; for (const v of d.variables) if (!(v.id in this.vars)) this.vars[v.id] = v.def; this.notify() }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  notify() { this.listeners.forEach((f) => f()) }

  find(id?: string): Node | null { return id ? anyNode(this.doc, id) : null }
  labelOf(target: any) { if (!target) return ''; return nodeLabel(this.doc, target.kind, target.id) }

  isVisible(id: string, def?: boolean): boolean {
    if (this.visible.has(id)) return this.visible.get(id)!
    if (def != null) return def
    const n = this.find(id)
    return n ? !!n.visible : true
  }
  private setVis(id: string, on: boolean) { this.visible.set(id, on); this.notify() }
  show(id: string) { this.setVis(id, true) }
  hide(id: string) { this.setVis(id, false) }
  toggle(id: string) { this.setVis(id, !this.isVisible(id)) }

  // --- نوافذ ---
  isPopupOpen(id: string) { return this.popups.includes(id) }
  openPopup(id: string) {
    if (!this.popups.includes(id)) { this.popups.push(id); this.notify() }
    const p = this.doc.popups.find((x) => x.id === id)
    if (p) for (const ch of p.root.children || []) fireVisible(ch, this)
  }
  closeTop() { if (this.popups.length) { this.popups.pop(); this.notify() } }
  closePopup(id: string) { this.popups = this.popups.filter((x) => x !== id); this.notify() }
  closeAll() { this.popups = []; this.notify() }

  // --- أشرطة ---
  isFolded(id: string) {
    if (this.folded.has(id)) return this.folded.get(id)!
    const bar = this.doc.bars.find((b) => b.id === id)
    return bar ? !!bar.defaultFolded : false
  }
  fold(id: string) { this.folded.set(id, true); this.notify() }
  unfold(id: string) { this.folded.set(id, false); this.notify() }
  toggleBar(id: string) { this.isFolded(id) ? this.unfold(id) : this.fold(id) }

  // --- تنفيذ إجراءات ---
  async run(node: Node | null, actions: Action[], opts?: { requireProgress?: boolean }) {
    for (const a of actions || []) await this.runOne(a, node)
  }

  private async runOne(a: Action, src: Node | null) {
    if (a.delay) await sleep(a.delay)
    const target = a.target
    switch (a.type) {
      case 'nav': {
        if (target && target.kind === 'page') {
          const broken = !this.doc.pages.find((p) => p.id === target.id)
          if (broken) return this.hooks.toast('لا يمكن إتمام الإجراء الآن (الصفحة غير متاحة)', 'err')
          this.hooks.gotoPage(target.id!)
        } else if (target?.kind === 'url') window.open(target.id, '_blank')
        return
      }
      case 'back': this.hooks.backRequest(); return
      case 'openPopup': {
        if (target?.kind === 'popup' && !this.doc.popups.find((p) => p.id === target.id)) return this.hooks.toast('النافذة غير متاحة', 'err')
        if (target?.kind === 'popup') this.openPopup(target.id!)
        return
      }
      case 'closePopup': if (target?.kind === 'popup') this.closePopup(target.id!); else this.closeTop(); return
      case 'closeAllPopups': this.closeAll(); return
      case 'show': if (target?.kind === 'node') this.show(target.id!); return
      case 'hide': if (target?.kind === 'node') this.hide(target.id!); return
      case 'toggle': if (target?.kind === 'node') this.toggle(target.id!); return
      case 'showAndHide':
        if (a.showId) this.show(a.showId)
        if (a.hideId) this.hide(a.hideId)
        return
      case 'foldBar': if (target?.kind === 'bar') this.fold(target.id!); return
      case 'unfoldBar': if (target?.kind === 'bar') this.unfold(target.id!); return
      case 'toggleBar': if (target?.kind === 'bar') this.toggleBar(target.id!); return
      case 'runFlow': {
        const f = target?.kind === 'flow' ? this.doc.flows.find((x) => x.id === target.id) : null
        if (!f) return this.hooks.toast('التدفق غير متاح', 'err')
        if (this.busy.get(f.id)) return this.hooks.toast('هذه العملية قيد التنفيذ', 'info')
        this.busy.set(f.id, true); this.notify()
        try { for (const st of f.steps) { if (this.abortedFlow === f.id) break; await this.runOne(st, src) } }
        finally { this.busy.delete(f.id); this.abortedFlow = null; this.notify() }
        return
      }
      case 'sequence': for (const s of a.children || []) await this.runOne(s, src); return
      case 'openLink': if (target?.kind === 'url' && target.id) window.open(target.id, '_blank'); return
      case 'setVar': { if (target?.kind === 'var' && target.id) { const n = this.doc.variables.find((v) => v.id === target.id); this.vars[target.id] = coerce(n, target.label ?? ''); this.notify() } return }
      case 'incVar': { if (target?.kind === 'var' && target.id) { const base = Number(this.vars[target.id]) || 0; this.vars[target.id] = base + (Number(target.label) || 1); this.notify() } return }
      case 'toggleVar': { if (target?.kind === 'var' && target.id) { this.vars[target.id] = !this.vars[target.id]; this.notify() } return }
      default: return
    }
  }
  abortedFlow: string | null = null
}

function coerce(v: { vtype: string } | undefined, raw: string): any {
  if (!v) return raw
  if (v.vtype === 'number') return Number(raw) || 0
  if (v.vtype === 'bool') return raw === 'true' || raw === '1' || raw === 'نعم'
  return raw
}

// إطلاق إجراءات "عند الظهور" للعقد الظاهرة داخل كيان فُتح (صفحة/نافذة)
export function fireVisible(node: Node, eng: SiteEngine) {
  const ev = node.events?.onVisible
  if (node.visible && ev && ev.length) { eng.run(node, ev) }
  for (const c of node.children || []) fireVisible(c, eng)
}

export function hasClickActions(node: Node) {
  return !!((node.events?.click && node.events.click.length) || node.clickable || (node.type === 'button'))
}
