import { useState } from 'react'
import { useStore } from '../lib/store'
import Site from '../site/Site'
import { SubTopBar, Seg } from './uikit'
import { Icon } from '../lib/icons'

export function Preview({ back }: { back: () => void }) {
  const store = useStore()
  const db = store.db
  const [source, setSource] = useState<'draft' | 'published'>('draft')
  const [path, setPath] = useState<string>('/')
  const [k, setK] = useState(0)
  const doc = source === 'draft' ? db : store.published
  const pages = doc.pages.filter((p) => p.status === 'published')
  return (
    <div className="flex h-full flex-col bg-sky-900/5">
      <SubTopBar back={back} title="المعاينة المباشرة"
        right={<>
          <button onClick={() => { const u = '/client' + path; navigator.clipboard?.writeText(window.location.origin + u); store.toast('تم نسخ رابط /client', 'ok') }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 tap" title="نسخ الرابط"><Icon name="share" size={17} /></button>
          <a href={'/client' + path} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-1 rounded-xl bg-sky-500 px-3 text-[12.5px] font-bold text-white tap"><Icon name="external" size={14} /> فتح في /client</a>
          <button onClick={() => setK((x) => x + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 tap" title="تحديث"><Icon name="redo" size={16} /></button>
        </>} />
      <div className="px-3 py-2">
        <Seg value={source} onChange={(v) => setSource(v as any)} options={[{ value: 'draft', label: 'أحدث المسودات' }, { value: 'published', label: 'المنشورة' }]} />
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          {pages.length === 0 && <ChipP label="لا صفحات منشورة" />}
          {pages.map((p) => <ChipP key={p.id} label={p.path} active={path === p.path} onClick={() => setPath(p.path)} />)}
        </div>
        {source === 'published' && pages.length === 0 && <p className="mt-2 text-center text-[12px] text-amber-600">لا توجد نسخة منشورة بعد — انشر أولًا.</p>}
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto px-3 pb-4 no-scrollbar">
        <div className="soft relative h-[min(76vh,760px)] w-[min(100%,370px)] shrink-0 overflow-hidden rounded-[30px] border-[7px] border-slate-800 bg-white">
          {/* شريط صوتية */}
          <div className="absolute left-1/2 top-1.5 z-50 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-800" style={{ top: 8 }} />
          <div className="absolute inset-0" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <Site key={source + path + k} doc={doc} initialPath={path} isolated />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChipP({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold tap ' + (active ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border')}>{label}</button>
}
