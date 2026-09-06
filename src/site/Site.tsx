import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Bar, DB, Node, ProgressCfg, Settings } from '../types'
import { SiteEngine, hasClickActions } from './engine'
import { buildStyle, containerFlexStyle, containerDirection } from '../lib/style'
import { LeafContent } from '../lib/primitives'
import { isContainer } from '../lib/util'
import { Icon } from '../lib/icons'
import { resolveMedia } from '../lib/media'
import { useWindowQuery } from '../lib/useMatchMedia'

interface Props {
  doc: DB
  initialPath?: string
  isolated?: boolean
}

export function expandVars(text: string, eng: SiteEngine): string {
  if (!text || !text.includes('[[')) return text
  return text.replace(/\[\[var:([^\]]+)\]\]/g, (_, name) => {
    const v = eng.doc.variables.find((x) => x.name === name || x.id === name)
    if (!v) return ''
    const val = eng.vars[v.id]
    return val == null ? String(v.def ?? '') : String(val)
  })
}

function animStyle(node: Node, reduce: boolean): CSSProperties | undefined {
  if (reduce || !node.animIn || node.animIn === 'none') return undefined
  return { animation: animMap[node.animIn] || 'aFade .3s ease both' }
}
const animMap: Record<string, string> = { fade: 'aFade .3s ease both', 'slide-up': 'aUp .3s ease both', 'slide-down': 'aDown .3s ease both', zoom: 'aZoom .3s ease both' }

function resolvePageId(doc: DB, path?: string, depth = 0): string | undefined {
  let p = path || '/'
  if (!p.startsWith('/')) p = '/' + p
  const direct = doc.pages.find((x) => x.path === p && x.status === 'published')
  if (direct) return direct.id
  // حماية من حلقات إعادة التوجيه اللانهائية
  if (depth < 5) for (const r of doc.settings.redirects) if (r.from === p && r.to !== p) return resolvePageId(doc, r.to, depth + 1)
  if (p === '/' && doc.settings.homePageId) {
    const home = doc.pages.find((x) => x.id === doc.settings.homePageId)
    if (home && home.status === 'published') return home.id
  }
  if (p === '/') { const first = doc.pages.find((x) => x.status === 'published'); return first?.id }
  return undefined
}

export default function Site({ doc, initialPath = '/', isolated = false }: Props) {
  const settings = doc.settings
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const engRef = useRef<SiteEngine | null>(null)
  const docRef = useRef(doc); docRef.current = doc

  const [view, setView] = useState(() => ({ pageId: resolvePageId(doc, initialPath) }))
  const isTiny = useWindowQuery('(max-width: 380px)')
  const reduceMotion = settings.reduceMotion
  const viewRef = useRef(view); viewRef.current = view
  const histRef = useRef<string[]>([])

  // سلوك الروابط العميقة (Deep Links)
  useEffect(() => {
    if (isolated) return
    const handleHash = () => {
      const hash = window.location.hash.slice(1)
      if (!hash || !engRef.current) return
      const targetId = hash
      const p = engRef.current.doc.popups.find(x => x.id === targetId)
      if (p) {
        engRef.current.openPopup(targetId)
        return
      }
      engRef.current.show(targetId)
      const el = document.getElementById('node-' + targetId)
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [isolated, reduceMotion])

  const showToast = useCallback((msg: string, type: 'ok' | 'err' | 'info' = 'info') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2400)
  }, [])

  const hooksRef = useRef<any>(null)

  const gotoPage = useCallback((pageId: string) => {
    const d = docRef.current
    const p = d.pages.find((x) => x.id === pageId)
    if (!p || p.status !== 'published') { showToast('لا يمكن إتمام الإجراء الآن', 'err'); return }
    const cur = viewRef.current.pageId
    if (cur && cur !== pageId) histRef.current = [...histRef.current.slice(-40), cur]
    setView({ pageId })
    if (!isolated) { const url = '/client' + p.path; window.history.pushState({}, '', url); document.title = (p.title || p.name) + ' | ' + d.settings.siteName }
  }, [isolated, showToast])

  const goBack = useCallback(() => {
    const eng = engRef.current
    if (eng && eng.popups.length) { eng.closeTop(); return }
    if (histRef.current.length) {
      const prev = histRef.current[histRef.current.length - 1]
      histRef.current = histRef.current.slice(0, -1)
      setView({ pageId: prev })
      if (!isolated) { const p = docRef.current.pages.find((x) => x.id === prev); if (p) { window.history.pushState({}, '', '/client' + p.path); document.title = (p.title || p.name) + ' | ' + docRef.current.settings.siteName } }
    } else if (!isolated) { showToast('لا توجد شاشة سابقة', 'info') }
  }, [isolated, showToast])

  if (!hooksRef.current) {
    hooksRef.current = { toast: showToast, gotoPage, backRequest: goBack }
  } else {
    hooksRef.current.toast = showToast
    hooksRef.current.gotoPage = gotoPage
    hooksRef.current.backRequest = goBack
  }

  if (!engRef.current) {
    engRef.current = new SiteEngine(doc, hooksRef.current)
    engRef.current.subscribe(refresh)
  }
  // إطلاق إجراءات «عند الظهور بالتمرير» مرة واحدة لكل صفحة (لا تُعاد مع كل تحديث للمسودة)
  const firedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (isolated || !view.pageId) return
    firedRef.current = new Set()
    const docNow = docRef.current
    const ids = new Set<string>()
    const scan = (n: Node) => { if (n.events?.onVisible?.length) ids.add(n.id); (n.children || []).forEach(scan) }
    const p = docNow.pages.find((x) => x.id === view.pageId); if (p) scan(p.root)
    if (!ids.size) return
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) {
        const id = (en.target as HTMLElement).dataset.cid
        if (id && ids.has(id) && !firedRef.current.has(id)) {
          firedRef.current.add(id)
          const node = engRef.current?.find(id)
          if (node) engRef.current?.run(node, node.events.onVisible || [])
        }
      }
    }, { threshold: 0.2 })
    document.querySelectorAll('[data-cid]').forEach((el) => { const id = (el as HTMLElement).dataset.cid; if (id && ids.has(id)) io.observe(el) })
    return () => io.disconnect()
  }, [view.pageId, isolated])
  const eng = engRef.current
  useEffect(() => { eng.setDoc(doc) }, [doc, eng])

  // مزامنة عنوان المتصفح عند الدخول المباشر
  useEffect(() => {
    if (!isolated) {
      const p = doc.pages.find((x) => x.id === view.pageId)
      if (p) { window.history.replaceState({}, '', '/client' + p.path); document.title = (p.title || p.name) + ' | ' + settings.siteName }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // مراقبة زر الرجوع في المتصفح
  useEffect(() => {
    if (isolated) return
    const onPop = (e: PopStateEvent) => {
      const engN = engRef.current
      if (engN && engN.popups.length) { engN.closeTop(); return }
      // المسارات العربية تصل مُرمَّزة (percent-encoded) — نفك الترميز قبل المقارنة
      let pathName = window.location.pathname
      try { pathName = decodeURIComponent(pathName) } catch { /* keep raw */ }
      const p = docRef.current.pages.find((x) => '/client' + x.path === pathName)
      if (p) setView({ pageId: p.id })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isolated])

  const page = view.pageId ? doc.pages.find((p) => p.id === view.pageId) : undefined
  const activeBars = useMemo(() => {
    const pid = view.pageId
    if (!pid) return []
    return doc.bars.filter((b) => !b.hidden && (b.scope === 'all' || (Array.isArray(b.scope) && b.scope.includes(pid))))
  }, [doc.bars, view.pageId])

  if (!page || !view.pageId) return <UnderConstruction settings={settings} onHome={() => { const id = resolvePageId(doc, '/'); if (id) gotoPage(id) }} />

  const topBars = activeBars.filter((b) => b.type === 'top' || b.type === 'nav')
  const bottomBars = activeBars.filter((b) => b.type === 'bottom')
  const sideBars = activeBars.filter((b) => b.type === 'side')
  const pageAvailable = page.status === 'published'

  const renderNode = (node: Node): React.ReactNode => {
    const vis = eng.isVisible(node.id, node.visible)
    if (!vis) return null
    if (isTiny && node.responsive?.hideOnTiny) return null
    // شرط ظهور مرتبط بحالة مكوّن آخر
    if (node.cond && node.cond.refId) {
      const refShown = eng.isVisible(node.cond.refId)
      const met = node.cond.op === 'hidden' ? !refShown : refShown
      if (!met) return null
    }
    const clickable = hasClickActions(node)
    const press = () => { if (node.events?.click?.length) eng.run(node, node.events.click) }
    if (isContainer(node.type)) {
      const style: CSSProperties = { ...buildStyle(node, settings), ...containerFlexStyle(node), ...animStyle(node, reduceMotion) }
      if ((node.style?.widthMode || 'full') !== 'px') style.width = '100%'
      if (node.style?.widthMode === 'px') style.width = (node.style.widthPx || 0) + 'px'
      return (
        <div key={node.id} data-cid={node.id} style={style}
          onClick={(e) => { if (clickable && node.events?.click) { e.stopPropagation(); press() } }}>
          {(node.children || []).map((c) => renderNode(c))}
        </div>
      )
    }
    const base = buildStyle(node, settings)
    const mediaArr = doc.media
    if (node.type === 'image') {
      const s = node.style || {}
      const { src } = resolveMedia(node, mediaArr)
      const box: CSSProperties = { position: 'relative', width: '100%', height: s.heightMode === 'px' && s.heightPx ? s.heightPx : 'auto', overflow: 'hidden', borderRadius: s.radius ?? 0, margin: [s.mt,s.mr,s.mb,s.ml].some(x=>x!=null)?`${s.mt??0}px ${s.mr??0}px ${s.mb??0}px ${s.ml??0}px`:undefined }
      return (
        <div key={node.id} data-cid={node.id} style={box} onClick={(e) => { if (clickable && node.events?.click) { e.stopPropagation(); press() } }}>
          <img src={src} alt={node.alt || node.name} style={{ width: '100%', height: '100%', objectFit: node.fit || 'cover', display: 'block' }} loading="lazy" />
        </div>
      )
    }
    const wrapStyle: CSSProperties = { position: 'relative' }
    if (node.type === 'text' && (!node.text || !node.text.trim())) {
      if (node.hideWhenEmpty) return null
    }
    // استبدال [[var:name]] في النصوص بقيم المتغيرات الحية
    const effNode = node.type === 'text' || node.type === 'button' ? { ...node, text: expandVars(node.text || '', eng) } : node
    if (clickable && node.type === 'button') {
      const prog = node.progress?.enabled ? node.progress : undefined
      if (prog) {
        return <InteractiveButton key={node.id} node={effNode} eng={eng} settings={settings} media={mediaArr} progress={prog} onClickEvent={() => { if (node.events?.click?.length) eng.run(node, node.events.click, { requireProgress: true }) }} />
      }
      return <span key={node.id} data-cid={node.id} onClick={(e) => { e.stopPropagation(); press() }} style={{ display: 'inline-block', cursor: 'pointer' }}><LeafContent node={effNode} ctx={{ settings, media: mediaArr }} /></span>
    }
    if (clickable) {
      return <div key={node.id} data-cid={node.id} onClick={(e) => { e.stopPropagation(); press() }} style={wrapStyle}><LeafContent node={effNode} ctx={{ settings, media: mediaArr }} /></div>
    }
    return <div key={node.id} data-cid={node.id} style={wrapStyle}><LeafContent node={effNode} ctx={{ settings, media: mediaArr }} /></div>
  }

  const renderBar = (bar: Bar) => {
    const folded = eng.isFolded(bar.id)
    if (bar.foldable && folded) {
      return (
        <div key={bar.id} style={{ display: 'flex', justifyContent: 'center', padding: 5 }}>
          <button onClick={() => eng.unfold(bar.id)} className="tap" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#eef7ff', color: '#0369a1', border: '1px solid #cfe9fb', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 600 }}>
            <Icon name="chevron-down" size={15} /> {bar.name}
          </button>
        </div>
      )
    }
    return (
      <div key={bar.id} style={{ position: 'relative', width: '100%' }}>
        {renderNode(bar.root)}
        {bar.foldable && (
          <button onClick={() => eng.fold(bar.id)} aria-label="طي" style={{ position: 'absolute', top: 4, insetInlineStart: 6, zIndex: 6, background: 'rgba(255,255,255,.9)', border: '1px solid #dbeafe', color: '#0c4a6e', borderRadius: 999, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-up" size={16} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div dir={settings.dir} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: settings.bg, color: settings.text, overflow: 'hidden', fontFamily: settings.activeFont && settings.activeFont !== 'system' ? settings.activeFont : undefined }}>
      {(topBars.length > 0 || sideBars.length > 0) && (
        <header style={{ position: 'relative', zIndex: 30, background: settings.bg, boxShadow: '0 1px 0 rgba(2,26,45,.05)' }}>
          {topBars.map(renderBar)}
        </header>
      )}
      <main style={{ position: 'relative', flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }} className="no-scrollbar">
        {!pageAvailable ? (
          <div style={{ padding: '46px 20px', textAlign: 'center', color: settings.muted }}>
            <div style={{ fontSize: 44 }}>🚧</div>
            <h3 style={{ margin: '10px 0 4px', color: settings.text, fontSize: 18 }}>الصفحة غير متاحة</h3>
            <p style={{ fontSize: 13 }}>هذه الصفحة ليست منشورة أو أنها مخفية حاليًا.</p>
          </div>
        ) : (
          <>
            {(page.root?.children || []).map((c) => renderNode(c))}
            <div style={{ height: bottomBars.length ? 84 : 30 }} />
          </>
        )}
      </main>
      {bottomBars.length > 0 && (
        <footer style={{ position: 'relative', zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom)', background: 'transparent' }}>
          {bottomBars.map(renderBar)}
        </footer>
      )}
      {eng.popups.map((pid, i) => (
        <PopupLayer key={pid} pid={pid} last={i === eng.popups.length - 1} eng={eng} doc={doc} settings={settings} />
      ))}
      {toast && (
        <div style={{ position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 300 }} className="toast-enter">
          <div style={{ background: toast.type === 'err' ? '#dc2626' : toast.type === 'ok' ? '#059669' : '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: 999, fontSize: 13, boxShadow: '0 8px 20px rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}>{toast.msg}</div>
        </div>
      )}
    </div>
  )
}

function UnderConstruction({ settings, onHome }: { settings: any; onHome: () => void }) {
  return (
    <div dir={settings.dir} style={{ height: '100%', background: settings.bg, color: settings.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 30 }}>
      <div style={{ fontSize: 54, marginBottom: 10 }}>🏗️</div>
      <h3 style={{ margin: 0, fontSize: 20 }}>{settings.siteName || 'الموقع'}</h3>
      <p style={{ color: settings.muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>الموقع قيد الإعداد. لم تُنشر أي صفحة بعد، أو الصفحة المطلوبة غير موجودة.</p>
      {settings.homePageId && <button onClick={onHome} className="tap" style={{ marginTop: 18, background: settings.primary, color: '#fff', border: 0, padding: '12px 26px', borderRadius: 12, fontWeight: 600 }}>العودة للصفحة الرئيسية</button>}
    </div>
  )
}

function PopupLayer({ pid, eng, doc, settings, last }: { pid: string; eng: SiteEngine; doc: DB; settings: any; last: boolean }) {
  const pop = doc.popups.find((p) => p.id === pid)
  if (!pop) return null
  const closeByOutside = pop.closeMode === 'outside' || pop.closeMode === 'both'
  const closeByBtn = pop.closeMode === 'button' || pop.closeMode === 'both'
  const z = 80 + eng.popups.indexOf(pid) * 2
  const content = <PopupContent eng={eng} node={pop.root} settings={settings} media={doc.media} closeBtn={closeByBtn ? () => eng.closePopup(pop.id) : undefined} />
  if (pop.size === 'center') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: z }} onClick={() => { if (closeByOutside && last) eng.closeTop() }} className="fadein">
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,8,20,.5)' }} />
        <div style={{ position: 'relative', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '88%', maxWidth: 340, maxHeight: '80vh', overflow: 'auto', background: 'transparent' }} onClick={(e) => e.stopPropagation()}>{content}</div>
      </div>
    )
  }
  if (pop.size === 'full') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: z, background: settings.bg, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }} className="fadein">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>{closeByBtn && <button onClick={() => eng.closePopup(pop.id)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(0,0,0,.07)', border: 0 }}><Icon name="close" /></button>}</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 30px' }}>{content}</div>
      </div>
    )
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: z }} onClick={() => { if (closeByOutside && last) eng.closeTop() }} className="fadein">
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,8,20,.45)' }} />
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheetup" style={{ maxHeight: '84vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', flex: 1, borderRadius: '20px 20px 0 0' }}>{content}</div>
        </div>
      </div>
    </div>
  )
}

function PopupContent({ eng, node, settings, media, closeBtn }: { eng: SiteEngine; node: Node; settings: any; media: any[]; closeBtn?: () => void }) {
  const render = (n: Node): React.ReactNode => {
    if (!eng.isVisible(n.id, n.visible)) return null
    const clickable = hasClickActions(n)
    const press = () => { if (n.events?.click?.length) eng.run(n, n.events.click) }
    if (isContainer(n.type)) {
      const style = { ...buildStyle(n, settings), ...containerFlexStyle(n) }
      if ((n.style?.widthMode || 'full') !== 'px') style.width = '100%'
      return <div style={style} onClick={(e) => { if (clickable && n.events?.click) { e.stopPropagation(); press() } }}>{(n.children || []).map((c) => render(c))}</div>
    }
    if (n.type === 'image') {
      const s = n.style || {}; const { src } = resolveMedia(n, media)
      return <div style={{ position: 'relative', width: '100%', height: s.heightMode === 'px' && s.heightPx ? s.heightPx : 'auto', overflow: 'hidden', borderRadius: s.radius ?? 0 }} onClick={(e) => { if (clickable && n.events?.click) { e.stopPropagation(); press() } }}><img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: n.fit || 'cover' }} /></div>
    }
    const base = buildStyle(n, settings)
    // استبدال المتغيرات الحية داخل النوافذ أيضًا
    const effNode = n.type === 'text' || n.type === 'button' ? { ...n, text: expandVars(n.text || '', eng) } : n
    if (clickable && n.type === 'button') {
      // زر بشريط تقدم داخل النافذة: نفس سلوك الصفحة (التنفيذ عند اكتمال الشريط)
      const prog = n.progress?.enabled ? n.progress : undefined
      if (prog) {
        return <InteractiveButton node={effNode} eng={eng} settings={settings} media={media} progress={prog} onClickEvent={() => { if (n.events?.click?.length) eng.run(n, n.events.click, { requireProgress: true }) }} />
      }
      return <span style={{ display: 'inline-block' }} onClick={(e) => { e.stopPropagation(); press() }}><LeafContent node={effNode} ctx={{ settings, media }} /></span>
    }
    if (clickable) return <div style={{ ...base, position: 'relative' }} onClick={(e) => { e.stopPropagation(); press() }}><LeafContent node={effNode} ctx={{ settings, media }} /></div>
    return <div style={{ ...base, position: 'relative' }}><LeafContent node={effNode} ctx={{ settings, media }} /></div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ background: settings.bg }}>{render(node)}</div>
    </div>
  )
}

// زر مرتبط بشريط تقدم: يبدأ تلقائيًا أو عند الضغط، قابل للإلغاء، ويُنفّذ الإجراء عند الاكتمال
function InteractiveButton({ node, eng, settings, media, progress, onClickEvent }: {
  node: Node; eng: SiteEngine; settings: Settings; media: any[]; progress: ProgressCfg; onClickEvent: () => void
}) {
  const [pct, setPct] = useState<number | null>(null) // null = خامل
  const raf = useRef(0); const startedAt = useRef(0)
  const done = useRef(false)

  const stop = () => { cancelAnimationFrame(raf.current); setPct(null) }
  const start = () => {
    if (pct !== null) return
    done.current = false
    startedAt.current = performance.now()
    setPct(0)
    const tick = (now: number) => {
      const el = now - startedAt.current
      const target = Math.min(100, (el / progress.duration) * 100)
      setPct(target)
      if (el >= progress.duration) {
        setPct(100)
        setTimeout(() => { if (!done.current) { done.current = true; setPct(null); onClickEvent() } }, 120)
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  // بداية تلقائية عند الظهور
  useEffect(() => { if (progress.start === 'auto') { const t = setTimeout(start, 400); return () => { clearTimeout(t); cancelAnimationFrame(raf.current) } } /* eslint-disable-line */ }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const color = progress.color || node.style?.color || '#0ea5e9'
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, width: node.style?.widthMode === 'px' ? (node.style.widthPx || 0) + 'px' : undefined }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); if (progress.start === 'click') start(); else if (pct === null) onClickEvent() }}>
        <LeafContent node={node} ctx={{ settings, media }} />
      </span>
      {pct !== null && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flex: 1, background: '#e2e8f0', borderRadius: 999, height: 6, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: pct + '%', background: color, borderRadius: 999, transition: 'width 60ms linear' }} />
          </span>
          {progress.cancellable ? <button onClick={(e) => { e.stopPropagation(); stop() }} style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', border: 0, borderRadius: 999, padding: '2px 8px' }}>إلغاء</button> : <span style={{ fontSize: 10, color: '#94a3b8' }}>{Math.round(pct)}%</span>}
        </span>
      )}
    </span>
  )
}
