import { useState } from 'react'
import type { Page, Bar, Popup } from '../types'
import { useStore } from '../lib/store'
import { SubTopBar, Empty, Modal, Field, TextInput, Seg, Select, Toggle, Confirm, StatusDot } from './uikit'
import { Icon } from '../lib/icons'
import { normalizeSlug } from '../lib/util'

function statusMeta(s: string) {
  if (s === 'published') return { c: '#059669', t: 'منشورة' }
  if (s === 'hidden') return { c: '#f59e0b', t: 'مخفية' }
  return { c: '#94a3b8', t: 'مسودة' }
}

export function PagesList({ back, openEditor }: { back: () => void; openEditor: (id: string) => void }) {
  const store = useStore()
  const db = store.db
  const [q, setQ] = useState('')
  const [flt, setFlt] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  const list = db.pages.filter((p) => p.name.includes(q) && (flt === 'all' || p.status === flt))

  const createPage = (name: string, path: string) => {
    if (db.pages.some((p) => p.path === path)) { store.toast('هذا المسار مستخدم بالفعل', 'err'); return false }
    const e = store.addEntity('pages', { name, path, title: name, status: 'published' })
    if (!e) return false
    openEditor(e.id); return true
  }

  return (
    <div className="flex h-full flex-col bg-sky-50/50">
      <SubTopBar back={back} title="الصفحات" right={<button onClick={() => setCreateOpen(true)} className="btn-primary flex h-10 items-center gap-1 rounded-xl px-3 tap"><Icon name="plus" size={16} />صفحة</button>} />
      <div className="px-3 py-2">
        <div className="relative"><input className="field !rounded-full" placeholder="بحث بالاسم…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-300"><Icon name="search" size={17} /></span></div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">{[['all','الكل'],['published','منشورة'],['draft','مسودة'],['hidden','مخفية']].map(([v, l]) => <button key={v} onClick={() => setFlt(v)} className={'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold tap ' + (flt === v ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200')}>{l}</button>)}</div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6">
        {list.length === 0 && <Empty title="لا توجد صفحات" desc="أنشئ أول صفحة لتظهر على /client بعد النشر." action={<button onClick={() => setCreateOpen(true)} className="btn-primary rounded-xl px-5 py-3 tap">+ إنشاء أول صفحة</button>} />}
        {list.map((p) => <PageCard key={p.id} p={p} onOpen={() => openEditor(p.id)} onToggle={() => store.toggleStatus('pages', p.id)} onDup={() => store.duplicateEntity('pages', p.id)} onDel={() => setDelId(p.id)} />)}
      </div>
      <CreatePageSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createPage} usedPaths={db.pages.map((p) => p.path)} />
      <Confirm open={!!delId} onClose={() => setDelId(null)} onYes={() => { if (delId) store.deleteEntity('pages', delId); setDelId(null) }} danger title="حذف الصفحة نهائيًا؟" body="سيؤدي الحذف إلى تعطيل كل الأزرار والروابط التي تشير إلى هذه الصفحة (مرجع مكسور)." />
    </div>
  )
}

function PageCard({ p, onOpen, onToggle, onDup, onDel }: { p: Page; onOpen: () => void; onToggle: () => void; onDup: () => void; onDel: () => void }) {
  const st = statusMeta(p.status)
  const [menu, setMenu] = useState(false)
  const n = p.root?.children?.length || 0
  return (
    <div className="card-sky soft-sm overflow-hidden">
      <button onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg">{n ? '📄' : '🗒'}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="truncate text-[14.5px] font-bold text-slate-800">{p.name}</span><span className="h-1.5 w-1.5 rounded-full" style={{ background: st.c }} /></div>
          <div className="mt-0.5 text-[11.5px] text-slate-400" dir="ltr">/client{p.path}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400"><span>{st.t}</span><span>·</span><span>{n} عنصر</span></div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-sky-50 px-2 py-1">
        <button onClick={onOpen} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-sky-600 tap">✏️ فتح للتحرير</button>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="rounded-lg px-2 py-1.5 text-slate-400 tap"><Icon name="more" /></button>
          {menu && <><div className="fixed inset-0 z-20" onClick={() => setMenu(false)} /><div className="absolute bottom-8 end-0 z-30 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
            <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-[12.5px] text-slate-700 tap hover:bg-sky-50"><Icon name="eye" size={15} />{p.status === 'hidden' ? 'إظهار' : 'إخفاء'}</button>
            <button onClick={onDup} className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-[12.5px] text-slate-700 tap hover:bg-sky-50"><Icon name="layers" size={15} />تكرار</button>
            <button onClick={() => { onDel(); setMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-[12.5px] text-rose-600 tap hover:bg-rose-50"><Icon name="trash" size={15} />حذف</button>
          </div></>}
        </div>
      </div>
    </div>
  )
}

function CreatePageSheet({ open, onClose, onCreate, usedPaths }: { open: boolean; onClose: () => void; onCreate: (n: string, path: string) => boolean; usedPaths: string[] }) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const save = () => {
    if (!name.trim()) return
    onCreate(name.trim(), normalizeSlug(path || name) || '/new')
  }
  return (
    <Modal open={open} onClose={onClose} title="صفحة جديدة">
      <div className="space-y-3">
        <Field label="الاسم الداخلي"><TextInput autoFocus value={name} onChange={(e: any) => { setName(e.target.value); if (!path) setPath(normalizeSlug(e.target.value)) }} placeholder="مثال: الرئيسية" /></Field>
        <Field label="المسار داخل /client"><div className="flex items-center gap-1"><span className="text-slate-400 text-sm">/client</span><TextInput dir="ltr" value={path} onChange={(e: any) => setPath(e.target.value)} /></div></Field>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onClose} className="rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 tap">إلغاء</button>
          <button onClick={save} className="btn-primary rounded-xl py-3 font-semibold tap">إنشاء وفتح</button>
        </div>
      </div>
    </Modal>
  )
}

// ---------- الأشرطة ----------
export function BarsList({ back, openEditor, goEditType }: { back: () => void; openEditor: (id: string) => void; goEditType: () => void }) {
  const store = useStore()
  const db = store.db
  const [createOpen, setCreateOpen] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  return (
    <div className="flex h-full flex-col bg-sky-50/50">
      <SubTopBar back={back} title="الأشرطة" right={<button onClick={() => setCreateOpen(true)} className="btn-primary flex h-10 items-center gap-1 rounded-xl px-3 tap"><Icon name="plus" size={16} />شريط</button>} />
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6 pt-2">
        {db.bars.length === 0 && <Empty title="لا أشرطة بعد" desc="الأشرطة (علوي/سفلي) تُعرض في كل الصفحات أو صفحات محددة." action={<button onClick={() => setCreateOpen(true)} className="btn-primary rounded-xl px-5 py-3 tap">+ شريط جديد</button>} />}
        {db.bars.map((b) => {
          const typeMeta = { top: { l: 'علوي', i: '🔝' }, bottom: { l: 'سفلي', i: '🔻' }, nav: { l: 'تنقل', i: '🧭' }, side: { l: 'جانبي', i: '↔️' } } as any
          const tm = typeMeta[b.type]
          return (
            <div key={b.id} className="card-sky soft-sm p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-lg">{tm.i}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-bold text-slate-800">{b.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400"><span>شريط {tm.l}</span><span>·</span><span>{b.scope === 'all' ? 'كل الصفحات' : `${(b.scope as string[]).length} صفحات`}</span><span>·</span><span>{b.foldable ? 'قابل للطي' : 'ثابت'}</span></div>
                </div>
                <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (b.hidden ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{b.hidden ? 'مخفي' : 'ظاهر'}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-sky-50 pt-2">
                <button onClick={() => openEditor(b.id)} className="flex-1 rounded-lg bg-sky-50 py-2 text-[12.5px] font-semibold text-sky-700 tap">تحرير المحتوى</button>
                <button onClick={() => store.toggleStatus('bars', b.id)} className="rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600 tap">{b.hidden ? 'إظهار' : 'إخفاء'}</button>
                <button onClick={() => store.duplicateEntity('bars', b.id)} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 tap"><Icon name="copy" size={15} /></button>
                <button onClick={() => setDelId(b.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-rose-500 tap"><Icon name="trash" size={15} /></button>
              </div>
            </div>
          )
        })}
      </div>
      <CreateBarSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(e) => openEditor(e.id)} />
      <Confirm open={!!delId} onClose={() => setDelId(null)} onYes={() => { if (delId) store.deleteEntity('bars', delId); setDelId(null) }} danger title="حذف الشريط؟" body="سيُحذف مع محتواه وتصبح الإجراءات المستهدفة له مرجعًا مكسورًا." />
    </div>
  )
}

function CreateBarSheet({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (e: any) => void }) {
  const store = useStore()
  const [name, setName] = useState('شريط جديد')
  const [type, setType] = useState('top')
  const [mode, setMode] = useState('fixed')
  const [foldable, setFoldable] = useState(true)
  const [scope, setScope] = useState('all')
  const save = () => {
    const e = store.addEntity('bars', { name, type, mode, foldable, defaultFolded: false, scope: scope === 'all' ? 'all' : [], hidden: false })
    if (e) onCreate(e)
  }
  return (
    <Modal open={open} onClose={onClose} title="شريط جديد">
      <div className="space-y-3">
        <Field label="الاسم"><TextInput value={name} onChange={(e: any) => setName(e.target.value)} /></Field>
        <Field label="النوع"><Seg value={type} onChange={setType} options={[{value:'top',label:'علوي'},{value:'bottom',label:'سفلي'},{value:'nav',label:'تنقل'}]} /></Field>
        <Field label="الظهور"><Seg value={scope} onChange={setScope} options={[{value:'all',label:'كل الصفحات'},{value:'later',label:'أحددها لاحقًا'}]} /></Field>
        <Field label="قابل للطي"><Toggle on={foldable} onChange={setFoldable} /></Field>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onClose} className="rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 tap">إلغاء</button>
          <button onClick={save} className="btn-primary rounded-xl py-3 font-semibold tap">إنشاء وتحرير</button>
        </div>
      </div>
    </Modal>
  )
}

// ---------- النوافذ المنبثقة ----------
export function PopupsList({ back, openEditor }: { back: () => void; openEditor: (id: string) => void }) {
  const store = useStore()
  const db = store.db
  const [delId, setDelId] = useState<string | null>(null)
  const newOne = () => { const e = store.addEntity('popups', {}); if (e) openEditor(e.id) }
  return (
    <div className="flex h-full flex-col bg-sky-50/50">
      <SubTopBar back={back} title="النوافذ المنبثقة" right={<button onClick={newOne} className="btn-primary flex h-10 items-center gap-1 rounded-xl px-3 tap"><Icon name="plus" size={16} />نافذة</button>} />
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6 pt-2">
        {db.popups.length === 0 && <Empty title="لا نوافذ منبثقة بعد" desc="أنشئ نافذة ثم اربطها بزر عبر إجراء «فتح نافذة»." action={<button onClick={newOne} className="btn-primary rounded-xl px-5 py-3 tap">+ نافذة جديدة</button>} />}
        {db.popups.map((p) => {
          const n = p.root?.children?.length || 0
          return (
            <div key={p.id} className="card-sky soft-sm p-3">
              <button onClick={() => openEditor(p.id)} className="flex w-full items-center gap-3 text-start">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-lg">💬</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-bold text-slate-800">{p.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{n} مكوّن · الإغلاق: {p.closeMode === 'both' ? 'زر وخارجي' : p.closeMode === 'button' ? 'زر' : 'خارجي'}</div>
                </div>
                <span className="text-sky-300"><Icon name="chevron-left" size={18} /></span>
              </button>
              <div className="mt-2 flex gap-2 border-t border-sky-50 pt-2">
                <button onClick={() => openEditor(p.id)} className="flex-1 rounded-lg bg-sky-50 py-2 text-[12.5px] font-semibold text-sky-700 tap">تحرير</button>
                <button onClick={() => store.duplicateEntity('popups', p.id)} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500 tap"><Icon name="copy" size={15} /></button>
                <button onClick={() => setDelId(p.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-rose-500 tap"><Icon name="trash" size={15} /></button>
              </div>
            </div>
          )
        })}
      </div>
      <Confirm open={!!delId} onClose={() => setDelId(null)} onYes={() => { if (delId) store.deleteEntity('popups', delId); setDelId(null) }} danger title="حذف النافذة؟" body="ستصبح كل الأزرار التي تفتحها مرجعًا مكسورًا." />
    </div>
  )
}
