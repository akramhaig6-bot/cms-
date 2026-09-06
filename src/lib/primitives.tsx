import type { CSSProperties, ReactNode } from 'react'
import type { Media, Node, Settings } from '../types'
import { buildStyle } from './style'
import { resolveMedia } from './media'
import { Icon } from './icons'

export interface VisualCtx {
  settings: Settings
  media: Media[]
  onPress?: (n: Node) => void
}

// يعيد المحتوى البصري الداخلي لورقة (نص/زر/صورة/أيقونة...) وفق المكوّن
export function LeafContent({ node, ctx }: { node: Node; ctx: VisualCtx }) {
  const s = node.style || {}
  switch (node.type) {
    case 'text': {
      const content = node.text || ''
      if (!content && node.hideWhenEmpty) return null
      if (!content) content && undefined
      const shared: CSSProperties = { ...buildStyle(node, ctx.settings), margin: 0 }
      const wrap = (el: string, txt: ReactNode) =>
        el === 'h1' ? <h1 style={shared}>{txt}</h1>
        : el === 'h2' ? <h2 style={shared}>{txt}</h2>
        : el === 'h3' ? <h3 style={shared}>{txt}</h3>
        : el === 'label' ? <span style={shared}>{txt}</span>
        : <p style={shared}>{txt}</p>
      const kind = node.textKind || 'paragraph'
      if (kind === 'heading1') return wrap('h1', <b style={{fontWeight: s.textWeight || 800}}>{content}</b>)
      if (kind === 'heading2') return wrap('h2', <b style={{fontWeight: s.textWeight || 700}}>{content}</b>)
      if (kind === 'heading3') return wrap('h3', <b style={{fontWeight: s.textWeight || 600}}>{content}</b>)
      if (kind === 'label') return wrap('label', content)
      return wrap('p', content)
    }
    case 'button': {
      const iconBefore = node.icon && !node.icon.startsWith('http') && !node.icon.startsWith('data:')
      const iconUrl = node.icon && (node.icon.startsWith('http') || node.icon.startsWith('data:')) ? node.icon : null
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: s.textAlign === 'center' ? 'center' : s.textAlign === 'end' ? 'flex-end' : 'flex-start', gap: 8, width: '100%' }}>
          {iconBefore && <Icon name={node.icon!} size={Math.round((s.textSize ? ({xs:12,sm:14,base:16,lg:18,xl:20,'2xl':24,'3xl':28} as any)[s.textSize] : 16))} color={s.color || '#fff'} />}
          {iconUrl && <img src={iconUrl} style={{ width: 18, height: 18, objectFit:'contain' }} alt="" />}
          <span style={{ whiteSpace: 'pre-wrap' }}>{node.text || ''}</span>
        </span>
      )
    }
    case 'image': {
      const { src } = resolveMedia(node, ctx.media)
      return <img src={src} alt={node.alt || node.name} style={{ width:'100%', height:'100%', objectFit: node.fit||'cover', borderRadius: s.radius ?? 0, display:'block' }} draggable={false} />
    }
    case 'divider':
      return <div style={{ height: (s.borderWidth||1), width:'100%', background: s.borderColor || '#cbd5e1', borderRadius: 2, opacity: s.opacity }} />
    case 'icon': {
      const size = (s.textSize ? ({xs:14,sm:18,base:22,lg:26,xl:32,'2xl':40,'3xl':50} as any)[s.textSize] : 24) || 24
      if (node.icon?.startsWith('http') || node.icon?.startsWith('data:'))
        return <img src={node.icon} style={{ width:size, height:size, objectFit:'contain' }} alt="" />
      return <Icon name={node.icon || 'star'} size={size} color={s.color || '#0ea5e9'} sw={1.6} />
    }
    case 'badge':
      return <span style={{ display:'inline-flex', alignItems:'center', background: node.badgeColor || s.bg || '#f59e0b', color: s.color || '#fff', padding:'3px 10px', borderRadius: 999, fontWeight: s.textWeight || 600, fontSize: s.textSize ? ({xs:10,sm:11,base:12,lg:14,xl:15,'2xl':17,'3xl':20} as any)[s.textSize] : 11 }}>{node.text || 'جديد'}</span>
    case 'spacer':
      return null
    case 'progress':
      return <ProgressStatic node={node} />
    default:
      return null
  }
}

export function ProgressStatic({ node }: { node: Node }) {
  const s = node.style || {}
  const fill = node.progress?.color || s.color || '#0ea5e9'
  const dur = node.progress?.duration || 2000
  const auto = (node.progress?.start || 'auto') === 'auto'
  return (
    <div style={{ width: '100%', background: s.bg || '#e2e8f0', borderRadius: 999, height: s.heightPx || 8, overflow: 'hidden' }}>
      {/* يبدأ من 0 ويمتلئ خلال المدة — يعمل بلا أي كود خارجي */}
      <div style={{ height: '100%', width: '100%', background: fill, borderRadius: 999, animation: auto ? `pgrow ${dur}ms linear both` : undefined, opacity: auto ? undefined : 1 }} />
    </div>
  )
}
