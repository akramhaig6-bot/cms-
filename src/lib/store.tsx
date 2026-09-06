import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DB, PublishEntry, Notification, Session, Node, NType, EventName, Page, Bar, Popup, Flow, Lib, Account } from '../types'
import { clone, uid, NTYPE_LABEL, createNode, accepts, normalizeSlug } from './util'
import { countNodes } from './tree'
import { seedDB, STORAGE_KEY } from './seed'
import { anyNode } from './find'

type EntKind = 'pages' | 'bars' | 'popups' | 'flows' | 'libs'
const HAS_ROOT: EntKind[] = ['pages', 'bars', 'popups', 'libs']

interface PersistShape {
  db: DB
  published: DB
  history: PublishEntry[]
  notifications: Notification[]
  settingsVersion?: number
}

function loadPersist(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as PersistShape
      if (p && p.db && p.published) return p
    }
  } catch (e) { /* ignore */ }
  const seed = seedDB()
  const base: PersistShape = {
    db: seed, published: clone(seed), history: [],
    notifications: [{
      id: uid('not'), type: 'info', text: 'مرحبًا بك في لوحة /admin. عدّل المحتوى ثم انشر ليظهر على /client.',
      at: Date.now(), read: false,
    }],
  }
  return base
}

export type SaveState = 'saved' | 'saving' | 'dirty'

export interface StoreCtx {
  db: DB
  published: DB
  history: PublishEntry[]
  notifications: Notification[]
  session: Session
  saveState: SaveState
  undoDepth: number
  redoDepth: number
  // جلسة
  login: (handle: string, code: string) => { ok: boolean; msg: string }
  logout: () => void
  setRole: (accountId: string, role: string) => void
  // مساعدة
  toast: (msg: string, type?: 'ok' | 'err' | 'info') => void
  toasts: { id: string; msg: string; type: string }[]
  notify: (n: Partial<Notification> & { text: string }) => void
  markAllRead: () => void
  removeNotif: (id: string) => void
  // كيانات عامة
  addEntity: (kind: EntKind, partial?: any) => any
  updateEntity: (kind: EntKind, id: string, patch: any) => void
  deleteEntity: (kind: EntKind, id: string) => { refs: number; name: string }
  duplicateEntity: (kind: EntKind, id: string) => void
  toggleStatus: (kind: EntKind, id: string) => void
  // تحرير شجرة
  patchRoot: (kind: EntKind, id: string, cb: (root: Node) => Node, opts?: { noUndo?: boolean }) => void
  undo: () => void
  redo: () => void
  // إجراءات على مستوى DB
  setDB: (db: DB) => void
  updateDB: (fn: (db: DB) => DB) => void
  updateSettings: (patch: any) => void
  // نشر
  publish: (note?: string) => void
  publishSelected: (keys: string[]) => void
  rollback: (entryId: string) => void
  discardToPublished: () => void
  pendingCount: number
  // صلاحيات
  canEdit: boolean
  // متغيرات
  addVar: (name: string) => void
  removeVar: (id: string) => void
}

const Ctx = createContext<StoreCtx>(null as any)
export const useStore = () => useContext(Ctx)

let dbg = 0
export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef<PersistShape>()
  if (!initial.current) initial.current = loadPersist()
  const [shape, setShape] = useState<PersistShape>(initial.current)
  const shapeRef = useRef(shape)
  const [session, setSession] = useState<Session>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_sess') || '{}') } catch { return { loggedIn: false } }
  })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([])
  const undoRef = useRef<{ kind: EntKind; id: string; prevRoot: Node; nextRoot: Node }[]>([])
  const redoRef = useRef<typeof undoRef.current>([])
  const [undoDepth, setUndoDepth] = useState(0)
  const [redoDepth, setRedoDepth] = useState(0)
  const quotaWarned = useRef(false)
  const canEdit = session.role !== 'viewer'

  const setShapeAll = useCallback((s: PersistShape, opts?: { save?: boolean }) => {
    shapeRef.current = s
    setShape(s)
    // الحفظ المؤجل (debounced) — كان الخطأ القديم يستدعي الـ ref نفسه فينهار أي حفظ
    if (opts?.save !== false) persistDebounced_(s)
  }, [])

  const persistDebounced = useRef(0)
  function persistNow(s: PersistShape) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch (e) {
      // فشل الحفظ (غالبًا امتلاء حصة localStorage) — لا نبتلعه بصمت
      console.warn('persist fail', e)
      if (!quotaWarned.current) {
        quotaWarned.current = true
        toast('تعذّر الحفظ المحلي: مساحة التخزين ممتلئة — احذف وسائط كبيرة أو نشرات قديمة ثم أعد المحاولة', 'err')
      }
    }
  }
  function persistDebounced_(s: PersistShape) {
    clearTimeout(persistDebounced.current)
    persistDebounced.current = window.setTimeout(() => persistNow(s), 150)
  }
  // استماع لتحديثات من تبويبات أخرى (نشر من /admin ينعكس على /client)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const p = JSON.parse(e.newValue) as PersistShape
          if (p && p.published) {
            setShape((prev) => ({ ...p, notifications: p.notifications || prev.notifications }))
            shapeRef.current = p
          }
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const flashSave = () => {
    setSaveState('saving')
    setTimeout(() => setSaveState('saved'), 260)
  }

  // ---------- toasts ----------
  const toast = useCallback((msg: string, type: 'ok' | 'err' | 'info' = 'info') => {
    const id = uid('toast')
    setToasts((t) => [...t.slice(-2), { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])
  // حارس الصلاحيات: يمنع «العارض» من أي تعديل/نشر على مستوى المتجر كله
  const guardEdit = useCallback((): boolean => {
    if (session.role === 'viewer') { toast('أنت في وضع القراءة فقط — لا يمكن التعديل أو النشر', 'err'); return false }
    return true
  }, [session, toast])
  const notify = useCallback((n: Partial<Notification> & { text: string }) => {
    setShapeAll({ ...shapeRef.current, notifications: [{
      id: uid('not'), type: n.type || 'info', text: n.text, at: Date.now(), read: false, ref: n.ref,
    }, ...shapeRef.current.notifications] }, { save: false })
    setTimeout(() => persistNow(shapeRef.current), 60)
  }, [setShapeAll])

  // ---------- الجلسة ----------
  const login = useCallback((handle: string, code: string) => {
    const acc = shapeRef.current.db.settings.accounts.find((a) => a.handle === handle.trim())
    if (!acc) return { ok: false, msg: 'بيانات الدخول غير صحيحة' }
    if (acc.code !== code) return { ok: false, msg: 'رمز التحقق غير صحيح' }
    const s: Session = { loggedIn: true, accountId: acc.id, name: acc.name || acc.handle, role: acc.role }
    setSession(s)
    localStorage.setItem(STORAGE_KEY + '_sess', JSON.stringify(s))
    return { ok: true, msg: '' }
  }, [])
  const logout = useCallback(() => {
    setSession({ loggedIn: false })
    localStorage.removeItem(STORAGE_KEY + '_sess')
  }, [])
  const setRole = useCallback((accountId: string, role: string) => {
    const d = shapeRef.current.db
    const accounts = d.settings.accounts.map((a) => (a.id === accountId ? { ...a, role: role as Account['role'] } : a))
    setShapeAll({ ...shapeRef.current, db: { ...d, settings: { ...d.settings, accounts } } })
    if (session.accountId === accountId && session.loggedIn) {
      const ns = { ...session, role: role as any }
      setSession(ns); localStorage.setItem(STORAGE_KEY + '_sess', JSON.stringify(ns))
    }
  }, [setShapeAll, session])

  // ---------- كيانات ----------
  const kindName = (k: EntKind) => (k === 'pages' ? 'صفحة' : k === 'bars' ? 'شريط' : k === 'popups' ? 'نافذة منبثقة' : k === 'flows' ? 'تدفق' : 'مكوّن مكتبة')
  const defaultEntity = (k: EntKind): any => {
    const root = createNode('section', undefined); root.name = 'الجذر'
    if (k === 'pages') return { id: uid('p'), name: 'صفحة جديدة', path: normalizeSlug('صفحة-' + Math.floor(Math.random() * 900 + 100)), title: '', status: 'published', updatedAt: Date.now(), root }
    if (k === 'bars') return { id: uid('bar'), name: 'شريط جديد', type: 'top', scope: 'all', mode: 'fixed', foldable: true, defaultFolded: false, hidden: false, updatedAt: Date.now(), root }
    if (k === 'popups') return { id: uid('pop'), name: 'نافذة جديدة', size: 'sheet', closeMode: 'both', openAnim: 'slide-up', updatedAt: Date.now(), root }
    if (k === 'flows') return { id: uid('fl'), name: 'تدفق جديد', steps: [] }
    return { id: uid('lib'), name: 'مكوّن مخصص', cat: 'عام', updatedAt: Date.now(), root }
  }
  const addEntity = useCallback((k: EntKind, partial?: any) => {
    if (!guardEdit()) return null
    const ent = { ...defaultEntity(k), ...(partial || {}) }
    const arr = shapeRef.current.db[k] as any[]
    setShapeAll({ ...shapeRef.current, db: { ...shapeRef.current.db, [k]: [...arr, ent] } })
    flashSave()
    return ent
  }, [setShapeAll, guardEdit])

  const updateEntity = useCallback((k: EntKind, id: string, patch: any) => {
    if (!guardEdit()) return
    const arr = shapeRef.current.db[k] as any[]
    const next = arr.map((e) => (e.id === id ? { ...e, ...patch } : e))
    setShapeAll({ ...shapeRef.current, db: { ...shapeRef.current.db, [k]: next } })
  }, [setShapeAll, guardEdit])

  const deleteEntity = useCallback((k: EntKind, id: string) => {
    if (!guardEdit()) return { refs: 0, name: '' }
    const d = shapeRef.current.db
    const ent: any = (d[k] as any[]).find((e) => e.id === id)
    let refs = 0
    // حساب المراجع عبر الإجراءات
    const scan = (node: Node) => {
      for (const ev of Object.values(node.events || {})) for (const ac of ev || []) {
        if (ac.target && ac.target.id === id) refs++
        for (const sub of ac.children || []) if (sub.target && sub.target.id === id) refs++
        if (ac.showId === id) refs++
        if (ac.hideId === id) refs++
      }
      for (const c of node.children || []) scan(c)
    }
    for (const p of d.pages) scan(p.root)
    for (const b of d.bars) scan(b.root)
    for (const po of d.popups) scan(po.root)
    // مراجع خطوات التدفقات أيضًا
    for (const f of d.flows) for (const s of f.steps || []) if (s.target && s.target.id === id) refs++
    const arr = (d[k] as any[]).filter((e) => e.id !== id)
    setShapeAll({ ...shapeRef.current, db: { ...d, [k]: arr } })
    notify({ type: 'warn', text: `تم حذف ${kindName(k)} «${ent?.name || ''}»` + (refs ? ` مع ${refs} إجراء/مرجع أصبح مكسورًا.` : '.'), ref: { kind: 'entity', label: ent?.name } })
    return { refs, name: ent?.name || '' }
  }, [setShapeAll, notify, guardEdit])

  const duplicateEntity = useCallback((k: EntKind, id: string) => {
    if (!guardEdit()) return
    const d = shapeRef.current.db
    const ent: any = (d[k] as any[]).find((e) => e.id === id)
    if (!ent) return
    const copy = clone(ent)
    copy.id = uid(k === 'pages' ? 'p' : k === 'bars' ? 'bar' : k === 'popups' ? 'pop' : k === 'flows' ? 'fl' : 'lib')
    copy.name = ent.name + ' (نسخة)'
    copy.updatedAt = Date.now()
    if (copy.root) { copy.root.id = uid('root'); reIdTree(copy.root) }
    if (k === 'pages') { copy.path = normalizeSlug(copy.name); copy.status = 'draft' }
    if (k === 'bars') { copy.id = uid('bar'); copy.hidden = false }
    if (k === 'flows') copy.steps = (copy.steps || []).map((s: any) => ({ ...s, id: uid('a') }))
    setShapeAll({ ...shapeRef.current, db: { ...d, [k]: [...(d[k] as any[]), copy] } })
    toast(`تم تكرار ${kindName(k)} «${ent.name}»`, 'ok')
  }, [setShapeAll, toast, guardEdit])

  function reIdTree(n: Node) {
    n.id = uid(n.type)
    for (const c of n.children || []) reIdTree(c)
  }

  const toggleStatus = useCallback((k: EntKind, id: string) => {
    if (!guardEdit()) return
    const d = shapeRef.current.db
    if (k === 'pages') {
      const cur = d.pages.find((p) => p.id === id)
      if (cur?.status === 'draft') { toast('الصفحة مسودة — غيّر حالتها من «إعدادات الكيان» داخل المحرر', 'info'); return }
      const arr = d.pages.map((p) => (p.id === id ? { ...p, status: p.status === 'hidden' ? 'published' : 'hidden' as any, updatedAt: Date.now() } : p))
      setShapeAll({ ...shapeRef.current, db: { ...d, pages: arr } })
    } else if (k === 'bars') {
      const arr = d.bars.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b))
      setShapeAll({ ...shapeRef.current, db: { ...d, bars: arr } })
    }
  }, [setShapeAll, guardEdit, toast])

  // ---------- تحرير الشجرة ----------
  const patchRoot = useCallback((k: EntKind, id: string, cb: (root: Node) => Node, opts?: { noUndo?: boolean }) => {
    if (!guardEdit()) return
    const d = shapeRef.current.db
    const arr = (d[k] as any[]) as { id: string; root: Node }[]
    const idx = arr.findIndex((e) => e.id === id)
    if (idx < 0) return
    const entity = arr[idx]
    const newRoot = cb(entity.root)
    if (!newRoot) return // رفض تخريب الجذر (مثل حذفه)
    const undoSnapshot = opts?.noUndo ? null : { kind: k, id, prevRoot: clone(entity.root), nextRoot: clone(newRoot) }
    const nextArr = arr.map((e, i) => (i === idx ? { ...e, root: newRoot, updatedAt: Date.now() } : e))
    setShapeAll({ ...shapeRef.current, db: { ...d, [k]: nextArr } })
    if (undoSnapshot) {
      undoRef.current.push(undoSnapshot)
      redoRef.current = []
      if (undoRef.current.length > 40) undoRef.current.shift()
      setUndoDepth(undoRef.current.length)
      setRedoDepth(0)
    }
  }, [setShapeAll, guardEdit])

  const undo = useCallback(() => {
    const top = undoRef.current.pop()
    if (!top) return
    redoRef.current.push(top)
    setUndoDepth(undoRef.current.length); setRedoDepth(redoRef.current.length)
    const d = shapeRef.current.db
    const arr = (d[top.kind] as any[]) as { id: string; root: Node }[]
    const idx = arr.findIndex((e) => e.id === top.id)
    if (idx < 0) return
    const next = arr.map((e, i) => (i === idx ? { ...e, root: top.prevRoot, updatedAt: Date.now() } : e))
    setShapeAll({ ...shapeRef.current, db: { ...d, [top.kind]: next } })
  }, [setShapeAll])

  const redo = useCallback(() => {
    const top = redoRef.current.pop()
    if (!top) return
    undoRef.current.push(top)
    setUndoDepth(undoRef.current.length); setRedoDepth(redoRef.current.length)
    const d = shapeRef.current.db
    const arr = (d[top.kind] as any[]) as { id: string; root: Node }[]
    const idx = arr.findIndex((e) => e.id === top.id)
    if (idx < 0) return
    // الإعادة تستعيد الحالة «بعد» التعديل (nextRoot) وليس ما قبله
    const next = arr.map((e, i) => (i === idx ? { ...e, root: top.nextRoot, updatedAt: Date.now() } : e))
    setShapeAll({ ...shapeRef.current, db: { ...d, [top.kind]: next } })
  }, [setShapeAll])

  const setDB = useCallback((db: DB) => {
    if (!guardEdit()) return
    setShapeAll({ ...shapeRef.current, db })
  }, [setShapeAll, guardEdit])
  // تحديث وظيفي آمن: يقرأ أحدث نسخة من db (يمنع فقدان البيانات عند رفع عدة ملفات معًا)
  const updateDB = useCallback((fn: (db: DB) => DB) => {
    if (!guardEdit()) return
    setShapeAll({ ...shapeRef.current, db: fn(shapeRef.current.db) })
  }, [setShapeAll, guardEdit])
  const updateSettings = useCallback((patch: any) => {
    if (!guardEdit()) return
    const d = shapeRef.current.db
    setShapeAll({ ...shapeRef.current, db: { ...d, settings: { ...d.settings, ...patch } } })
  }, [setShapeAll, guardEdit])

  const markAllRead = useCallback(() => {
    setShapeAll({ ...shapeRef.current, notifications: shapeRef.current.notifications.map((n) => ({ ...n, read: true })) })
  }, [setShapeAll])
  const removeNotif = useCallback((id: string) => {
    setShapeAll({ ...shapeRef.current, notifications: shapeRef.current.notifications.filter((n) => n.id !== id) })
  }, [setShapeAll])

  // ---------- النشر ----------
  const pendingCount = useMemoPending()
  function useMemoPending() { return computePending(shape.db, shape.published).length }
  const publish = useCallback((note?: string) => {
    if (!guardEdit()) return
    const s = shapeRef.current
    const entry: PublishEntry = { id: uid('pub'), at: Date.now(), by: session.name || 'مدير', kind: 'publish', note: note || `نشر ${computePending(s.db, s.published).length} تغيير`, snap: clone(s.db) }
    const history = [entry, ...s.history].slice(0, 40)
    setShapeAll({ ...s, published: clone(s.db), history })
    notify({ type: 'success', text: `تم النشر بنجاح — ${entry.note}` })
  }, [setShapeAll, notify, session, guardEdit])

  // نشر جزئي حقيقي: تُنقل العناصر المحددة فقط (kind:id) من المسودة إلى النسخة المنشورة
  const publishSelected = useCallback((keys: string[]) => {
    if (!guardEdit()) return
    const s = shapeRef.current
    const kinds: EntKind[] = ['pages', 'bars', 'popups', 'flows', 'libs']
    const nextPub: DB = clone(s.published)
    let done = 0
    for (const key of keys) {
      const [k, id] = key.split(':')
      if (!kinds.includes(k as EntKind) || !id) continue
      const src = (s.db as any)[k] as any[]
      const ent = src.find((x: any) => x.id === id)
      const dst = (nextPub as any)[k] as any[]
      if (ent) {
        const i = dst.findIndex((x: any) => x.id === id)
        if (i >= 0) dst[i] = clone(ent)
        else dst.push(clone(ent))
      } else {
        (nextPub as any)[k] = dst.filter((x: any) => x.id !== id)
      }
      done++
    }
    if (!done) return
    const entry: PublishEntry = { id: uid('pub'), at: Date.now(), by: session.name || 'مدير', kind: 'publish', note: `نشر ${done} عنصرًا محددًا`, snap: clone(nextPub) }
    setShapeAll({ ...s, published: nextPub, history: [entry, ...s.history].slice(0, 40) })
    notify({ type: 'success', text: `تم نشر ${done} عنصرًا محددًا. باقي المسودات لم تُنشر بعد.` })
  }, [setShapeAll, notify, session, guardEdit])

  const rollback = useCallback((entryId: string) => {
    if (!guardEdit()) return
    const s = shapeRef.current
    const entry = s.history.find((h) => h.id === entryId)
    if (!entry) return
    const roll: PublishEntry = { id: uid('pub'), at: Date.now(), by: session.name || 'مدير', kind: 'rollback', note: `استرجاع نشرة «${entry.note}»`, snap: clone(entry.snap) }
    setShapeAll({ ...s, published: clone(entry.snap), db: clone(entry.snap), history: [roll, ...s.history].slice(0, 40) })
    notify({ type: 'warn', text: 'تم استرجاع النسخة، وأصبحت منشورة لدى العملاء فورًا.' })
  }, [setShapeAll, notify, session, guardEdit])

  const discardToPublished = useCallback(() => {
    if (!guardEdit()) return
    const s = shapeRef.current
    setShapeAll({ ...s, db: clone(s.published) })
    undoRef.current = []; redoRef.current = []
    setUndoDepth(0); setRedoDepth(0)
    notify({ type: 'info', text: 'تم تجاهل المسودات وإعادة الحالة إلى آخر نسخة منشورة.' })
  }, [setShapeAll, notify, guardEdit])

  const addVar = useCallback((name: string) => {
    if (!guardEdit()) return
    const d = shapeRef.current.db
    const v = { id: uid('v'), name, vtype: 'number' as const, def: 0, scope: 'session' as const }
    setShapeAll({ ...shapeRef.current, db: { ...d, variables: [...d.variables, v as any] } })
  }, [setShapeAll, guardEdit])
  const removeVar = useCallback((id: string) => {
    if (!guardEdit()) return
    const d = shapeRef.current.db
    setShapeAll({ ...shapeRef.current, db: { ...d, variables: d.variables.filter((v) => v.id !== id) } })
  }, [setShapeAll, guardEdit])

  const value: StoreCtx = {
    db: shape.db, published: shape.published, history: shape.history, notifications: shape.notifications,
    session, saveState, undoDepth, redoDepth,
    login, logout, setRole,
    toast, toasts, notify, markAllRead, removeNotif,
    addEntity, updateEntity, deleteEntity, duplicateEntity, toggleStatus,
    patchRoot, undo, redo, setDB, updateDB, updateSettings,
    publish, publishSelected, rollback, discardToPublished, pendingCount,
    addVar, removeVar, canEdit,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// ---------- حساب التغييرات المعلقة (ديف بين المسودة والمنشورة) ----------
export function computePending(db: DB, pub: DB): { kind: EntKind; id: string; name: string; ch: 'add' | 'edit' | 'del' }[] {
  const out: { kind: EntKind; id: string; name: string; ch: 'add' | 'edit' | 'del' }[] = []
  const kinds: EntKind[] = ['pages', 'bars', 'popups', 'flows', 'libs']
  for (const k of kinds) {
    const dArr = (db as any)[k] as { id: string; name: string }[]
    const pArr = (pub as any)[k] as { id: string; name: string }[]
    const pids = new Set(pArr.map((x) => x.id))
    for (const e of dArr) {
      const pe = pArr.find((x) => x.id === e.id)
      if (!pe) out.push({ kind: k, id: e.id, name: e.name, ch: 'add' })
      else if (JSON.stringify(pe) !== JSON.stringify(e)) out.push({ kind: k, id: e.id, name: e.name, ch: 'edit' })
    }
    for (const pe of pArr) if (!dArr.find((x) => x.id === pe.id)) out.push({ kind: k, id: pe.id, name: pe.name, ch: 'del' })
  }
  return out
}

export { NTYPE_LABEL, accepts, anyNode, countNodes }
