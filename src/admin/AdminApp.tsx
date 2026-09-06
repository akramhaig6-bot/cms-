import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { uid } from '../lib/util'
import { Icon } from '../lib/icons'
import { Drawer, BottomSheet, Field, TextInput } from './uikit'
import { Dashboard, Settings, PublishScreen, FlowsScreen, LibsScreen, MediaScreen, BrokenScreen } from './Screens'
import { PagesList, BarsList, PopupsList } from './Lists'
import Editor, { type EditKind } from './Editor'
import { Preview } from './Preview'

type View =
  | 'dashboard' | 'pages' | 'bars' | 'popups' | 'media' | 'flows' | 'settings' | 'publish' | 'preview' | 'libs' | 'broken'
  | { editor: { kind: EditKind; id: string } }

export default function AdminApp() {
  const store = useStore()
  if (!store.session.loggedIn) return <Login />
  return <Shell />
}

function Login() {
  const store = useStore()
  const [mode, setMode] = useState<'login' | 'recover'>('login')
  const [handle, setHandle] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = () => {
    if (!handle.trim() || !code) { setErr('يرجى تعبئة الحقلين'); return }
    setBusy(true)
    setTimeout(() => {
      const r = store.login(handle, code)
      setBusy(false)
      if (!r.ok) setErr(r.msg)
    }, 500)
  }
  const requestRecovery = () => {
    if (!handle.trim()) { setErr('أدخل معرّف الحساب أولًا'); return }
    const acc = store.db.settings.accounts.find((a) => a.handle === handle.trim())
    if (!acc) { setErr('لا يوجد حساب بهذا المعرف'); return }
    const id = uid('rec')
    localStorage.setItem('cms_pending_' + handle.trim(), id)
    store.notify({ type: 'recover', text: `طلب استعادة صلاحية دخول للحساب «${handle.trim()}».`, ref: { kind: 'recover', id, label: handle.trim() } })
    setErr(''); setMode('recover2')
  }
  // استلام رمز من المالك وتثبيت رمز جديد
  const applyRecovery = () => {
    const pending = localStorage.getItem('cms_pending_' + handle.trim())
    if (!pending) { setErr('لا يوجد طلب استعادة نشط لهذا الحساب'); return }
    const ownerGrants = JSON.parse(localStorage.getItem('cms_recovery_codes') || '{}') as any
    const granted = ownerGrants[handle.trim()]
    if (!granted || granted.id !== pending) { setErr('الرمز غير صحيح أو منتهي'); return }
    if (!code.trim()) { setErr('أدخل رمز دخول جديد'); return }
    const db = store.db
    const accounts = db.settings.accounts.map((a) => (a.handle === handle.trim() ? { ...a, code: code.trim() } : a))
    store.setDB({ ...db, settings: { ...db.settings, accounts } })
    localStorage.removeItem('cms_pending_' + handle.trim())
    localStorage.removeItem('cms_recovery_codes')
    store.toast('تم تعيين الرمز الجديد — سجّل الدخول الآن', 'ok')
    setMode('login'); setCode('')
  }
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-sky-100 to-sky-50 px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-sky-200/40 soft">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-white"><Icon name="layers" size={30} /></div>
          <h1 className="mb-1 text-center text-xl font-extrabold text-slate-800">لوحة إدارة المحتوى</h1>
          <p className="mb-5 text-center text-[12.5px] text-slate-400">تسجيل دخول المدير — /admin</p>
          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2 text-[11.5px] text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> متصل بنظام المحتوى</div>
          <div className="space-y-3">
            <Field label="معرّف الدخول"><TextInput value={handle} onChange={(e: any) => setHandle(e.target.value)} placeholder="admin" dir="ltr" /></Field>
            <Field label={mode === 'recover2' ? 'رمز الاستعادة ثم رمز الدخول الجديد' : 'رمز التحقق'}>
              <TextInput type={mode === 'recover2' ? 'text' : 'password'} value={code} onChange={(e: any) => setCode(e.target.value)} placeholder={mode === 'recover2' ? 'استلم الرمز من المالك…' : '••••'} dir="ltr" />
            </Field>
            {err && <div className="rounded-xl bg-rose-50 p-2.5 text-center text-[12.5px] text-rose-600">{err}</div>}
            <button onClick={mode === 'recover' ? requestRecovery : mode === 'recover2' ? applyRecovery : submit} disabled={busy} className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold tap disabled:opacity-70">
              {busy ? <span className="spin h-5 w-5 rounded-full border-2 border-white/40 border-t-white" /> : mode === 'recover' ? 'إرسال طلب الاستعادة' : mode === 'recover2' ? 'تثبيت الرمز الجديد' : 'دخول'}
            </button>
            {mode !== 'login' ? (
              <button onClick={() => { setMode('login'); setErr('') }} className="w-full pt-1 text-center text-[12.5px] font-semibold text-sky-600 tap">← العودة إلى شاشة الدخول</button>
            ) : (
              <button onClick={() => { setMode('recover'); setErr(''); setCode('') }} className="w-full pt-1 text-center text-[12.5px] font-semibold text-sky-600 tap">نسيت رمز التحقق؟ استعادة الدخول</button>
            )}
          </div>
          <p className="mt-4 rounded-xl bg-sky-50 p-2.5 text-center text-[11.5px] text-sky-700">حساب تجريبي: <b dir="ltr">admin / admin123</b></p>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const store = useStore()
  const [view, setView] = useState<View>('dashboard')
  const [drawer, setDrawer] = useState(false)
  const [notif, setNotif] = useState(false)
  const [autoFocus, setAutoFocus] = useState<string | null>(null)
  const db = store.db
  useEffect(() => { const f = () => { setNotif(false); setDrawer(false); setView('broken') }; window.addEventListener('cms:gobroken', f); return () => window.removeEventListener('cms:gobroken', f) }, [])
  const go = (v: string) => {
    setDrawer(false); setAutoFocus(null)
    if (v.startsWith('edit:')) { const [, id, k] = v.split(':'); setView({ editor: { kind: k as EditKind, id } }); return }
    if (v === 'newpage') { const e = store.addEntity('pages', {}); setView({ editor: { kind: 'pages', id: e.id } }); return }
    if (['dashboard','pages','bars','popups','media','flows','settings','publish','preview','libs','broken'].includes(v)) setView(v as any)
  }
  const openRef = (kind: EditKind, id: string, nodeId: string) => { setAutoFocus(nodeId); setView({ editor: { kind, id } }); setDrawer(false) }
  const exitEditor = (list: View) => { setAutoFocus(null); setView(list) }
  const unread = store.notifications.filter((n) => !n.read).length

  const sections: [string, string, View][] = [
    ['dashboard','لوحة التحكم','dashboard'], ['pages','الصفحات','pages'], ['bars','الأشرطة','bars'], ['popups','النوافذ المنبثقة','popups'],
    ['libs','مكتبة المكونات','libs'], ['media','مكتبة الوسائط','media'], ['flows','التدفقات','flows'],
    ['preview','المعاينة المباشرة','preview'], ['publish','النشر والحفظ','publish'], ['broken','المراجع المكسورة','broken'], ['settings','إعدادات الموقع','settings'],
  ]
  const icons: Record<string, string> = { dashboard:'grid', pages:'layers', bars:'flow', popups:'external', libs:'palette', media:'image', flows:'send', preview:'eye', publish:'check', broken:'link', settings:'settings' }

  const isHome = view === 'dashboard'
  const isEditor = typeof view === 'object'

  const currentView = (() => {
    if (typeof view === 'object') {
      const e = view.editor
      const list = e.kind === 'pages' ? 'pages' : e.kind === 'bars' ? 'bars' : e.kind === 'popups' ? 'popups' : 'libs'
      return <Editor key={e.kind + e.id} kind={e.kind} id={e.id} autoFocusId={autoFocus} onExit={() => exitEditor(list as any)} onPreview={() => setView('preview')} />
    }
    switch (view) {
      case 'dashboard': return <Dashboard go={go} />
      case 'pages': return <PagesList back={() => setView('dashboard')} openEditor={(id) => setView({ editor: { kind: 'pages', id } })} />
      case 'bars': return <BarsList back={() => setView('dashboard')} openEditor={(id) => setView({ editor: { kind: 'bars', id } })} goEditType={() => {}} />
      case 'popups': return <PopupsList back={() => setView('dashboard')} openEditor={(id) => setView({ editor: { kind: 'popups', id } })} />
      case 'libs': return <LibsScreen back={() => setView('dashboard')} edit={(id) => setView({ editor: { kind: 'libs', id } })} />
      case 'media': return <MediaScreen back={() => setView('dashboard')} backToHome={() => setView('dashboard')} />
      case 'flows': return <FlowsScreen back={() => setView('dashboard')} />
      case 'settings': return <Settings back={() => setView('dashboard')} openPage={(id) => setView({ editor: { kind: 'pages', id } })} />
      case 'publish': return <PublishScreen back={() => setView('dashboard')} />
      case 'preview': return <Preview back={() => setView('dashboard')} />
      case 'broken': return <BrokenScreen back={() => setView('dashboard')} openRef={openRef} />
      default: return <Dashboard go={go} />
    }
  })()

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden border-x border-slate-200 bg-sky-50/70 shadow-2xl">
      {!isEditor && <header className="adminbar z-40 flex items-center gap-2 px-2 py-2">
        <button onClick={() => setDrawer(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 tap hover:bg-sky-100"><Icon name="menu" size={22} /></button>
        <button onClick={() => setView('dashboard')} className="flex min-w-0 flex-1 items-center gap-2 text-start">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white"><Icon name="layers" size={17} /></span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-extrabold leading-tight text-slate-800">نظام إدارة المحتوى</span>
            <span className="block text-[10.5px] text-slate-400">{db.settings.siteName} · {store.saveState === 'saved' ? 'محفوظ' : 'حفظ…'}</span>
          </span>
        </button>
        <button onClick={() => setNotif(true)} className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 tap hover:bg-sky-100">
          <Icon name="bell" size={21} />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unread}</span>}
        </button>
        <MenuAccount onLogout={() => { store.logout(); setView('dashboard') }} />
      </header>}

      <main className={'relative min-h-0 flex-1 ' + (isEditor ? 'h-full' : '')}>
        {isEditor && <div className="h-full">{currentView}</div>}
        {!isEditor && currentView}
      </main>

      {!isHome && !isEditor && <FloatingHome onHome={() => setView('dashboard')} />}

      {/* درج القائمة */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="قائمة الإدارة">
        <nav className="space-y-1">
          {sections.map(([k, label]) => {
            const active = (view as any) === k
            return <button key={k} onClick={() => go(k)} className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start tap ' + (active ? 'bg-sky-500 text-white' : 'text-slate-700 hover:bg-sky-50')}>
              <span className={'flex h-9 w-9 items-center justify-center rounded-xl ' + (active ? 'bg-white/20' : 'bg-sky-100 text-sky-600')}><Icon name={(icons as any)[k] || 'grid'} size={18} /></span>
              <span className="text-[13.5px] font-semibold">{label}</span>
            </button>
          })}
        </nav>
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 p-4 text-white">
          <div className="text-[13px] font-bold">{db.settings.siteName}</div>
          <div className="mt-1 text-[11px] opacity-90">{store.pendingCount} تغيير بانتظار النشر</div>
          <a href="/client" target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-[12px] font-semibold tap">فتح /client في نافذة جديدة <Icon name="external" size={14} /></a>
        </div>
      </Drawer>

      {/* الإشعارات */}
      <Notifications open={notif} onClose={() => setNotif(false)} go={() => { setNotif(false); setView('publish') }} />
      <ToastStack />
    </div>
  )
}

function MenuAccount({ onLogout }: { onLogout: () => void }) {
  const store = useStore()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-[15px] font-bold text-sky-700 tap">{(store.session.name || 'م')[0]}</button>
      {open && <><div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /><div className="absolute left-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
        <div className="border-b px-3 py-2"><div className="text-[13px] font-bold text-slate-700">{store.session.name}</div><div className="text-[10.5px] text-slate-400">@{store.session.accountId?.slice(0, 6)} · دور: {store.session.role}</div></div>
        <button onClick={() => { store.toast('الملف الشخصي قيد التطوير', 'info'); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2.5 text-[12.5px] tap hover:bg-sky-50">👤 الملف الشخصي</button>
        <button onClick={() => { onLogout(); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2.5 text-[12.5px] text-rose-600 tap hover:bg-rose-50"><Icon name="logout" size={15} /> تسجيل الخروج</button>
      </div></>}
    </div>
  )
}

function FloatingHome({ onHome }: { onHome: () => void }) {
  return <button onClick={onHome} className="tap absolute bottom-4 start-3 z-20 flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[12.5px] font-semibold text-sky-700 shadow-lg border border-sky-100"><Icon name="arrow-right" size={15} /> لوحة التحكم</button>
}

function ToastStack() {
  const store = useStore()
  const colors: any = { ok: '#059669', err: '#dc2626', info: '#0f172a' }
  return <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[300] flex flex-col items-center gap-2 px-4">
    {store.toasts.map((t) => <div key={t.id} className="toast-enter rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg" style={{ background: colors[t.type] }}>{t.msg}</div>)}
  </div>
}

function Notifications({ open, onClose, go }: { open: boolean; onClose: () => void; go: () => void }) {
  const store = useStore()
  const iconByType: any = { success: { ic: 'check', bg: '#d1fae5', c: '#059669' }, error: { ic: 'close', bg: '#fee2e2', c: '#dc2626' }, warn: { ic: 'bell', bg: '#fef3c7', c: '#d97706' }, info: { ic: 'info', bg: '#e0f2fe', c: '#0284c7' }, recover: { ic: 'undo', bg: '#e0f2fe', c: '#0284c7' } }
  return (
    <BottomSheet open={open} onClose={onClose} title="الإشعارات" full>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => store.markAllRead()} className="text-[12px] font-semibold text-sky-600 tap">تعليم الكل كمقروء</button>
        <span className="text-[11.5px] text-slate-400">{store.notifications.filter((n) => !n.read).length} غير مقروء</span>
      </div>
      <div className="space-y-2 pb-4">
        {store.notifications.length === 0 && <div className="py-10 text-center text-[13px] text-slate-400">لا إشعارات.</div>}
        {store.notifications.map((n) => { const m = iconByType[n.type] || iconByType.info; return (
          <div key={n.id} onClick={() => store.markAllRead()} className={'rounded-2xl border p-3 ' + (n.read ? 'border-slate-100 bg-white' : 'border-sky-200 bg-sky-50')}>
            <div className="flex gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: m.bg, color: m.c }}><Icon name={m.ic} size={16} /></span>
              <div className="flex-1"><p className="text-[13px] leading-relaxed text-slate-700">{n.text}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{new Date(n.at).toLocaleString('ar')}</p></div>
              <button onClick={() => store.removeNotif(n.id)} className="text-slate-300 tap"><Icon name="close" size={14} /></button>
            </div>
            {n.type === 'warn' && n.text.includes('حذف') && <button onClick={go} className="mt-2 w-full rounded-lg bg-sky-100 py-2 text-[12px] font-semibold text-sky-700 tap">الذهاب إلى النشر / المراجع المكسورة</button>}
            {n.type === 'recover' && n.ref?.kind === 'recover' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => {
                  const handle = n.ref.label || ''
                  const id = n.ref.id || ''
                  const code = 'RC' + Math.floor(100000 + Math.random() * 899999)
                  const codes = JSON.parse(localStorage.getItem('cms_recovery_codes') || '{}')
                  codes[handle] = { id, code }
                  localStorage.setItem('cms_recovery_codes', JSON.stringify(codes))
                  store.removeNotif(n.id)
                  store.notify({ type: 'success', text: `تم قبول الاستعادة. رمز التفعيل: ${code} — سلّمه لصاحب الحساب.` })
                  store.toast('تم توليد رمز الاستعادة', 'ok')
                }} className="rounded-lg bg-emerald-500 py-2 text-[12px] font-semibold text-white tap">قبول</button>
                <button onClick={() => { store.removeNotif(n.id); store.notify({ type: 'info', text: 'تم رفض طلب الاستعادة.' }) }} className="rounded-lg bg-slate-100 py-2 text-[12px] font-semibold text-slate-600 tap">رفض</button>
              </div>
            )}
          </div>) })}
      </div>
    </BottomSheet>
  )
}
