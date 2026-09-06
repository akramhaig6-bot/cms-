import { useState } from 'react'
import type { Node, Settings, EventName } from '../types'
import { Field, TextInput, TextArea, Select, Toggle, Seg, Icon as U } from './uikit'
import { NTYPE_LABEL, LEAF, isContainer } from '../lib/util'
import { Icon } from '../lib/icons'
import { actionLabel, pickTree } from './ActionModal'
import { useStore } from '../lib/store'

type Tab = 'content'|'design'|'size'|'align'|'behavior'|'visibility'|'advanced'

const TABS: { id: Tab; label: string }[] = [
  { id:'content', label:'المحتوى' }, { id:'design', label:'التصميم' }, { id:'size', label:'المقاسات' },
  { id:'align', label:'المحاذاة' }, { id:'behavior', label:'الإجراءات' }, { id:'visibility', label:'الظهور' },
  { id:'advanced', label:'متقدم' },
]

export function Properties({ node, settings, onChange, media, onDelete }: {
  node: Node; settings: Settings; onChange: (n: Node) => void; media: any[]; onDelete?: () => void
}) {
  const [tab, setTab] = useState<Tab>('content')
  const up = (patch: Partial<Node>, style?: any) => onChange({ ...node, ...patch, style: style ? { ...node.style, ...style } : node.style })

  const set = (patch: Partial<Node>) => onChange({ ...node, ...patch })

  return (
    <div className="flex h-full flex-col">
      {/* تبويبات */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-sky-100 px-3 py-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ' + (tab === t.id ? 'bg-sky-500 text-white' : 'bg-sky-50 text-slate-600')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" style={{ paddingBottom: 90 }}>
        {tab === 'content' && <ContentTab node={node} set={set} settings={settings} media={media} />}
        {tab === 'design' && <DesignTab node={node} set={set} settings={settings} />}
        {tab === 'size' && <SizeTab node={node} set={set} />}
        {tab === 'align' && <AlignTab node={node} set={set} />}
        {tab === 'behavior' && <BehaviorTab node={node} set={set} onDelete={onDelete} />}
        {tab === 'visibility' && <VisibilityTab node={node} set={set} settings={settings} />}
        {tab === 'advanced' && <AdvancedTab node={node} set={set} onDelete={onDelete} />}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><div className="mb-1 text-[12px] font-semibold text-slate-500">{label}</div>{children}</div>
}
function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5">{children}</div>
}

function ColorField({ label, value, onValue, presets }: { label: string; value?: string; onValue: (v: string) => void; presets: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={hex(value) || '#ffffff'} onChange={(e) => onValue(e.target.value)} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" />
        <input className="field !py-2 text-[12px]" value={value || ''} onChange={(e) => onValue(e.target.value)} placeholder="#000000 أو transparent" />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {presets.map((c) => <button key={c} onClick={() => onValue(c)} className="h-6 w-6 rounded-full border border-black/10" style={{ background: c }} />)}
      </div>
    </div>
  )
}
function hex(v?: string) { if (!v || v.startsWith('transparent')) return undefined; return v }

function NumberRow({ label, value, onValue, min = 0, max = 200 }: { label: string; value?: number; onValue: (v: number) => void; min?: number; max?: number }) {
  return (
    <StyleRow label={label}>
      <input type="number" min={min} max={max} value={value ?? ''} onChange={(e) => onValue(Number(e.target.value) || 0)} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[13px] focus:border-sky-400" />
    </StyleRow>
  )
}

// ---------------- المحتوى ----------------
function ContentTab({ node, set, settings, media }: { node: Node; set: (p: Partial<Node>) => void; settings: Settings; media: any[] }) {
  const s = node.style
  if (node.type === 'text') {
    return <div>
      <Row label="نوع النص"><Seg value={node.textKind || 'paragraph'} onChange={(v) => set({ textKind: v as any })}
        options={[{value:'heading1',label:'عنوان ١'},{value:'heading2',label:'عنوان ٢'},{value:'heading3',label:'عنوان ٣'},{value:'paragraph',label:'فقرة'},{value:'label',label:'تسمية'}]} /></Row>
      <Row label="النص"><TextArea rows={5} value={node.text || ''} onChange={(e) => set({ text: e.target.value })} /></Row>
      <ToggleRow on={!!node.hideWhenEmpty} onValue={(v) => set({ hideWhenEmpty: v })} label="إخفاء عند الفراغ في /client" />
    </div>
  }
  if (node.type === 'button') {
    return <div>
      <Row label="نص الزر"><TextInput value={node.text || ''} onChange={(e) => set({ text: e.target.value })} /></Row>
      <Row label="أيقونة (اختياري)"><IconButton node={node} set={set} /></Row>
    </div>
  }
  if (node.type === 'badge') {
    return <div>
      <Row label="نص الشارة"><TextInput value={node.text || ''} onChange={(e) => set({ text: e.target.value })} /></Row>
      <ColorField label="لون الشارة" value={node.badgeColor || '#f59e0b'} onValue={(v) => set({ badgeColor: v })} presets={['#0ea5e9','#f59e0b','#059669','#dc2626','#7c3aed','#94a3b8']} />
    </div>
  }
  if (node.type === 'image') {
    const m = node.mediaId ? media.find((x) => x.id === node.mediaId) : undefined
    return <div>
      <Row label="المصدر">
        {m && <div className="mb-2 overflow-hidden rounded-xl"><img src={m.dataUrl} className="h-24 w-full object-cover" /></div>}
        <button onClick={() => window.dispatchEvent(new CustomEvent('cms:openmedia'))} className="btn-ghost w-full rounded-xl py-3 text-[13.5px] tap">📁 اختيار من مكتبة الوسائط</button>
      </Row>
      <Row label="النص البديل"><TextInput value={node.alt || ''} onChange={(e) => set({ alt: e.target.value })} /></Row>
      <Row label="أسلوب العرض"><Seg value={node.fit || 'cover'} onChange={(v) => set({ fit: v as any })} options={[{value:'cover',label:'تغطية'},{value:'contain',label:'احتواء'},{value:'fill',label:'ملء'}]} /></Row>
      {(node.mediaId || node.src) && <button onClick={() => set({ mediaId: undefined, src: undefined })} className="w-full rounded-xl py-2.5 text-[13px] text-rose-600 tap hover:bg-rose-50">حذف الصورة</button>}
    </div>
  }
  if (node.type === 'icon') {
    return <div>
      <Row label="الأيقونة"><IconButton node={node} set={set} /></Row>
    </div>
  }
  if (isContainer(node.type) || node.type === 'divider' || node.type === 'spacer' || node.type === 'progress') {
    return <div className="rounded-xl bg-sky-50 p-3 text-[13px] leading-relaxed text-sky-800">
      هذا مكوّن «{NTYPE_LABEL[node.type]}» — {isContainer(node.type) ? 'المحتوى الداخلي هو أبناؤه، أضفهم من أزرار الإضافة في الأسفل أو الشريط السياقي.' : 'لا يملك محتوى نصيًا، عدّل شكله من التصميم والمقاسات.'}
    </div>
  }
  return null
}
function ToggleRow({ on, onValue, label }: { on: boolean; onValue: (v: boolean) => void; label: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-[13.5px] text-slate-700">{label}</span><Toggle on={on} onChange={onValue} /></div>
}
function IconButton({ node, set }: { node: Node; set: (p: Partial<Node>) => void }) {
  const [open, setOpen] = useState(false)
  const icons = ['heart','star','home','user','cart','bell','mail','phone','map','clock','camera','image','eye','check','close','play','arrow-right','arrow-left','arrow-up','arrow-down','plus','trash','settings','search','share','edit','download']
  return <>
    <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 tap">
      {node.icon ? <span className="flex items-center gap-2"><Icon name={node.icon} size={18} /> اختيار الأيقونة</span> : <span>بدون أيقونة — اختر</span>}
    </button>
    {open && <div className="fadein fixed inset-0 z-[200] bg-white flex flex-col">
      <div className="adminbar flex items-center justify-between px-4 py-3"><div className="font-bold">اختر أيقونة</div><button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><Icon name="close"/></button></div>
      <div className="grid flex-1 grid-cols-5 content-start gap-2 overflow-y-auto p-3">
        {icons.map((ic) => <button key={ic} onClick={() => { set({ icon: ic }); setOpen(false) }} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-slate-100 bg-white tap hover:border-sky-300"><Icon name={ic} size={20} color="#0ea5e9"/><span className="text-[8.5px] text-slate-400">{ic}</span></button>)}
        <button onClick={() => { set({ icon: undefined }); setOpen(false) }} className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed text-[11px] text-slate-400">بدون</button>
      </div>
    </div>}
  </>
}

// ---------------- التصميم ----------------
function DesignTab({ node, set, settings }: { node: Node; set: (p: Partial<Node>) => void; settings: Settings }) {
  const s = node.style || {}
  const ss = (patch: any) => set({ style: { ...s, ...patch } })
  const presets = settings.siteColors.map((c) => c.value)
  return <div>
    <ColorField label="لون الخلفية" value={s.bg} onValue={(v) => ss({ bg: v === 'transparent' ? 'transparent' : v })} presets={presets} />
    <StyleRow label="الشفافية">
      <input type="range" min={0} max={100} value={Math.round((s.opacity ?? 1) * 100)} onChange={(e) => ss({ opacity: Number(e.target.value) / 100 })} className="w-40 accent-sky-500" />
      <span className="w-10 text-center text-[12px]">{Math.round((s.opacity ?? 1) * 100)}%</span>
    </StyleRow>
    {(node.type === 'text' || node.type === 'icon' || node.type === 'button') && <ColorField label="لون النص / المحتوى" value={s.color} onValue={(v) => ss({ color: v })} presets={presets} />}
    <ColorField label="لون الحدود" value={s.borderColor} onValue={(v) => ss({ borderColor: v })} presets={presets} />
    <StyleRow label="نمط الحدود">
      <Select value={s.borderStyle || 'none'} onChange={(v) => ss({ borderStyle: v })} options={[{value:'none',label:'بلا'},{value:'solid',label:'متصل'},{value:'dashed',label:'متقطع'}]} className="w-32" />
    </StyleRow>
    <NumberRow label="سماكة الحدود" value={s.borderWidth} onValue={(v) => ss({ borderWidth: v })} max={8} />
    <NumberRow label="استدارة الزوايا" value={s.radius} onValue={(v) => ss({ radius: v })} max={60} />
    <StyleRow label="ظل">
      <Toggle on={!!s.shadow} onChange={(v) => ss({ shadow: v })} />
    </StyleRow>
    {(node.type === 'text') && <>
      <StyleRow label="حجم الخط"><Seg value={(s.textSize || 'base') as string} onChange={(v) => ss({ textSize: v })} options={[{value:'xs',label:'ص'},{value:'sm',label:'م'},{value:'base',label:'ك'},{value:'lg',label:'١'},{value:'xl',label:'٢'},{value:'2xl',label:'٣'},{value:'3xl',label:'٤'}]} /></StyleRow>
      <StyleRow label="سماكة الخط"><Seg value={String(s.textWeight || 400)} onChange={(v) => ss({ textWeight: Number(v) })} options={[{value:'400',label:'عادي'},{value:'600',label:'متوسط'},{value:'800',label:'غامق'}]} /></StyleRow>
      <StyleRow label="محاذاة النص"><Seg value={(s.textAlign || 'start') as string} onChange={(v) => ss({ textAlign: v })} options={[{value:'start',label:'بداية'},{value:'center',label:'وسط'},{value:'end',label:'نهاية'}]} /></StyleRow>
    </>}
  </div>
}

// ---------------- المقاسات ----------------
function SizeTab({ node, set }: { node: Node; set: (p: Partial<Node>) => void }) {
  const s = node.style || {}
  const ss = (patch: any) => set({ style: { ...s, ...patch } })
  const pad = { pt: 'أعلى', pr: 'يمين', pb: 'أسفل', pl: 'يسار' }
  const mar = { mt: 'أعلى', mr: 'يمين', mb: 'أسفل', ml: 'يسار' } as any
  const dir = s.direction || 'vertical'
  return <div>
    <StyleRow label="العرض">
      <Seg value={s.widthMode || 'full'} onChange={(v) => ss({ widthMode: v })} options={[{value:'full',label:'ملء'},{value:'auto',label:'تلقائي'},{value:'px',label:'ثابت'}]} />
    </StyleRow>
    {s.widthMode === 'px' && <NumberRow label="قيمة العرض" value={s.widthPx} onValue={(v) => ss({ widthPx: v })} max={800} />}
    <StyleRow label="الارتفاع">
      <Seg value={s.heightMode || 'auto'} onChange={(v) => ss({ heightMode: v })} options={[{value:'auto',label:'تلقائي'},{value:'px',label:'ثابت'}]} />
    </StyleRow>
    {s.heightMode === 'px' && <NumberRow label="قيمة الارتفاع" value={s.heightPx} onValue={(v) => ss({ heightPx: v })} max={800} />}
    <div className="mt-3 rounded-xl bg-slate-50 p-3">
      <div className="mb-1 text-[11px] font-bold text-slate-500">الحشوة الداخلية (من الداخل)</div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(pad) as (keyof typeof pad)[]).map((k) => <label key={k} className="flex items-center gap-2"><span className="w-7 text-[11px] text-slate-400">{pad[k]}</span><input type="number" value={(s as any)[k] ?? ''} onChange={(e) => ss({ [k]: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" /></label>)}
      </div>
    </div>
    <div className="mt-2 rounded-xl bg-slate-50 p-3">
      <div className="mb-1 text-[11px] font-bold text-slate-500">الهوامش الخارجية (من الخارج)</div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(mar) as string[]).map((k) => <label key={k} className="flex items-center gap-2"><span className="w-7 text-[11px] text-slate-400">{mar[k]}</span><input type="number" value={(s as any)[k] ?? ''} onChange={(e) => ss({ [k]: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" /></label>)}
      </div>
    </div>
    {isContainer(node.type) && <>
      <StyleRow label="المسافة بين الأبناء">
        <input type="range" min={0} max={40} value={s.gap || 0} onChange={(e) => ss({ gap: Number(e.target.value) })} className="w-40 accent-sky-500" />
        <span className="w-8 text-center text-[12px]">{s.gap || 0}</span>
      </StyleRow>
    </>}
    <div className="mt-2 text-[11.5px] text-slate-400">{dir === 'vertical' ? 'أفراد المكوّن يتكدسون رأسيًا.' : 'أفراد المكوّن يتوزعون أفقيًا.'}</div>
    {node.type !== 'text' && <ToggleRow on={!!node.responsive?.hideOnTiny} onValue={(v) => set({ responsive: { hideOnTiny: v } })} label="إخفاء على الشاشات الصغيرة جدًا" />}
  </div>
}

// ---------------- المحاذاة ----------------
function AlignTab({ node, set }: { node: Node; set: (p: Partial<Node>) => void }) {
  const s = node.style || {}
  const ss = (patch: any) => set({ style: { ...s, ...patch } })
  if (!isContainer(node.type)) return <div className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-500">المحاذاة متاحة للحاويات التي تحوي أبناءً. لرفع/خفض المكوّن ضمن إخوته استخدم أزرار الترتيب في الشريط السياقي.</div>
  return <div>
    {node.type !== 'grid' && <StyleRow label="اتجاه الأبناء">
      <Seg value={s.direction || 'vertical'} onChange={(v) => ss({ direction: v })} options={[{value:'vertical',label:'رأسي'},{value:'horizontal',label:'أفقي'}]} />
    </StyleRow>}
    {node.type === 'grid' && <NumberRow label="عدد الأعمدة" value={s.columns || 2} onValue={(v) => ss({ columns: Math.max(1, Math.min(4, v)) })} max={4} />}
    <StyleRow label="المحاذاة الأفقية">
      <Seg value={s.alignX || 'stretch'} onChange={(v) => ss({ alignX: v })} options={[{value:'stretch',label:'تمدد'},{value:'start',label:'بداية'},{value:'center',label:'وسط'},{value:'end',label:'نهاية'}]} />
    </StyleRow>
    {(s.direction === 'horizontal') && <StyleRow label="المحاذاة الرأسية">
      <Seg value={s.alignY || 'center'} onChange={(v) => ss({ alignY: v })} options={[{value:'stretch',label:'تمدد'},{value:'start',label:'أعلى'},{value:'center',label:'وسط'},{value:'end',label:'أسفل'}]} />
    </StyleRow>}
  </div>
}

// ---------------- الإجراءات ----------------
function BehaviorTab({ node, set, onDelete }: { node: Node; set: (p: Partial<Node>) => void; onDelete?: () => void }) {
  const hasActions = !!node.events?.click?.length
  return <div>
    {node.type !== 'button' && !node.clickable && !hasActions && (
      <div className="mb-2 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">هذا المكوّن غير تفاعلي حاليًا. فعّل «قابل للنقر» ليصبح له إجراءات.</div>
    )}
    {node.type !== 'button' && <ToggleRow on={!!node.clickable} onValue={(v) => set({ clickable: v })} label="قابل للنقر (تفعيل التفاعل)" />}
    <div className="mt-2 flex items-center justify-between"><span className="text-[13px] font-bold text-slate-600">عند الضغط</span>
      <button onClick={() => window.dispatchEvent(new CustomEvent('cms:addaction'))} className="rounded-full bg-sky-500 px-3 py-1.5 text-[12px] font-semibold text-white tap">+ إضافة إجراء</button>
    </div>
    {!hasActions && <div className="mt-2 rounded-xl bg-slate-50 p-3 text-center text-[13px] text-slate-400">لم تُربط أي إجراءات بهذا الحدث بعد.</div>}
    <div className="mt-2 space-y-1.5">
      {(node.events?.click || []).map((a) => (
        <div key={a.id} className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><Icon name="send" size={13} /></span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('cms:editaction', { detail: a }))} className="min-w-0 flex-1 text-start"><span className="block truncate text-[12.5px] font-semibold text-slate-700">{actionLabel(a)}</span><span className="text-[9.5px] text-slate-400">اضغط للتعديل</span></button>
          <button onClick={() => set({ events: { ...(node.events || {}), click: (node.events?.click || []).filter((x) => x.id !== a.id) } })} className="text-rose-400 tap"><Icon name="trash" size={15} /></button>
        </div>
      ))}
    </div>
    {node.type === 'button' && <div className="mt-3 rounded-xl border border-sky-100 p-3">
      <ToggleRow on={!!node.progress?.enabled} onValue={(v) => set({ progress: { enabled: v, duration: node.progress?.duration || 2000, start: node.progress?.start || 'click', cancellable: node.progress?.cancellable ?? true } })} label="شريط تقدم قبل التنفيذ" />
      {node.progress?.enabled && <>
        <StyleRow label="المدة"><Seg value={String(node.progress.duration || 2000)} onChange={(v) => set({ progress: { ...node.progress, duration: Number(v) } })} options={[{value:'1000',label:'١ث'},{value:'2000',label:'٢ث'},{value:'3000',label:'٣ث'}]} /></StyleRow>
        <StyleRow label="البداية"><Seg value={node.progress.start || 'click'} onChange={(v) => set({ progress: { ...node.progress, start: v as any } })} options={[{value:'click',label:'عند الضغط'},{value:'auto',label:'تلقائي'}]} /></StyleRow>
      </>}
    </div>}
  </div>
}

function VisibilityTab({ node, set, settings }: { node: Node; set: (p: Partial<Node>) => void; settings: Settings }) {
  const store = useStore()
  const condOn = !!node.cond
  return <div>
    <ToggleRow on={node.visible !== false} onValue={(v) => set({ visible: v })} label="ظاهر في البداية" />
    {node.visible === false && <div className="mt-2 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">مخفي مبدئيًا — سيظهر فقط عبر إجراء «إظهار» من مكوّن آخر (مثل زر).</div>}
    <div className="mt-3"><div className="mb-1 text-[12px] font-semibold text-slate-500">حركة الظهور (للإظهار عبر الإجراءات)</div>
      <Seg value={node.animIn || 'none'} onChange={(v) => set({ animIn: v === 'none' ? undefined : v })} options={[{value:'none',label:'فوري'},{value:'fade',label:'تلاشٍ'},{value:'slide-up',label:'صعود'},{value:'slide-down',label:'هبوط'},{value:'zoom',label:'تكبير'}]} />
    </div>
    <div className="mt-3 rounded-xl border border-sky-100 p-3">
      <ToggleRow on={condOn} onValue={(v) => set({ cond: v ? { op: 'visible', refKind: 'node' } : undefined })} label="ظهور مشروط بمكوّن آخر" />
      {condOn && <>
        <div className="mb-2 text-[11.5px] text-slate-500">يظهر هذا المكوّن فقط عندما يكون المكوّن الهدف:</div>
        <div className="space-y-2">
          <CondPick node={node} set={set} />
        </div>
      </>}
    </div>
    {node.children && node.children.length > 0 && <>
      <div className="mt-3 text-[12px] font-bold text-slate-500">إخفاء هذا المكوّن سيخفي كل أبنائه.</div>
    </>}
    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[12.5px] leading-relaxed text-slate-500">عند الطي داخل شريط قابل للطي، يمكن أن يبقى هذا المكوّن ظاهرًا. يدار هذا الإعداد من خصائص الشريط نفسه.</div>
  </div>
}
function CondPick({ node, set }: { node: Node; set: (p: Partial<Node>) => void }) {
  const store = useStore()
  const items = pickTree(store.db).filter((x) => x.id !== node.id)
  const up = (patch: any) => set({ cond: { ...(node.cond || {}), ...patch } })
  return <>
    <select className="field" value={node.cond?.op || 'visible'} onChange={(e) => up({ op: e.target.value })}>
      <option value="visible">ظاهرًا</option><option value="hidden">مخفيًا</option>
    </select>
    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100">
      {items.map((it) => <button key={it.id} onClick={() => up({ refKind: 'node', refId: it.id, refLabel: it.label })} className={'block w-full truncate px-2.5 py-1.5 text-start text-[11.5px] tap ' + (node.cond?.refId === it.id ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-500')}>{it.label}</button>)}
    </div>
  </>
}

function AdvancedTab({ node, set, onDelete }: { node: Node; set: (p: Partial<Node>) => void; onDelete?: () => void }) {
  return <div>
    <Field label="الاسم الداخلي (المعرف)">
      <TextInput value={node.name} onChange={(e) => set({ name: e.target.value })} />
    </Field>
    <div className="mt-3"><button onClick={() => { navigator.clipboard?.writeText(node.id); }} className="w-full rounded-xl bg-slate-100 py-2.5 text-[13px] text-slate-600 tap">نسخ معرّف المكوّن</button></div>
    <button onClick={onDelete} className="mt-2 w-full rounded-xl bg-rose-50 py-2.5 text-[13px] font-semibold text-rose-600 tap">حذف المكوّن نهائيًا</button>
  </div>
}
