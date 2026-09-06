import type { CSSProperties } from 'react'
import type { Node, Settings } from '../types'
import { isContainer } from './util'

const FS: Record<string, number> = { xs:11, sm:13, base:15, lg:18, xl:22, '2xl':27, '3xl':33 }

function a(v: 'start'|'center'|'end'|'stretch'|undefined): CSSProperties['alignItems'] | undefined {
  if (!v) return undefined
  return v === 'start' ? 'flex-start' : v === 'end' ? 'flex-end' : v
}

function justify(m: 'start'|'center'|'end'|'stretch'|undefined): CSSProperties['justifyContent'] | undefined {
  if (!m) return undefined
  return m === 'start' ? 'flex-start' : m === 'end' ? 'flex-end' : m === 'center' ? 'center' : undefined
}

export function buildStyle(node: Node, settings: Settings): CSSProperties {
  const s = node.style || {}
  const st: CSSProperties = {}
  const isText = node.type === 'text'

  // الألوان
  if (s.bg && s.bg !== 'transparent') st.backgroundColor = s.bg
  st.opacity = (s.opacity ?? 1)
  if (s.color && (isText || node.type === 'icon' || node.type === 'button' || node.type === 'badge')) st.color = s.color

  // الحدود
  const bw = s.borderWidth || 0
  if (bw > 0 && s.borderStyle && s.borderStyle !== 'none') {
    st.border = `${bw}px ${s.borderStyle} ${s.borderColor || '#94a3b8'}`
  }
  if (s.radius != null && node.type !== 'image') st.borderRadius = `${s.radius}px`
  if (s.shadow) st.boxShadow = '0 4px 16px rgba(2,26,45,0.12)'

  // المسافات
  const p = (v?: number) => (v == null ? undefined : v)
  st.padding = [p(s.pt), p(s.pr), p(s.pb), p(s.pl)].some((x) => x != null)
    ? `${p(s.pt) ?? 0}px ${p(s.pr) ?? 0}px ${p(s.pb) ?? 0}px ${p(s.pl) ?? 0}px`
    : undefined
  const m = [s.mt, s.mr, s.mb, s.ml].some((x) => x != null)
  if (m) st.margin = `${s.mt ?? 0}px ${s.mr ?? 0}px ${s.mb ?? 0}px ${s.ml ?? 0}px`

  // العرض / الارتفاع
  const wm = s.widthMode || 'auto'
  if (wm === 'full') st.width = '100%'
  else if (wm === 'px' && s.widthPx) st.width = s.widthPx + 'px'
  else if (wm === 'fit') st.width = 'max-content'
  const hm = s.heightMode || 'auto'
  if (hm === 'px' && s.heightPx) st.height = s.heightPx + 'px'
  if (s.minH) st.minHeight = s.minH + 'px'

  // نص
  if (isText) {
    if (s.textSize && FS[s.textSize]) st.fontSize = FS[s.textSize]
    if (s.textWeight) st.fontWeight = s.textWeight
    if (s.textAlign) st.textAlign = s.textAlign === 'start' ? 'start' : s.textAlign === 'end' ? 'end' : 'center'
    if (s.lineHeight) st.lineHeight = s.lineHeight
    if (s.letterSpacing) st.letterSpacing = s.letterSpacing + 'px'
  }

  return st
}

export function buildContentStyle(node: Node): CSSProperties {
  const s = node.style || {}
  if (node.type === 'image') {
    return { objectFit: node.fit || 'cover', borderRadius: `${s.radius ?? 0}px`, width: '100%', height: '100%', display: 'block' }
  }
  if (node.type === 'divider') {
    return { border: 0, borderTop: `${s.borderWidth ?? 1}px ${s.borderStyle || 'solid'} ${s.borderColor || '#cbd5e1'}`, width: '100%' }
  }
  return {}
}

// اتجاه أطفال الحاوية
export function containerDirection(n: Node): 'vertical'|'horizontal'|'grid' {
  if (n.type === 'grid') return 'grid'
  return n.style?.direction || 'vertical'
}

export function containerFlexStyle(n: Node): CSSProperties {
  const dir = containerDirection(n)
  const s = n.style || {}
  const base: CSSProperties = { display: 'flex' }
  if (dir === 'vertical') base.flexDirection = 'column'
  else base.flexDirection = 'row'
  if (dir === 'grid') {
    base.display = 'grid'
    base.gridTemplateColumns = `repeat(${s.columns || 2}, minmax(0,1fr))`
    base.alignItems = 'stretch'
  } else {
    if (dir === 'vertical') {
      base.alignItems = a(s.alignX ?? 'stretch')
      base.justifyContent = undefined
    } else {
      // صف: محاذاة رأسية للأطفال أفقياً محاذاة عبر justify
      if (s.alignX === 'stretch' || !s.alignX) { base.alignItems = 'stretch'; base.justifyContent = undefined }
      else { base.alignItems = a(s.alignY ?? 'center'); base.justifyContent = justify(s.alignX) }
    }
  }
  if (s.gap) base.gap = s.gap + 'px'
  if (s.opacity) base.opacity = s.opacity
  // تصغير لحل overflow
  base.minWidth = 0
  return base
}

export const isContainerN = (n: Node) => isContainer(n.type)
