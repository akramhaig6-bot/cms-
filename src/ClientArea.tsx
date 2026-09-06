import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import Site from './site/Site'

export default function ClientArea() {
  const store = useStore()
  const loc = useLocation()
  const [loading, setLoading] = useState(true)
  const [updateMsg, setUpdateMsg] = useState(false)
  const firstPub = useRef(true)
  let path = loc.pathname.replace(/^\/client/, '')
  if (loc.pathname === '/client') path = '/'
  if (loc.search) path += loc.search
  const published = store.published

  // هيكل عظمي أثناء التحميل/الانتقال (محاكاة تحميل تدريجي)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 320)
    return () => clearTimeout(t)
  }, [path])

  // تنبيه الزائر عندما ينشر المدير تغييرات جديدة أثناء التصفح
  useEffect(() => {
    if (firstPub.current) { firstPub.current = false; return }
    setUpdateMsg(true)
    const t = setTimeout(() => setUpdateMsg(false), 6000)
    return () => clearTimeout(t)
  }, [published])

  if (loading) return <Skeleton />
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <Site doc={published} initialPath={path} isolated={false} />
      {updateMsg && (
        <div className="toast-enter" style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 400, maxWidth: '92%' }}>
          <button onClick={() => setUpdateMsg(false)} className="flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg tap">
            🔄 تم تحديث الموقع — اضغط للتحديث
          </button>
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div dir="rtl" className="bg-white" style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="skel h-7 w-24" />
        <div className="flex gap-2"><div className="skel h-5 w-10" /><div className="skel h-5 w-10" /><div className="skel h-5 w-10" /></div>
      </div>
      <div className="space-y-3 p-4">
        <div className="skel h-44 w-full rounded-2xl" />
        <div className="skel h-5 w-3/4" />
        <div className="skel h-5 w-1/2" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skel h-28 w-full rounded-xl" />
          <div className="skel h-28 w-full rounded-xl" />
          <div className="skel h-28 w-full rounded-xl" />
          <div className="skel h-28 w-full rounded-xl" />
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 flex justify-around border-t border-slate-100 bg-white py-2"><div className="skel h-6 w-10" /><div className="skel h-6 w-10" /><div className="skel h-6 w-10" /></div>
    </div>
  )
}
