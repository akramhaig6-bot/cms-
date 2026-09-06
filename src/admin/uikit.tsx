import { type ReactNode, useEffect, useState } from 'react'
import { Icon } from '../lib/icons'

export function Field({ label, children, hint, error }: { label?: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12.5px] font-medium text-slate-600">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-[11.5px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] font-medium text-rose-600">{error}</span>}
    </label>
  )
}

export function TextInput(props: any) {
  return <input {...props} className={'field ' + (props.className || '')} />
}
export function TextArea(props: any) {
  return <textarea rows={props.rows || 3} {...props} className={'field ' + (props.className || '')} />
}

export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <div className={'relative ' + (className || '')}>
      <select className="field appearance-none pl-9" style={{ paddingInlineEnd: 34 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-slate-400"><Icon name="chevron-down" size={16} /></div>
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={'relative h-7 w-12 shrink-0 rounded-full transition-colors tap ' + (on ? 'bg-sky-500' : 'bg-slate-200')}>
      <span className={'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ' + (on ? 'start-[22px]' : 'start-0.5')} />
    </button>
  )
}

export function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: ReactNode }[] }) {
  return (
    <div className="flex gap-1 rounded-xl bg-sky-100/70 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={'flex-1 rounded-lg px-2 py-2 text-[12.5px] font-semibold transition tap ' + (value === o.value ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ label, active, onClick }: { label: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={'tap shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition ' + (active ? 'bg-sky-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200')}>
      {label}
    </button>
  )
}

// ---------- طبقات ----------
export function Backdrop({ onClick, z = 40 }: { onClick: () => void; z?: number }) {
  return <div onClick={onClick} className="fixed inset-0 bg-slate-900/35 fadein" style={{ zIndex: z, backdropFilter: 'blur(2px)' }} />
}

export function BottomSheet({ open, onClose, children, title, z = 50, full }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; z?: number; full?: boolean }) {
  if (!open) return null
  return (
    <>
      <Backdrop z={z - 1} onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sheet sheetup flex flex-col" style={{ zIndex: z, maxHeight: full ? '100%' : '88%', height: full ? '100%' : 'auto' }}>
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200" />
        {title && <div className="flex items-center justify-between px-4 py-2.5">
          <div className="text-[15px] font-bold text-slate-800">{title}</div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 tap"><Icon name="close" size={18} /></button>
        </div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-1">{children}</div>
      </div>
    </>
  )
}

export function Drawer({ open, onClose, children, title, z = 50 }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; z?: number }) {
  if (!open) return null
  return (
    <>
      <Backdrop z={z - 1} onClick={onClose} />
      <aside className="fixed inset-y-0 start-0 drawer flex w-[84%] max-w-[330px] flex-col bg-white" style={{ zIndex: z }}>
        <div className="adminbar flex items-center justify-between px-4 py-4">
          <div className="text-[15px] font-bold text-slate-800">{title}</div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 tap"><Icon name="close" size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{children}</div>
      </aside>
    </>
  )
}

export function Modal({ open, onClose, children, z = 60, title }: { open: boolean; onClose: () => void; children: ReactNode; z?: number; title?: ReactNode }) {
  if (!open) return null
  return (
    <>
      <Backdrop z={z - 1} onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 flex items-end justify-center sm:items-center" style={{ zIndex: z }}>
        <div className="soft fadein w-full rounded-t-3xl bg-white p-4 pb-[max(18px,env(safe-area-inset-bottom))] sm:m-4 sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
          {title && <div className="mb-3 flex items-center justify-between"><div className="text-[16px] font-bold">{title}</div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 tap"><Icon name="close" size={18} /></button></div>}
          {children}
        </div>
      </div>
    </>
  )
}

export function Confirm({ open, onClose, onYes, title, body, danger }: { open: boolean; onClose: () => void; onYes: () => void; title: string; body: ReactNode; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="text-center">
        <div className={'mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ' + (danger ? 'bg-rose-50 text-rose-500' : 'bg-sky-50 text-sky-500')}>
          <Icon name={danger ? 'trash' : 'check'} size={26} />
        </div>
        <h3 className="mb-1 text-[17px] font-bold text-slate-800">{title}</h3>
        <div className="mb-5 text-[13px] leading-relaxed text-slate-500">{body}</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 tap">إلغاء</button>
          <button onClick={() => { onYes(); onClose(); }} className={'rounded-xl py-3 font-semibold text-white tap ' + (danger ? 'bg-rose-500' : 'bg-sky-500')}>تأكيد</button>
        </div>
      </div>
    </Modal>
  )
}

export function Empty({ icon, title, desc, action }: { icon?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="pagebody flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-500">
        <Icon name={icon || 'layers'} size={30} />
      </div>
      <h3 className="mb-1 text-[16px] font-bold text-slate-800">{title}</h3>
      {desc && <p className="mb-5 max-w-xs text-[13px] leading-relaxed text-slate-500">{desc}</p>}
      {action}
    </div>
  )
}

// شريط رأس قياسي للشاشات الفرعية
export function SubTopBar({ back, title, trailing, right }: { back?: () => void; title: ReactNode; trailing?: ReactNode; right?: ReactNode }) {
  return (
    <div className="adminbar sticky top-0 z-30 flex items-center gap-2 px-2 py-2">
      {back && <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 tap hover:bg-sky-50"><Icon name="arrow-right" size={20} /></button>}
      <div className="flex-1 truncate px-1 text-[16px] font-bold text-slate-800">{title}</div>
      {right && <div className="flex items-center gap-1">{right}</div>}
      {trailing}
    </div>
  )
}

export function StatusDot({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {text}
    </span>
  )
}

export function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <button className="card-sky soft-sm tap flex flex-col items-center gap-0.5 px-1 py-3">
      <span className="text-[19px] font-extrabold text-sky-700">{value}</span>
      <span className="text-[11px] text-slate-500">{label}</span>
    </button>
  )
}
