import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { DB, Node, NType, EntKind, Page } from '../types'
import { useStore } from '../lib/store'
import { createNode, NTYPE_LABEL, isContainer, LEAF_META, CONTAINER_META, uid } from '../lib/util'
import { updateNode, findNode, removeNode, locate, countNodes } from '../lib/tree'
import { buildStyle, containerFlexStyle, containerDirection } from '../lib/style'
import { LeafContent } from '../lib/primitives'
import { Icon } from '../lib/icons'
import { resolveMedia } from '../lib/media'
import { Properties } from './Properties'
import { ActionModal } from './ActionModal'
import { BottomSheet, Drawer, Modal, Confirm, Seg, Toggle, TextInput, Field } from './uikit'
import { actionLabel } from './ActionModal'

export type EditKind = 'pages'|'bars'|'popups'|'libs'
interface Props { kind: EditKind; id: string; onExit: () => void; onPreview: () => void; autoFocusId?: string | null }

export function entityKindLabel(kind: string) { return kind === 'pages' ? 'صفحة' : kind === 'bars' ? 'شريط' : kind === 'popups' ? 'نافذة منبثقة' : 'مكوّن مخصص' }

export default function Editor({ kind, id, onExit, onPreview, autoFocusId }: Props) {
  const store = useStore()
  const db = store.db
  const arr = db[kind] as any[]
  const entity = arr.find((e) => e.id === id)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [propsOpen, setPropsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState<null | string>(null) // 'root' | selected container id | 'after'
  const [treeOpen, setTreeOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [editAction, setEditAction] = useState<null | any>(null)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [clipboard, setClipboard] = useState<Node | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [confirmLeafAdd, setConfirmLeafAdd] = useState<null | { type: NType }>(null)
  const [addSheet, setAddSheet] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)

  const root = entity?.root as Node | undefined
  const readOnly = store.session.role === 'viewer'

  // تحديد مكوّن قادم من شاشة المراجع المكسورة وفتح خصائصه
  useEffect(() => {
    if (autoFocusId && root) { setSelectedId(autoFocusId); setPropsOpen(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusId])

  // تفعيل open media & add action من لوحة الخصائص
  useEffect(() => {
    const om = () => setMediaOpen(true)
    const oa = () => { setEditAction(null); setActionOpen(true) }
    const oea = (e: any) => { setEditAction(e.detail || null); setActionOpen(true) }
    window.addEventListener('cms:openmedia', om)
    window.addEventListener('cms:addaction', oa)
    window.addEventListener('cms:editaction', oea)
    return () => { window.removeEventListener('cms:openmedia', om); window.removeEventListener('cms:addaction', oa); window.removeEventListener('cms:editaction', oea) }
  }, [])

  const selected: Node | null = useMemo(() => (root && selectedId ? findNode(root, selectedId) : null), [root, selectedId])
  const loc = useMemo(() => (root && selectedId ? locate(root, selectedId) : null), [root, selectedId])

  if (!entity || !root) {
    return <div className="flex h-full items-center justify-center text-slate-400"><button onClick={onExit}>العودة</button></div>
  }

  const meta = entity as any
  const mediaArr = db.media

  const patch = (newRoot: Node) => store.patchRoot(kind, id, () => newRoot)

  // --- تعديل عقدة ---
  const changeNode = (n: Node) => { if (readOnly) return store.toast('أنت في وضع القراءة فقط', 'err'); patch(updateNode(root, n.id, () => n)) }

  // --- إضافة مكوّن ---
  const doAdd = (type: NType, into?: string | null) => {
    if (!root) return
    if (readOnly) { store.toast('وضع القراءة فقط — لا يمكن الإضافة', 'err'); setAddSheet(false); setPickerOpen(null); return }
    let containerId = root.id
    let index = -1
    if (into === 'root') { containerId = root.id }
    else if (into === 'after' && loc && loc.parent) { containerId = loc.parent.id; index = loc.index + 1 }
    else if (into && into !== 'root') {
      const t = findNode(root, into)
      if (t && isContainer(t.type)) containerId = into
      else if (t) { // عنصر نهائي، نضيف كأخيه
        const l = locate(root, into)
        if (l?.parent) { containerId = l.parent.id; index = l.index + 1 }
      }
    }
    const nn = createNode(type)
    nn.style.widthMode = 'full'
    if (type === 'text') { nn.style.widthMode = 'auto'; nn.textAlign = 'center' as any }
    patch(insertInto(root, containerId, nn, index))
    setSelectedId(nn.id)
    setAddSheet(false); setPickerOpen(null)
    setPropsOpen(true)
  }

  const pickerTarget = (): string => {
    if (pickerOpen && pickerOpen !== 'root' && pickerOpen !== 'after') return pickerOpen
    if (selected && isContainer(selected.type)) return selected.id
    return 'root'
  }

  // --- حذف/نسخ/تكرار/ترتيب ---
  const del = () => {
    if (!selected) return
    if (readOnly) { store.toast('وضع القراءة فقط', 'err'); return }
    const count = countNodes(selected)
    if (count > 1 || hasRefs(selected)) { setConfirmDel(true); return }
    patch(removeNode(root, selected.id)!)
    setSelectedId(null); setPropsOpen(false)
  }
  const confirmDelete = () => {
    if (!selected) return
    patch(removeNode(root, selected.id)!)
    setSelectedId(null); setPropsOpen(false); setConfirmDel(false)
    store.toast('تم حذف المكوّن' + (hasRefs(selected) ? ' وإجراءاته أصبحت مكسورة' : ''), 'ok')
  }
  const copy = () => { setClipboard(cloneNode(selected)); store.toast('تم النسخ', 'ok') }
  const dup = () => {
    if (!selected) return
    const c = cloneNode(selected); c.id = uid(selected.type); c.name = selected.name + ' (نسخة)'
    if (loc?.parent) patch(insertInto(root, loc.parent.id, c, loc.index + 1))
    setSelectedId(c.id)
  }
  const paste = () => {
    if (!clipboard) return
    const c = cloneNode(clipboard); c.id = uid(clipboard.type)
    if (loc?.parent) patch(insertInto(root, loc.parent.id, c, loc.index + 1))
    setSelectedId(c.id); store.toast('تم اللصق', 'ok')
  }
  const move = (dir: -1 | 1) => {
    if (!selected || !loc?.parent) return
    const parent = loc.parent
    const i = loc.index
    const to = dir === -1 ? i - 1 : i + 1
    const children = parent.children
    if (to < 0 || to >= children.length) return
    const arr = children.slice(); const [it] = arr.splice(i, 1); arr.splice(to, 0, it)
    patch(updateNode(root, parent.id, (p) => ({ ...p, children: arr })))
  }
  const toggleHide = () => { if (selected) changeNode({ ...selected, visible: !(selected.visible !== false) }) }

  const resetDefault = () => { if (selected) changeNode({ ...selected, style: {} }) }

  // media
  const applyMedia = (mid: string) => { if (selected && selected.type === 'image') changeNode({ ...selected, mediaId: mid, src: undefined }) }

  // إجراءات save action
  const saveAction = (a: any) => {
    if (!selected) return
    const evs = { ...(selected.events || {}) }
    const list = (evs.click || []).filter((x) => x.id !== a.id)
    evs.click = [...list, a]
    changeNode({ ...selected, events: evs })
  }
  const delAction = (aid: string) => {
    if (!selected) return
    const evs = { ...(selected.events || {}) }
    evs.click = (evs.click || []).filter((x) => x.id !== aid)
    changeNode({ ...selected, events: evs })
  }

  const editingNodeForAction: Node = selected || (root as Node)

  return (
    <div className="flex h-full flex-col bg-sky-50/60">
      {readOnly && <div className="z-40 bg-amber-100 px-4 py-2 text-center text-[12px] font-semibold text-amber-800">👁 أنت في وضع القراءة فقط — العرض فقط دون تعديل.</div>}
      {/* شريط رأس المحرر */}
      <div className="adminbar z-40 flex items-center gap-1.5 px-2 py-2">
        <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 tap hover:bg-sky-100"><Icon name="arrow-right" size={20} /></button>
        <button onClick={() => setRenameOpen(true)} className="flex min-w-0 flex-1 items-center gap-1 text-start">
          <span className="truncate text-[15px] font-bold text-slate-800">{meta.name}</span>
          <Icon name="edit" size={13} color="#94a3b8" />
        </button>
        <SaveBadge />
        <button onClick={() => store.undo()} disabled={store.undoDepth === 0} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 tap hover:bg-sky-100 disabled:opacity-25" title="تراجع"><Icon name="undo" size={18} /></button>
        <button onClick={() => store.redo()} disabled={store.redoDepth === 0} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 tap hover:bg-sky-100 disabled:opacity-25" title="إعادة"><Icon name="redo" size={18} /></button>
        <button onClick={onPreview} className="flex h-10 w-10 items-center justify-center rounded-xl text-sky-700 tap hover:bg-sky-100" title="معاينة"><Icon name="eye" size={19} /></button>
        {kind !== 'libs' && !readOnly && <button onClick={() => { store.notify({ type: 'success', text: `تم نشر «${meta.name}» ${entityKindLabel(kind)}.` }); store.publish(`نشر ${entityKindLabel(kind)}: ${meta.name}`); store.toast('تم النشر', 'ok') }} className="flex h-10 items-center gap-1 rounded-xl bg-sky-500 px-3 text-[12.5px] font-bold text-white tap"><Icon name="send" size={15} /> نشر</button>}
        <button onClick={() => setTreeOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl text-sky-700 tap hover:bg-sky-100"><Icon name="layers" size={18} /></button>
      </div>

      {/* الكانفاس */}
      <div className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden px-1 pb-24 pt-2">
        <div className="mx-auto w-full max-w-[430px]">
          <div className="rounded-3xl bg-white shadow-[0_0_0_1px_#dbeefe] min-h-[70vh] px-0 py-1" dir={db.settings.dir || 'rtl'} style={{ color: db.settings.text }}>
            {/* إطار أعلى للهاتف */}
            <div className="mb-1 flex justify-center pt-1"><div className="h-1.5 w-20 rounded-full bg-slate-200" /></div>
            {renderEdNode(root as Node)}
          </div>
        </div>
        {/* حالة فارغة */}
        {(!root.children || root.children.length === 0) && (
          <div className="pointer-events-none absolute inset-x-0 top-24 flex flex-col items-center text-slate-400">
            <Icon name="plus" size={26} />
            <p className="mt-1 text-[13px]">هذا {entityKindLabel(kind)} فارغ — اضغط زر الإضافة لبدء البناء</p>
          </div>
        )}
      </div>

      {/* شريط سياقي للمكوّن المحدد */}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-sky-100 bg-white/95 px-2 py-1.5 backdrop-blur">
          <div className="mx-auto flex max-w-[430px] items-center justify-between">
            <button onClick={() => setPropsOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1 text-sky-700"><Icon name="settings" size={18} /><span className="text-[9px]">خصائص</span></button>
            <button onClick={() => openAddFor(selected)} className="flex flex-col items-center gap-0.5 px-2 py-1 text-sky-700"><Icon name="plus" size={18} /><span className="text-[9px]">إضافة</span></button>
            <button onClick={copy} className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-600"><Icon name="copy" size={17} /><span className="text-[9px]">نسخ</span></button>
            {clipboard && <button onClick={paste} className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-600"><Icon name="check" size={18} /><span className="text-[9px]">لصق</span></button>}
            <button onClick={dup} className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-600"><Icon name="layers" size={18} /><span className="text-[9px]">تكرار</span></button>
            <button onClick={() => move(-1)} disabled={!loc?.parent} className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-600 disabled:opacity-30"><Icon name="arrow-up" size={17} /><span className="text-[9px]">أعلى</span></button>
            <button onClick={() => move(1)} disabled={!loc?.parent} className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-600 disabled:opacity-30"><Icon name="arrow-down" size={17} /><span className="text-[9px]">أسفل</span></button>
            <button onClick={toggleHide} className="flex flex-col items-center gap-0.5 px-2 py-1 text-amber-600"><Icon name="eye" size={18} /><span className="text-[9px]">{selected.visible !== false ? 'إخفاء' : 'إظهار'}</span></button>
            <button onClick={del} className="flex flex-col items-center gap-0.5 px-2 py-1 text-rose-500"><Icon name="trash" size={17} /><span className="text-[9px]">حذف</span></button>
          </div>
          <div className="px-2 pb-0.5 text-center text-[10px] text-slate-400 truncate">{NTYPE_LABEL[selected.type]} · {selected.name}</div>
        </div>
      )}

      {/* زر إضافة عائم */}
      <button onClick={() => { setAddSheet(true); setPickerOpen('root') }}
        className="tap absolute bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-300/50" style={{ insetInlineEnd: 16 }}>
        <Icon name="plus" size={26} />
      </button>

      {/* لوحة الخصائص */}
      <BottomSheet open={propsOpen} onClose={() => setPropsOpen(false)} full title={selected ? NTYPE_LABEL[selected.type] + ' · ' + selected.name : ''}>
        {selected && <Properties node={selected} settings={db.settings} media={mediaArr} onChange={(n) => changeNode(n)} onDelete={() => { setPropsOpen(false); setConfirmDel(true) }} />}
      </BottomSheet>

      {/* قائمة اختيار المكوّن */}
      <AddSheet
        open={pickerOpen === 'root' || addSheet}
        onClose={() => { setAddSheet(false); setPickerOpen(null) }}
        onPick={(t) => doAdd(t, 'root')}
      />

      {/* شجرة المكونات */}
      <TreeSheet open={treeOpen} onClose={() => setTreeOpen(false)} root={root} selectedId={selectedId} onPick={(id) => { setSelectedId(id); setTreeOpen(false) }} />

      {/* حذف مؤكد */}
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} onYes={confirmDelete} danger
        title="حذف المكوّن؟"
        body={selected ? <div className="text-start">سيُحذف «{selected.name}» مع كل أبنائه ({countNodes(selected)} مكوّنًا). أي إجراءات في الموقع تستهدفه ستصبح «مرجعًا مكسورًا».</div> : ''} />

      {/* نافذة الإجراء */}
      <ActionModal open={actionOpen} onClose={() => { setActionOpen(false); setEditAction(null) }} doc={db} initial={editAction} onSave={saveAction} />

      {/* مكتبة الوسائط للاختيار */}
      <MediaPicker open={mediaOpen} onClose={() => setMediaOpen(false)} onPick={(mid) => { applyMedia(mid); setMediaOpen(false) }} />

      {/* إعادة تسمية الكيان */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="إعدادات الكيان">
        <RenameForm entity={entity} kind={kind} db={db} onDone={() => setRenameOpen(false)} />
      </Modal>
    </div>
  )

  // ------- تسلسل عرض المكوّنات (الكانفاس) -------
  function renderEdNode(node: Node, depth = 0): React.ReactNode {
    const isSel = node.id === selectedId
    const hidden = node.visible === false
    const cnt = (node.children || []).length

    if (isContainer(node.type)) {
      const style: CSSProperties = { ...buildStyle(node, db.settings), ...containerFlexStyle(node) }
      if ((node.style?.widthMode || 'full') !== 'px') style.width = '100%'
      if (node.style?.widthMode === 'px') style.width = node.style.widthPx + 'px'
      style.outline = isSel ? '2px solid #38bdf8' : undefined
      style.outlineOffset = isSel ? 1 : undefined
      const dir = containerDirection(node)
      return (
        <div key={node.id} style={style}
          onClick={(e) => { e.stopPropagation(); setSelectedId(node.id) }}>
          {node.children?.map((c) => renderEdNode(c, depth + 1))}
          {cnt === 0 && <div className="rounded-lg border border-dashed border-sky-200 py-3 text-center text-[11px] text-sky-300">حاوية فارغة — اضغط إضافة داخل</div>}
          {hidden && <HiddenTag name={node.name} onClick={() => setSelectedId(node.id)} />}
          {isSel && <SelTag name={node.name} />}
        </div>
      )
    }
    // عنصر نهائي
    const clickable = node.type === 'button' || !!node.events?.click?.length || node.clickable
    const base = buildStyle(node, db.settings)
    const inner = node.type === 'image'
      ? <ImgBox node={node} db={db} heightPx={node.style?.heightPx} radius={node.style?.radius} />
      : <LeafContent node={node} ctx={{ settings: db.settings, media: mediaArr }} />
    return (
      <div key={node.id} onClick={(e) => { e.stopPropagation(); setSelectedId(node.id) }}
        style={{ position: 'relative', outline: isSel ? '2px solid #38bdf8' : clickable ? '1px dashed #bae6fd' : undefined, outlineOffset: isSel ? 1 : 1, width: node.type === 'image' ? '100%' : (node.style?.widthMode === 'px' ? node.style.widthPx + 'px' : undefined), display: node.type === 'image' ? 'block' : undefined }}>
        {inner}
        {hidden && <HiddenTag name={node.name} onClick={() => setSelectedId(node.id)} />}
        {isSel && <SelTag name={node.name} />}
      </div>
    )
  }

  function openAddFor(n: Node) {
    if (isContainer(n.type)) { setPickerOpen(n.id); setAddSheet(true) }
    else {
      setConfirmLeafAdd({ type: 'x' as NType })
      // اقتراح إضافة كأخ
      setAddSheet(true); setPickerOpen('after')
    }
  }
}

function cloneNode(n: Node | null): Node { return JSON.parse(JSON.stringify(n)) }

function insertInto(root: Node, containerId: string, node: Node, index = -1): Node {
  const r = JSON.parse(JSON.stringify(root)) as Node
  const t = findNode(r, containerId)
  if (t) { if (!t.children) t.children = []; const i = index < 0 ? t.children.length : Math.min(index, t.children.length); t.children.splice(i, 0, node) }
  return r
}

function ImgBox({ node, db, heightPx, radius }: { node: Node; db: DB; heightPx?: number; radius?: number }) {
  const { src } = resolveMedia(node, db.media)
  return <img src={src} alt="" style={{ width: '100%', height: heightPx || 'auto', objectFit: node.fit || 'cover', borderRadius: radius ?? 0, display: 'block' }} />
}

function HiddenTag({ name, onClick }: { name: string; onClick: () => void }) {
  return <button onClick={onClick} className="absolute top-1 end-1 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-amber-900 opacity-80">{name} مخفي</button>
}
function SelTag({ name }: { name: string }) {
  return <div className="pointer-events-none absolute -top-2 start-0 z-10 rounded-md bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{name}</div>
}

function SaveBadge() {
  const s = useStore()
  const map = { saved: { c: '#059669', t: 'محفوظ' }, saving: { c: '#f59e0b', t: 'جارٍ الحفظ…' }, dirty: { c: '#f59e0b', t: 'غير محفوظ' } }
  const m = map[s.saveState]
  return <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: m.c }} />{m.t}</span>
}

function AddSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: NType) => void }) {
  const [q, setQ] = useState('')
  const items = [...LEAF_META, ...CONTAINER_META].filter((x) => x.label.includes(q) || x.desc.includes(q))
  return (
    <BottomSheet open={open} onClose={onClose} title="إضافة مكوّن جديد">
      <input autoFocus className="field mb-3" placeholder="ابحث عن مكوّن…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-3 gap-2 pb-2">
        {items.map((it) => (
          <button key={it.t} onClick={() => onPick(it.t)} className="tap flex flex-col items-center gap-1.5 rounded-2xl border border-sky-100 bg-white px-2 py-3 hover:border-sky-300">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-lg font-bold text-sky-600">{it.icon}</span>
            <span className="text-[12px] font-semibold text-slate-700">{it.label}</span>
            <span className="text-center text-[9.5px] leading-tight text-slate-400">{it.desc}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

function TreeSheet({ open, onClose, root, selectedId, onPick }: { open: boolean; onClose: () => void; root: Node; selectedId: string | null; onPick: (id: string) => void }) {
  const rows: { id: string; name: string; type: string; d: number; hidden: boolean }[] = []
  const walk = (n: Node, d: number) => { rows.push({ id: n.id, name: n.name, type: NTYPE_LABEL[n.type], d, hidden: n.visible === false }); n.children?.forEach((c) => walk(c, d + 1)) }
  root?.children?.forEach((c) => walk(c, 0))
  return (
    <Drawer open={open} onClose={onClose} title="شجرة المكوّنات">
      <button onClick={() => onPick(root.id)} className={'w-full rounded-xl px-3 py-2 text-start tap ' + (selectedId === root.id ? 'bg-sky-100' : '')}>
        <span className="text-[13px] font-bold text-slate-700">🗂 الجذر</span>
      </button>
      <div className="mt-1">
        {rows.map((r) => (
          <button key={r.id} onClick={() => onPick(r.id)} style={{ paddingInlineStart: 10 + r.d * 14 }} className={'block w-full rounded-xl px-3 py-2 text-start tap ' + (selectedId === r.id ? 'bg-sky-100' : 'hover:bg-sky-50')}>
            <span className={'text-[12.5px] ' + (r.hidden ? 'text-slate-400 line-through' : 'text-slate-700')}>{r.hidden ? '👁' : ''} {r.type}: {r.name}</span>
          </button>
        ))}
      </div>
    </Drawer>
  )
}

function RenameForm({ entity, kind, db, onDone }: { entity: any; kind: string; db: DB; onDone: () => void }) {
  const store = useStore()
  const isPage = kind === 'pages'
  const [name, setName] = useState(entity?.name || '')
  const [path, setPath] = useState(entity?.path || '')
  const [title, setTitle] = useState(entity?.title || '')
  const [status, setStatus] = useState(entity?.status || entity?.hidden !== undefined ? (entity.hidden ? 'hidden' : 'published') : 'published')
  const save = () => {
    const patch: any = { name }
    if (isPage) { patch.path = path; patch.title = title; patch.status = status }
    else patch.hidden = status === 'hidden'
    store.updateEntity(kind as any, entity.id, patch)
    store.toast('تم الحفظ', 'ok'); onDone()
  }
  return <div className="space-y-3">
    <Field label="الاسم الداخلي"><TextInput value={name} onChange={(e: any) => setName(e.target.value)} /></Field>
    {isPage && <>
      <Field label="المسار داخل /client"><TextInput dir="ltr" value={path} onChange={(e: any) => setPath(e.target.value)} /></Field>
      <Field label="عنوان الصفحة"><TextInput value={title} onChange={(e: any) => setTitle(e.target.value)} /></Field>
      <Field label="الحالة"><Seg value={status} onChange={setStatus} options={[{value:'published',label:'منشور'},{value:'draft',label:'مسودة'},{value:'hidden',label:'مخفي'}]} /></Field>
    </>}
    <div className="grid grid-cols-2 gap-2">
      <button onClick={onDone} className="rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 tap">إلغاء</button>
      <button onClick={save} className="btn-primary rounded-xl py-3 font-semibold tap">حفظ</button>
    </div>
  </div>
}

// مكتبة الوسائط — اختيار
export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const store = useStore()
  const db = store.db
  const fileRef = useRef<HTMLInputElement>(null)
  const [adding, setAdding] = useState(false)
  const upload = (file: File) => {
    if (!file.type.startsWith('image/')) { store.toast('يُدعم الصور فقط', 'err'); return }
    if (file.size > 1.4 * 1024 * 1024) { store.toast('الحجم كبير جدًا (الحد 1.4م.ب)', 'err'); return }
    setAdding(true)
    const rd = new FileReader()
    rd.onload = () => {
      const d = db
      const m = { id: uid('m'), name: file.name, type: 'image' as const, mime: file.type, size: file.size, dataUrl: String(rd.result), at: Date.now() }
      store.setDB({ ...d, media: [...d.media, m] })
      setAdding(false)
    }
    rd.readAsDataURL(file)
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="مكتبة الوسائط">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <button onClick={() => fileRef.current?.click()} className="btn-primary mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 tap" disabled={adding}>
        <Icon name="plus" size={18} /> {adding ? 'جارٍ الرفع…' : 'رفع صورة من الجهاز'}
      </button>
      {db.media.length === 0 ? <div className="py-10 text-center text-[13px] text-slate-400">لا وسائط بعد — ارفع صورة لاستخدامها.</div> : (
        <div className="grid grid-cols-3 gap-2">
          {db.media.map((m) => <button key={m.id} onClick={() => onPick(m.id)} className="tap overflow-hidden rounded-xl border border-sky-100"><img src={m.dataUrl} className="aspect-square w-full object-cover" /><div className="truncate bg-slate-50 px-1 py-1 text-[9px] text-slate-500">{m.name}</div></button>)}
        </div>
      )}
    </BottomSheet>
  )
}

function hasRefs(n: Node): boolean {
  return !!((n.events?.click && n.events.click.length))
}
