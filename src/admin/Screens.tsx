import { useMemo, useRef, useState } from 'react'
import type { DB } from '../types'
import { useStore, computePending } from '../lib/store'
import { SubTopBar, Empty, Confirm, Modal, Field, TextInput, Seg, Toggle, Chip } from './uikit'
import { Icon } from '../lib/icons'
import { uid, normalizeSlug } from '../lib/util'
import { actionLabel, ActionModal } from './ActionModal'
import { findBroken, dropBrokenAction } from '../lib/broken'

// ---------------- لوحة التحكم الرئيسية ----------------
export function Dashboard({ go }: { go: (v: string) => void }) {
  const store = useStore()
  const db = store.db
  const stats = [
    { k: 'pages', l: 'الصفحات', i: '📄', n: db.pages.length },
    { k: 'bars', l: 'الأشرطة', i: '🧭', n: db.bars.length },
    { k: 'popups', l: 'النوافذ', i: '💬', n: db.popups.length },
    { k: 'libs', l: 'مكوّنات مخصصة', i: '🧩', n: db.libs.length },
    { k: 'flows', l: 'التدفقات', i: '🔁', n: db.flows.length },
    { k: 'media', l: 'الوسائط', i: '🖼', n: db.media.length },
  ]
  const homePage = db.settings.homePageId ? db.pages.find((p) => p.id === db.settings.homePageId) : db.pages.find((p) => p.status === 'published')
  const publishedPages = db.pages.filter((p) => p.status === 'published').length
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-sky-50/60 no-scrollbar">
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-l from-sky-500 to-sky-600 p-4 text-white soft">
          <div className="text-[13px] opacity-90">{db.settings.siteName}</div>
          <div className="mt-1 text-[20px] font-extrabold">مرحبًا {store.session.name} 👋</div>
          <div className="mt-2 text-[12px] opacity-95">{store.pendingCount > 0 ? `${store.pendingCount} تغيير بانتظار النشر — أعدها جاهزة للعملاء.` : 'كل التغييرات منشورة.'}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 p-4">
        {stats.map((s) => <button key={s.k} onClick={() => go(s.k)} className="card-sky soft-sm tap flex items-center gap-2.5 p-3 text-start">
          <span className="text-2xl">{s.i}</span>
          <span><span className="block text-[16px] font-extrabold text-slate-800">{s.n}</span><span className="text-[11px] text-slate-500">{s.l}</span></span>
        </button>)}
      </div>
      <div className="px-4">
        <div className="mb-2 text-[13px] font-bold text-slate-500">إجراءات سريعة</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => go('newpage')} className="btn-primary flex shrink-0 items-center gap-1 rounded-xl px-4 py-3 tap"><Icon name="plus" size={15} /> صفحة جديدة</button>
          <button onClick={() => go('publish')} className="flex shrink-0 items-center gap-1 rounded-xl bg-white border border-sky-200 px-4 py-3 font-semibold text-sky-700 tap"><Icon name="send" size={15} /> النشر</button>
          <button onClick={() => go('preview')} className="flex shrink-0 items-center gap-1 rounded-xl bg-white border border-sky-200 px-4 py-3 font-semibold text-sky-700 tap"><Icon name="eye" size={15} /> المعاينة</button>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 text-[13px] font-bold text-slate-500">الصفحة الرئيسية الحالية</div>
        {homePage ? <button onClick={() => go('edit:' + homePage.id + ':pages')} className="card-sky soft-sm flex w-full items-center justify-between p-3 tap text-start">
          <div><div className="text-[14px] font-bold">{homePage.name}</div><div className="text-[11.5px] text-slate-400" dir="ltr">/client{homePage.path}</div></div>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10.5px] font-bold text-emerald-700">منشورة</span>
        </button> : <div className="rounded-xl bg-white border border-dashed p-3 text-[13px] text-slate-400">لم تُحدد صفحة رئيسية بعد.</div>}
        <p className="mt-3 text-center text-[11px] text-slate-400">{publishedPages} صفحة منشورة · شاهد النتيجة النهائية على /client بعد النشر</p>
      </div>
    </div>
  )
}

// ---------------- الإعدادات ----------------
export function Settings({ back, openPage }: { back: () => void; openPage: (id: string) => void }) {
  const store = useStore()
  const db = store.db
  const S = db.settings
  const [tab, setTab] = useState('general')
  const up = (p: any) => store.updateSettings(p)
  const setC = (k: string, v: string) => up({ [k]: v })
  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      <SubTopBar back={back} title="إعدادات الموقع" />
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2">{[['general','عام'],['colors','ألوان الموقع'],['home','الرئيسية'],['accounts','الحسابات'],['routes','المسارات'],['vars','المتغيرات']].map(([id, l]) => <button key={id} onClick={() => setTab(id)} className={'shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ' + (tab === id ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border')}>{l}</button>)}</div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-8">
        {tab === 'general' && <>
          <Field label="اسم الموقع"><TextInput value={S.siteName} onChange={(e: any) => setC('siteName', e.target.value)} /></Field>
          <Field label="الوصف"><textarea className="field" rows={2} value={S.siteDesc} onChange={(e: any) => setC('siteDesc', e.target.value)} /></Field>
          <Field label="اللغة / الاتجاه"><Seg value={S.dir} onChange={(v) => { up({ dir: v, lang: v === 'rtl' ? 'ar' : 'en' }) }} options={[{value:'rtl',label:'عربي RTL'},{value:'ltr',label:'إنجليزي LTR'}]} /></Field>
          <div className="rounded-2xl bg-white border p-3"><div className="mb-2 text-[13px] font-bold text-slate-600">ألوان الهوية (تظهر في /client وبعض الخيارات)</div>
            <div className="space-y-2">
              {[['primary','اللون الأساسي'],['text','لون النص'],['bg','خلفية الصفحة'],['card','خلفية البطاقات'],['muted','النص الثانوي']].map(([k, l]) => <div key={k} className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">{l}</span><input type="color" value={hex(S[k])||'#0ea5e9'} onChange={(e)=>setC(k, e.target.value)} className="h-8 w-12 rounded-lg border p-0.5" /></div>)}
            </div>
          </div>
        </>}
        {tab === 'colors' && <ColorsTab db={db} up={up} />}
        {tab === 'home' && <>
          <Field label="الصفحة الرئيسية لـ /client"><Select2 value={S.homePageId || ''} onChange={(v) => up({ homePageId: v })} options={[{value:'',label:'— بدون'}, ...db.pages.map((p) => ({ value: p.id, label: p.name + (p.status==='published' ? '' : ' (غير منشورة)') }))]} /></Field>
          <p className="rounded-xl bg-sky-50 p-3 text-[12px] text-sky-700">عند فتح /client بدون مسار تُعرض هذه الصفحة. الصفحات غير المنشورة لا تظهر.</p>
        </>}
        {tab === 'accounts' && <AccountsTab />}
        {tab === 'routes' && <RedirectTab />}
        {tab === 'vars' && <VarsTab />}
      </div>
    </div>
  )
}
function hex(v: string) { if (!v || v.startsWith('linear') ) return undefined; return v }
function Select2({ value, onChange, options }: any) {
  return <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
}

function ColorsTab({ db, up }: { db: DB; up: (p: any) => void }) {
  const store = useStore()
  const [c, setC] = useState('#0ea5e9')
  const [name, setName] = useState('')
  return <div>
    <div className="flex gap-2"><input type="color" value={c} onChange={(e) => setC(e.target.value)} className="h-11 w-14 rounded-xl border p-1" /><TextInput value={name} onChange={(e: any) => setName(e.target.value)} placeholder="اسم اللون" /><button onClick={() => { if (name.trim()) { up({ siteColors: [...db.settings.siteColors, { name, value: c }] }); setName('') } }} className="btn-primary rounded-xl px-3 tap">+</button></div>
    <div className="mt-3 space-y-2">{db.settings.siteColors.map((sc) => <div key={sc.name + sc.value} className="flex items-center gap-3 rounded-xl bg-white border p-2"><span className="h-8 w-8 rounded-lg" style={{ background: sc.value }} /><span className="flex-1 text-[13px]">{sc.name}</span><span className="text-[11px] text-slate-400" dir="ltr">{sc.value}</span><button onClick={() => up({ siteColors: db.settings.siteColors.filter((x) => x.value !== sc.value) })} className="text-rose-400 tap"><Icon name="trash" size={15} /></button></div>)}</div>
  </div>
}

function AccountsTab() {
  const store = useStore()
  const db = store.db
  const [newH, setNewH] = useState(''); const [newC, setNewC] = useState(''); const [role, setRole] = useState('editor')
  const add = () => { if (!newH.trim()) return; store.setDB({ ...db, settings: { ...db.settings, accounts: [...db.settings.accounts, { id: uid('acc'), handle: newH.trim(), code: newC || '1234', role }] } }); setNewH(''); setNewC('') }
  return <div>
    <div className="rounded-2xl bg-white border p-3 space-y-2">
      <Field label="معرّف الحساب"><TextInput value={newH} onChange={(e: any) => setNewH(e.target.value)} placeholder="admin" /></Field>
      <Field label="رمز التحقق"><TextInput dir="ltr" value={newC} onChange={(e: any) => setNewC(e.target.value)} placeholder="1234" /></Field>
      <Field label="الدور"><Seg value={role} onChange={setRole} options={[{value:'owner',label:'مالك'},{value:'editor',label:'محرر'},{value:'viewer',label:'عارض'}]} /></Field>
      <button onClick={add} className="btn-primary w-full rounded-xl py-2.5 tap">+ إضافة حساب</button>
    </div>
    <div className="mt-3 space-y-2">{db.settings.accounts.map((a) => <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white border p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold">{(a.name || a.handle)[0]}</div>
      <div className="flex-1"><div className="text-[13.5px] font-semibold">{a.name || a.handle}</div><div className="text-[11px] text-slate-400" dir="ltr">@{a.handle}</div></div>
      <select className="rounded-lg border px-2 py-1.5 text-[12px]" value={a.role} onChange={(e) => store.setRole(a.id, e.target.value)}>{[{v:'owner',l:'مالك'},{v:'editor',l:'محرر'},{v:'viewer',l:'عارض'}].map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select>
    </div>)}</div>
  </div>
}

// ---------------- النشر ----------------
export function PublishScreen({ back }: { back: () => void }) {
  const store = useStore()
  const db = store.db
  const broken = useMemo(() => findBroken(db), [db])
  const changes = useMemo(() => computePending(db, store.published), [db, store.published])
  const [confirmAll, setConfirmAll] = useState(false)
  const [confirmSel, setConfirmSel] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [rollId, setRollId] = useState<string | null>(null)
  const kindL: any = { pages: 'صفحة', bars: 'شريط', popups: 'نافذة', flows: 'تدفق', libs: 'مكوّن' }
  const chT: any = { add: 'إضافة', edit: 'تعديل', del: 'حذف' }
  const toggleSel = (k: string, id: string) => { const key = k + ':' + id; setSel((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key])) }
  const publishSel = () => {
    const kSel = sel.map((x) => x.split(':')).filter(([k, id]) => db[k as keyof DB]).map(([k, id]) => { const e = (db as any)[k as any].find((x: any) => x.id === id); return { kind: k, id, name: e?.name || '', ch: 'edit' as const } })
    store.notify({ type: 'info', text: `تم نشر ${kSel.length} عناصر محددة فقط (باقي التغييرات تبقى مسودة).` })
    store.publish(`نشر ${kSel.length} عناصر محددة`)
    setSel([])
  }
  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      <SubTopBar back={back} title="النشر والحفظ" />
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6">
        <div className="rounded-2xl bg-white border p-3">
          <div className="flex items-center justify-between"><span className="text-[13.5px] font-bold text-slate-700">تغييرات بانتظار النشر</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{changes.length}</span></div>
          {changes.length === 0 ? <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-center text-[12.5px] text-emerald-700">✓ لا توجد تغييرات — كل شيء منشور.</p> : <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">{changes.map((c) => <div key={c.kind + c.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2">
            <input type="checkbox" checked={sel.includes(c.kind + ':' + c.id)} onChange={() => toggleSel(c.kind, c.id)} className="h-4 w-4 accent-sky-500" />
            <span className="flex flex-1 items-center gap-1.5 text-[12.5px]"><span className={'rounded px-1.5 py-0.5 text-[10px] font-bold ' + (c.ch === 'add' ? 'bg-emerald-100 text-emerald-700' : c.ch === 'del' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700')}>{chT[c.ch]}</span>{c.name}</span>
            <span className="text-[10.5px] text-slate-400">{kindL[c.kind]}</span>
          </div>)}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setConfirmAll(true)} disabled={changes.length === 0} className="btn-primary rounded-xl py-3.5 font-bold disabled:opacity-40 tap">📤 نشر كل التغييرات</button>
          <button onClick={() => setConfirmSel(true)} disabled={sel.length === 0} className="rounded-xl bg-white border py-3.5 font-semibold text-sky-700 disabled:opacity-40 tap">نشر المحدد ({sel.length})</button>
          <button onClick={() => store.discardToPublished()} disabled={changes.length === 0} className="col-span-2 rounded-xl bg-white border py-3.5 font-semibold text-slate-500 disabled:opacity-40 tap">↩ تجاهل كل المسودات (عودة لآخر منشور)</button>
        </div>
        {broken.length > 0 && <p className="rounded-xl bg-rose-50 p-3 text-[12px] leading-relaxed text-rose-700">⚠ يوجد {broken.length} مرجع مكسور. يُنصح بإصلاحها قبل النشر أو ستعمل الإجراءات المكسورة معطّلة لدى العميل. <b onClick={() => window.dispatchEvent(new CustomEvent('cms:gobroken'))} className="underline">عرض القائمة</b></p>}
        <p className="rounded-xl bg-sky-50 p-3 text-[12px] text-sky-700">بعد النشر يظهر كل شيء فورًا على /client لدى عملائك. كل نشرة تُحفظ في السجل وتُتيح الاسترجاع.</p>
        <div className="rounded-2xl bg-white border overflow-hidden">
          <div className="px-3 py-2.5 text-[13px] font-bold text-slate-700">سجل النشر</div>
          {store.history.length === 0 && <p className="px-3 pb-3 text-[12px] text-slate-400">لا نشرات بعد.</p>}
          {store.history.map((h) => <div key={h.id} className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5">
            <span className={'flex h-9 w-9 items-center justify-center rounded-xl ' + (h.kind === 'publish' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600')}><Icon name={h.kind === 'publish' ? 'check' : 'undo'} size={16} /></span>
            <div className="flex-1"><div className="text-[12.5px] font-semibold text-slate-700">{h.note}</div><div className="text-[10.5px] text-slate-400">بواسطة {h.by} · {new Date(h.at).toLocaleString('ar')}</div></div>
            <button onClick={() => setRollId(h.id)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 tap">استرجاع</button>
          </div>)}
        </div>
      </div>
      <Confirm open={confirmAll} onClose={() => setConfirmAll(false)} onYes={() => store.publish()} title="نشر كل التغييرات؟" body={<span>سيصبح {changes.length} تغييرًا مرئيًا لعملائك على /client فورًا.</span>} />
      <Confirm open={confirmSel} onClose={() => setConfirmSel(false)} onYes={publishSel} title="نشر المحدد؟" body={<span>سيُنشر {sel.length} من العناصر المحددة فقط، وتبقى بقية المسودات دون نشر.</span>} />
      <Confirm open={!!rollId} onClose={() => setRollId(null)} onYes={() => { if (rollId) store.rollback(rollId); setRollId(null) }} title="استرجاع هذه النشرة؟" body="ستعود النسخة إلى هذه الحالة لدى العملاء، وتُحفظ عملية الاسترجاع في السجل." />
    </div>
  )
}

// ---------------- التدفقات ----------------
export function FlowsScreen({ back }: { back: () => void }) {
  const store = useStore()
  const db = store.db
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = db.flows.find((f) => f.id === editingId)
  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      <SubTopBar back={back} title="التدفقات والسلوكيات" right={<button onClick={() => { const e = store.addEntity('flows', {}); setEditingId(e.id) }} className="btn-primary flex h-10 items-center gap-1 rounded-xl px-3 tap"><Icon name="plus" size={15} />تدفق</button>} />
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6 pt-2">
        {db.flows.length === 0 && <Empty title="لا تدفقات بعد" desc="التدفق سلسلة إجراءات تُنفَّذ بالتتابع عند استدعائه من زر." />}
        {db.flows.map((f) => <div key={f.id} className="card-sky soft-sm p-3">
          <button onClick={() => setEditingId(f.id)} className="flex w-full items-center gap-3 text-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Icon name="flow" size={20} /></span>
            <div className="flex-1"><div className="text-[14px] font-bold">{f.name}</div><div className="text-[11.5px] text-slate-400">{f.steps.length} خطوة · {f.desc || '—'}</div></div>
          </button>
          <button onClick={() => { if (confirm(`حذف التدفق «${f.name}»؟ ستتحول الإجراءات المستدعية له إلى مراجع مكسورة`)) store.deleteEntity('flows', f.id) }} className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-600 tap">حذف</button>
        </div>)}
      </div>
      {editing && <FlowEditor id={editing.id} onClose={() => setEditingId(null)} />}
    </div>
  )
}

function FlowEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore()
  const db = store.db
  const f = db.flows.find((x) => x.id === id)!
  const [name, setName] = useState(f.name)
  const [desc, setDesc] = useState(f.desc || '')
  const [addOpen, setAddOpen] = useState(false)
  const up = (steps: any[]) => store.updateEntity('flows', id, { name, desc, steps })
  const move = (i: number, dir: number) => { const a = f.steps.slice(); const j = i + dir; if (j < 0 || j >= a.length) return; const [x] = a.splice(i, 1); a.splice(j, 0, x); up(a) }
  const saveStep = (s: any) => { up([...f.steps, { id: uid('a'), ...s }]) }
  return (
    <Modal open onClose={onClose} title="محرر التدفق">
      <div className="space-y-3">
        <Field label="الاسم"><TextInput value={name} onChange={(e: any) => setName(e.target.value)} /></Field>
        <Field label="وصف"><TextInput value={desc} onChange={(e: any) => setDesc(e.target.value)} /></Field>
        <div className="text-[12px] font-bold text-slate-500">الخطوات ({f.steps.length})</div>
        <div className="space-y-1.5">{f.steps.map((s, i) => <div key={s.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">{i + 1}</span>
          <span className="flex-1 text-[12.5px] text-slate-700">{actionLabel(s)}</span>
          <button onClick={() => move(i, -1)} className="text-slate-400 tap"><Icon name="arrow-up" size={14} /></button>
          <button onClick={() => move(i, 1)} className="text-slate-400 tap"><Icon name="arrow-down" size={14} /></button>
          <button onClick={() => up(f.steps.filter((x) => x.id !== s.id))} className="text-rose-400 tap"><Icon name="trash" size={14} /></button>
        </div>)}
        {f.steps.length === 0 && <div className="rounded-xl border border-dashed p-3 text-center text-[12px] text-slate-400">لا خطوات بعد.</div>}</div>
        <button onClick={() => setAddOpen(true)} className="btn-ghost w-full rounded-xl py-3 tap">+ إضافة خطوة</button>
      </div>
      <ActionModal open={addOpen} onClose={() => setAddOpen(false)} doc={db} onSave={saveStep} />
    </Modal>
  )
}

// ---------------- المكونات المخصصة ----------------
export function LibsScreen({ back, edit }: { back: () => void; edit: (id: string) => void }) {
  const store = useStore()
  const db = store.db
  const usedCount = (id: string) => countLibUses(db, id)
  const [dl, setDl] = useState<string | null>(null)
  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      <SubTopBar back={back} title="مكتبة المكونات" right={<button onClick={() => { const e = store.addEntity('libs', { name: 'مكوّن مخصص' + (db.libs.length + 1) }); edit(e.id) }} className="btn-primary flex h-10 items-center gap-1 rounded-xl px-3 tap"><Icon name="plus" size={15} />مكوّن</button>} />
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6 pt-2">
        {db.libs.length === 0 && <Empty title="لا مكونات مخصصة بعد" desc="احفظ أي مكوّن (بأطفاله) كقالب قابل لإعادة الاستخدام، أو أنشئ واحدًا هنا." action={<button onClick={() => { const e = store.addEntity('libs', { name: 'مكوّن مخصص 1' }); edit(e.id) }} className="btn-primary rounded-xl px-5 py-3 tap">إنشاء أول مكوّن</button>} />}
        {db.libs.map((l) => <div key={l.id} className="card-sky soft-sm p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Icon name="layers" size={20} /></span>
            <div className="flex-1"><div className="text-[14px] font-bold">{l.name}</div><div className="text-[11.5px] text-slate-400">استُخدم {usedCount(l.id)} مرة · تصنيف: {l.cat || 'عام'}</div></div>
          </div>
          <div className="mt-2 flex gap-2 border-t border-sky-50 pt-2">
            <button onClick={() => edit(l.id)} className="flex-1 rounded-lg bg-sky-50 py-2 text-[12.5px] font-semibold text-sky-700 tap">تحرير</button>
            <button onClick={() => store.duplicateEntity('libs', l.id)} className="rounded-lg bg-slate-50 px-3 py-2 tap"><Icon name="copy" size={15} /></button>
            <button onClick={() => setDl(l.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-rose-500 tap"><Icon name="trash" size={15} /></button>
          </div>
        </div>)}
      </div>
      <Confirm open={!!dl} onClose={() => setDl(null)} onYes={() => { if (dl) store.deleteEntity('libs', dl); setDl(null) }} danger title="حذف المكوّن المخصص؟" body="ستبقى النسخ الموضوعة في الموقع كما هي، ويُحذف القالب من المكتبة." />
    </div>
  )
}
function countLibUses(db: DB, libId: string): number {
  const scan = (n: any): number => { let c = 0; for (const ch of n.children || []) { if (ch.libId === libId) c++; c += scan(ch) } return c }
  let t = 0; for (const p of db.pages) t += scan(p.root); for (const b of db.bars) t += scan(b.root); for (const po of db.popups) t += scan(po.root); return t
}

// ---------------- مكتبة الوسائط ----------------
export function MediaScreen({ back, backToHome }: { back: () => void; backToHome: () => void }) {
  const store = useStore()
  const db = store.db
  const fileRef = useRef<HTMLInputElement>(null)
  const [del, setDel] = useState<string | null>(null)
  const usedBy = (id: string) => { let c = 0; const scan = (n: any) => { for (const ch of n.children || []) { if (ch.mediaId === id) c++; scan(ch) } }; for (const p of db.pages) scan(p.root); for (const b of db.bars) scan(b.root); for (const po of db.popups) scan(po.root); return c }
  const upload = (files: FileList | null) => { if (!files) return; Array.from(files).forEach((f) => { if (!f.type.startsWith('image/')) return store.toast('صورة فقط', 'err'); if (f.size > 1.4e6) return store.toast('كبير (1.4م.ب كحد)', 'err'); const rd = new FileReader(); rd.onload = () => store.setDB({ ...db, media: [...db.media, { id: uid('m'), name: f.name, type: 'image', mime: f.type, size: f.size, dataUrl: String(rd.result), at: Date.now() }] }); rd.readAsDataURL(f) }) }
  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      <SubTopBar back={back} title="مكتبة الوسائط" right={<button onClick={() => fileRef.current?.click()} className="btn-primary flex h-10 items-center gap-1 rounded-xl px-3 tap"><Icon name="plus" size={15} />رفع</button>} />
      <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {db.media.length === 0 ? <Empty title="لا وسائط بعد" desc="ارفع صورًا لاستخدامها في مكوّنات الصور." action={<button onClick={() => fileRef.current?.click()} className="btn-primary rounded-xl px-5 py-3 tap">رفع أول صورة</button>} /> : (
          <div className="grid grid-cols-3 gap-2">{db.media.map((m) => <div key={m.id} className="overflow-hidden rounded-xl bg-white border border-sky-100">
            <img src={m.dataUrl} className="aspect-square w-full object-cover" />
            <div className="flex items-center justify-between px-1.5 py-1"><span className="w-16 truncate text-[9px] text-slate-500">{m.name}</span><button onClick={() => setDel(m.id)} className="text-rose-400 tap"><Icon name="trash" size={13} /></button></div>
            <div className="px-1 pb-1 text-[8.5px] text-slate-300">مستخدَمة {usedBy(m.id)}×</div>
          </div>)}</div>
        )}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} onYes={() => { if (del) { store.setDB({ ...db, media: db.media.filter((m) => m.id !== del) }); store.toast('حُذف الوسيط — المكونات المستخدمة أصبحت عناصر نائبة', 'info') } setDel(null) }} danger title="حذف الوسيط؟" body="ستتحول المكوّنات التي تستخدمه إلى صورة نائبة." />
    </div>
  )
}

// ---------------- المراجع المكسورة ----------------
export function BrokenScreen({ back, openRef }: { back: () => void; openRef: (kind: any, id: string, nodeId: string) => void }) {
  const store = useStore()
  const db = store.db
  const items = findBroken(db)
  const [filter, setFilter] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const filtered = filter === 'all' ? items : items.filter((i) => (i.what.includes('وسيط') ? 'media' : 'action') === filter)
  const fixDrop = (it: BrokenItem) => {
    // إزالة الإجراء المكسور من المصدر
    if (!it.actionId) { store.setDB(db); return }
    const entity = (db[it.entityKind] as any[]).find((e) => e.id === it.entityId)
    if (!entity) return
    const arr = (db[it.entityKind] as any[])
    const next = arr.map((e) => (e.id === it.entityId ? { ...e, root: dropBrokenAction(e.root, it.nodeId, it.actionId as string) } : e))
    store.setDB({ ...db, [it.entityKind]: next })
    store.notify({ type: 'success', text: `حُذف الإجراء المكسور من «${it.nodeName}».` })
    store.toast('تم حذف الإجراء المكسور', 'ok')
  }
  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      <SubTopBar back={back} title="المراجع المكسورة" right={<span className={'rounded-full px-2.5 py-1 text-[11px] font-bold ' + (items.length ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')}>{items.length ? `${items.length} مرجع` : 'سليم ✓'}</span>} />
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2">{[['all','الكل'],['action','إجراءات'],['media','وسائط']].map(([v,l]) => <button key={v} onClick={()=>setFilter(v)} className={'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold '+(filter===v?'bg-sky-500 text-white':'bg-white border text-slate-500')}>{l}</button>)}</div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6">
        {filtered.length === 0 && <Empty icon="check" title="لا توجد مشاكل" desc="لا مراجع مكسورة حاليًا. كل الإجراءات والوسائط سليمة." />}
        {filtered.map((it) => (
          <div key={it.id} className="card-sky soft-sm p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><Icon name="link" size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-rose-700">{it.what}</div>
                <div className="mt-0.5 text-[11.5px] text-slate-500">المصدر: <b>{it.nodeName}</b> ضمن {it.entityKind === 'pages' ? 'صفحة' : it.entityKind === 'bars' ? 'شريط' : 'نافذة'} «{it.entityLabel}»</div>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2 border-t border-slate-50 pt-2">
              <button onClick={() => openRef(it.entityKind, it.entityId, it.nodeId)} className="flex-1 rounded-lg bg-sky-50 py-2 text-[12.5px] font-semibold text-sky-700 tap">انتقال للمكوّن المصدر</button>
              <button onClick={() => setConfirmId(it.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-600 tap">حذف المكسور</button>
            </div>
          </div>
        ))}
      </div>
      <Confirm open={!!confirmId} onClose={() => setConfirmId(null)} onYes={() => { const it = items.find((x) => x.id === confirmId); if (it) fixDrop(it); setConfirmId(null) }} danger title="حذف الإجراء المكسور؟" body="سيتوقف المكوّن المصدر عن محاولة تنفيذ هذا الإجراء المفقود." />
    </div>
  )
}

function RedirectTab() {
  const store = useStore()
  const db = store.db
  const up = (patch: any) => store.updateSettings(patch)
  const S = db.settings
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const addR = () => { if (!from.trim() || !to.trim()) return; up({ redirects: [...S.redirects, { from: normalizeSlug(from), to: normalizeSlug(to) }] }); setFrom(''); setTo('') }
  const setPath = (id: string, path: string) => {
    const np = normalizeSlug(path)
    if (db.pages.some((p) => p.id !== id && p.path === np)) return store.toast('المسار مستخدم بالفعل', 'err')
    store.updateEntity('pages', id, { path: np })
  }
  return <div className="space-y-3">
    <div className="text-[12px] font-bold text-slate-500">مسارات الصفحات (تظهر على /client)</div>
    {db.pages.map((p) => <div key={p.id} className="rounded-xl bg-white border p-2">
      <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{p.name}</span><span className={'rounded-full px-2 py-0.5 text-[10px] font-bold '+(p.status==='published'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700')}>{p.status==='published'?'منشورة':'غير منشورة'}</span></div>
      <div className="mt-1.5 flex items-center gap-1"><span className="text-[11px] text-slate-400">/client</span><input defaultValue={p.path} dir="ltr" className="field !py-1.5 text-[12px]" onBlur={(e: any) => { if (e.target.value !== p.path) setPath(p.id, e.target.value) }} /></div>
    </div>)}
    <div className="mt-3 text-[12px] font-bold text-slate-500">قواعد إعادة التوجيه</div>
    <div className="space-y-1.5">{S.redirects.map((r, i) => <div key={i} className="flex items-center gap-2 rounded-xl bg-white border px-3 py-2"><span className="text-[12.5px] text-slate-600" dir="ltr">{r.from}</span><Icon name="arrow-left" size={13} /><span className="flex-1 text-[12.5px] text-slate-600" dir="ltr">{r.to}</span><button onClick={() => up({ redirects: S.redirects.filter((_, x) => x !== i) })} className="text-rose-400 tap"><Icon name="trash" size={14} /></button></div>)}
    {S.redirects.length === 0 && <div className="rounded-xl border border-dashed p-3 text-center text-[12px] text-slate-400">لا قواعد. مثال: عند تغيير مسار صفحة، أضِف قاعدة من المسار القديم إلى الجديد.</div>}</div>
    <div className="rounded-xl bg-sky-50 p-3">
      <div className="mb-2 text-[12px] font-bold text-sky-700">إضافة قاعدة</div>
      <div className="flex gap-1.5"><input dir="ltr" className="field !py-2 text-[12px]" placeholder="/old" value={from} onChange={(e: any)=>setFrom(e.target.value)} /><input dir="ltr" className="field !py-2 text-[12px]" placeholder="/new" value={to} onChange={(e: any)=>setTo(e.target.value)} /></div>
      <button onClick={addR} className="mt-2 w-full rounded-xl bg-sky-500 py-2.5 text-[13px] font-semibold text-white tap">+ إضافة القاعدة</button>
    </div>
  </div>
}

function VarsTab() {
  const store = useStore()
  const db = store.db
  const [name, setName] = useState('')
  const add = () => { if (name.trim()) { store.addVar(name.trim()); setName('') } }
  const meta: any = { text: 'نص', number: 'رقم', bool: 'منطقي' }
  return <div>
    <div className="flex gap-2"><TextInput value={name} onChange={(e: any) => setName(e.target.value)} placeholder="اسم المتغير، مثال: counter" /><button onClick={add} className="btn-primary rounded-xl px-4 tap">+</button></div>
    <p className="mt-2 rounded-xl bg-sky-50 p-3 text-[12px] text-sky-700">تُستخدم المتغيرات في شروط العرض والتدفقات وتبقى حيّة خلال جلسة العميل على /client.</p>
    <div className="mt-3 space-y-2">{db.variables.map((v) => <div key={v.id} className="flex items-center gap-3 rounded-xl bg-white border p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 text-sm">⚙</span>
      <div className="flex-1"><div className="text-[13.5px] font-semibold" dir="ltr">{v.name}</div><div className="text-[11px] text-slate-400">{meta[v.vtype]} · {v.scope === 'session' ? 'جلسة العميل' : 'مؤقت'}</div></div>
      <button onClick={() => store.removeVar(v.id)} className="text-rose-400 tap"><Icon name="trash" size={15} /></button>
    </div>)}
    {db.variables.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-[12px] text-slate-400">لا متغيرات بعد.</div>}
    </div>
  </div>
}
