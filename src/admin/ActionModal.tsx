import { useMemo, useState } from 'react'
import type { Action, ActionType, DB, Node } from '../types'
import { BottomSheet, Select, Field, TextInput, Toggle } from './uikit'
import { NTYPE_LABEL } from '../lib/util'
import { findNode } from '../lib/tree'

const TYPES: { t: ActionType; label: string; group: string }[] = [
  { t: 'nav', label: 'الانتقال إلى صفحة', group: 'تنقل' },
  { t: 'back', label: 'الرجوع للخلف', group: 'تنقل' },
  { t: 'openPopup', label: 'فتح نافذة منبثقة', group: 'نوافذ' },
  { t: 'closePopup', label: 'إغلاق نافذة منبثقة', group: 'نوافذ' },
  { t: 'closeAllPopups', label: 'إغلاق كل النوافذ', group: 'نوافذ' },
  { t: 'show', label: 'إظهار مكوّن', group: 'إظهار/إخفاء' },
  { t: 'hide', label: 'إخفاء مكوّن', group: 'إظهار/إخفاء' },
  { t: 'toggle', label: 'تبديل ظهور مكوّن', group: 'إظهار/إخفاء' },
  { t: 'showAndHide', label: 'إظهار مكوّن وإخفاء آخر', group: 'إظهار/إخفاء' },
  { t: 'foldBar', label: 'طي شريط', group: 'أشرطة' },
  { t: 'unfoldBar', label: 'فتح شريط', group: 'أشرطة' },
  { t: 'toggleBar', label: 'تبديل طي شريط', group: 'أشرطة' },
  { t: 'runFlow', label: 'تشغيل تدفق مُعرَّف', group: 'تدفقات' },
  { t: 'openLink', label: 'فتح رابط خارجي', group: 'تنقل' },
  { t: 'setVar', label: 'تعيين قيمة متغير', group: 'متغيرات' },
  { t: 'incVar', label: 'زيادة متغير رقمي', group: 'متغيرات' },
  { t: 'toggleVar', label: 'تبديل متغير منطقي', group: 'متغيرات' },
]

export function ActionModal({ open, onClose, doc, initial, onSave }: {
  open: boolean; onClose: () => void; doc: DB; initial?: Action | null; onSave: (a: Action) => void
}) {
  const [type, setType] = useState<ActionType>(initial?.type || 'nav')
  const [targetKind, setTargetKind] = useState(initial?.target?.kind || 'page')
  const [pageId, setPageId] = useState(initial?.target?.kind === 'page' ? initial.target.id : '')
  const [popupId, setPopupId] = useState(initial?.target?.kind === 'popup' ? initial.target.id : '')
  const [barId, setBarId] = useState(initial?.target?.kind === 'bar' ? initial.target.id : '')
  const [flowId, setFlowId] = useState(initial?.target?.kind === 'flow' ? initial.target.id : '')
  const [nodePick, setNodePick] = useState<{ id: string; label: string } | null>(initial && (initial.type === 'show' || initial.type === 'hide' || initial.type === 'toggle') ? { id: initial.target?.id || '', label: initial.target?.label || '' } : null)
  const [showNode, setShowNode] = useState<{ id: string; label: string } | null>(initial?.showId ? { id: initial.showId, label: 'مكوّن' } : null)
  const [hideNode, setHideNode] = useState<{ id: string; label: string } | null>(initial?.hideId ? { id: initial.hideId, label: 'مكوّن' } : null)
  const [url, setUrl] = useState(initial?.type === 'openLink' ? initial.target?.id || '' : '')
  const [varId, setVarId] = useState(initial?.target?.kind === 'var' ? initial.target.id : '')
  const [varVal, setVarVal] = useState(initial?.target?.kind === 'var' ? (initial.target.label || '') : '')
  const [delay, setDelay] = useState(initial?.delay || 0)

  const setT = (t: ActionType) => { setType(t) }
  const needsNode = ['show', 'hide', 'toggle'].includes(type)
  const needsPage = type === 'nav'
  const needsPopup = type === 'openPopup' || type === 'closePopup'
  const needsBar = ['foldBar', 'unfoldBar', 'toggleBar'].includes(type)
  const needsFlow = type === 'runFlow'
  const needsVar = ['setVar', 'incVar', 'toggleVar'].includes(type)

  const save = () => {
    let target: Action['target']
    if (needsPage) target = { kind: 'page', id: pageId, label: doc.pages.find((p) => p.id === pageId)?.name }
    else if (needsPopup) target = type === 'openPopup' || type === 'closePopup' ? { kind: 'popup', id: popupId, label: doc.popups.find((p) => p.id === popupId)?.name } : undefined
    else if (needsBar) target = { kind: 'bar', id: barId, label: doc.bars.find((b) => b.id === barId)?.name }
    else if (needsFlow) target = { kind: 'flow', id: flowId, label: doc.flows.find((f) => f.id === flowId)?.name }
    else if (needsNode) target = nodePick ? { kind: 'node', id: nodePick.id, label: nodePick.label } : undefined
    else if (type === 'openLink') target = { kind: 'url', id: url, label: url }
    else if (needsVar) { const v = doc.variables.find((x) => x.id === varId); target = { kind: 'var', id: varId, label: type === 'incVar' ? (varVal || '1') : (type === 'toggleVar' ? '' : varVal) } }
    const a: Action = { id: initial?.id || ('a' + Math.random().toString(36).slice(2, 8)), type, target, delay: delay || undefined, showId: type === 'showAndHide' ? showNode?.id : undefined, hideId: type === 'showAndHide' ? hideNode?.id : undefined }
    onSave(a); onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="إضافة / تعديل إجراء" full>
      <div className="space-y-3">
        <Field label="نوع الإجراء">
          <div className="no-scrollbar grid max-h-52 grid-cols-1 gap-1 overflow-y-auto">
            {TYPES.map((o) => (
              <button key={o.t} onClick={() => setT(o.t)} className={'rounded-xl px-3 py-2.5 text-start text-[13.5px] tap ' + (type === o.t ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-700')}>{o.label}</button>
            ))}
          </div>
        </Field>

        {needsPage && <Field label="الصفحة الهدف"><Select value={pageId} onChange={setPageId} options={[{value:'',label:'اختر صفحة…'}, ...doc.pages.map((p) => ({ value: p.id, label: p.name + ' — ' + p.path }))]} /></Field>}
        {needsPopup && <Field label="النافذة"><Select value={popupId} onChange={setPopupId} options={[{value:'',label:'أقرب نافذة'}, ...doc.popups.map((p) => ({ value: p.id, label: p.name }))]} /></Field>}
        {needsBar && <Field label="الشريط"><Select value={barId} onChange={setBarId} options={[{value:'',label:'اختر…'}, ...doc.bars.map((b) => ({ value: b.id, label: b.name }))]} /></Field>}
        {needsFlow && <Field label="التدفق"><Select value={flowId} onChange={setFlowId} options={[{value:'',label:'اختر…'}, ...doc.flows.map((f) => ({ value: f.id, label: f.name }))]} /></Field>}
        {needsNode && <NodePicker doc={doc} value={nodePick} onPick={setNodePick} />}
        {type === 'showAndHide' && <>
          <Field label="المكوّن الذي يظهر"><NodePickB doc={doc} value={showNode} onPick={setShowNode} /></Field>
          <Field label="المكوّن الذي يُخفى"><NodePickB doc={doc} value={hideNode} onPick={setHideNode} /></Field>
        </>}
        {needsVar && <>
          <Field label="المتغير">
            {doc.variables.length === 0 ? <div className="rounded-xl bg-amber-50 p-2.5 text-[12px] text-amber-700">لا متغيرات بعد — أضفها من إعدادات الموقع ← المتغيرات.</div> :
              <Select value={varId} onChange={setVarId} options={[{ value: '', label: 'اختر متغيرًا…' }, ...doc.variables.map((v) => ({ value: v.id, label: v.name + (v.vtype === 'number' ? ' (رقم)' : v.vtype === 'bool' ? ' (منطقي)' : '') }))]} />}
          </Field>
          {type === 'setVar' && varId && <Field label="القيمة الجديدة"><TextInput dir="ltr" value={varVal} onChange={(e: any) => setVarVal(e.target.value)} placeholder={doc.variables.find((v) => v.id === varId)?.vtype === 'bool' ? 'true/false' : ''} /></Field>}
          {type === 'incVar' && <Field label="قيمة الزيادة (افتراضي 1)"><TextInput dir="ltr" type="number" value={varVal} onChange={(e: any) => setVarVal(e.target.value)} placeholder="1" /></Field>}
        </>}
        {type === 'openLink' && <Field label="الرابط الخارجي"><TextInput dir="ltr" value={url} onChange={(e: any) => setUrl(e.target.value)} placeholder="https://…" /></Field>}
        <Field label="تأخير (بالثواني)"><TextInput type="number" value={delay} onChange={(e: any) => setDelay(Number(e.target.value) || 0)} /></Field>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={onClose} className="rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 tap">إلغاء</button>
          <button onClick={save} className="btn-primary rounded-xl py-3 font-semibold tap">حفظ الإجراء</button>
        </div>
      </div>
    </BottomSheet>
  )
}

// عرض بسيط لاختيار عقدة من كل صفحات/أشرطة/نوافذ الموقع
export function pickTree(doc: DB): { id: string; label: string; kind: string }[] {
  const out: { id: string; label: string; kind: string }[] = []
  const walk = (n: Node, prefix: string, owner: string) => {
    for (const c of n.children || []) {
      out.push({ id: c.id, label: `${owner} / ${prefix}${NTYPE_LABEL[c.type]}: ${c.name}`, kind: 'node' })
      walk(c, prefix + '— ', owner)
    }
  }
  for (const p of doc.pages) { walk(p.root, '', 'صفحة ' + p.name) }
  for (const b of doc.bars) { walk(b.root, '', 'شريط ' + b.name) }
  for (const p of doc.popups) { walk(p.root, '', 'نافذة ' + p.name) }
  return out
}

function NodePicker({ doc, value, onPick }: { doc: DB; value: { id: string; label: string } | null; onPick: (v: { id: string; label: string } | null) => void }) {
  const items = useMemo(() => pickTree(doc), [doc])
  return <Field label="المكوّن الهدف"><div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100">
    {items.map((it) => <button key={it.id} onClick={() => onPick({ id: it.id, label: it.label })} className={'block w-full truncate px-3 py-2 text-start text-[12.5px] tap ' + (value?.id === it.id ? 'bg-sky-50 text-sky-700' : 'text-slate-600')}>{it.label}</button>)}
  </div></Field>
}
function NodePickB({ doc, value, onPick }: { doc: DB; value: { id: string; label: string } | null; onPick: (v: { id: string; label: string } | null) => void }) {
  const items = useMemo(() => pickTree(doc), [doc])
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)} className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-600 tap">{value ? '✓ ' + value.label : 'اختر مكوّنًا…'}</button>
    {open && <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-100">{items.map((it) => <button key={it.id} onClick={() => { onPick({ id: it.id, label: it.label }); setOpen(false) }} className="block w-full truncate px-3 py-2 text-start text-[12.5px] text-slate-600 tap">{it.label}</button>)}</div>}
  </>
}

export function actionLabel(a: Action): string {
  const t = TYPES.find((x) => x.t === a.type)
  const tar = a.target?.label ? ' ← ' + a.target.label : a.type === 'showAndHide' ? '' : ''
  return (t?.label || a.type) + tar
}
