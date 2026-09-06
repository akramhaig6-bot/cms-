import type { NType, Node, ContainerType, Style } from '../types'

let c = 0
export function uid(prefix = 'n') {
  c++
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${c}`
}

export const clone = <T,>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)))

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------- تصنيفات المكونات ----------
export const LEAF: NType[] = ['text','image','button','divider','icon','badge','spacer','progress']
export const CONTAINERS: ContainerType[] = ['section','card','container','row','column','grid']

export function isContainer(t: NType): boolean {
  return (CONTAINERS as string[]).includes(t)
}

// أسماء عربية
export const NTYPE_LABEL: Record<NType, string> = {
  section:'قسم', card:'بطاقة', container:'حاوية', row:'صف', column:'عمود', grid:'شبكة',
  text:'نص', image:'صورة', button:'زر', divider:'فاصل', icon:'أيقونة', badge:'شارة',
  spacer:'مسافة', progress:'شريط تقدم'
}

export const CONTAINER_META: { t: ContainerType; icon: string; label: string; desc: string }[] = [
  { t:'section', icon:'▦', label:'قسم', desc:'حاوية كبيرة تملأ العرض' },
  { t:'card', icon:'▢', label:'بطاقة', desc:'بطاقة بظل وحواف' },
  { t:'container', icon:'⬚', label:'حاوية', desc:'حاوية عامة' },
  { t:'row', icon:'⇆', label:'صف', desc:'أطفال أفقية' },
  { t:'column', icon:'⇅', label:'عمود', desc:'أطفال رأسية' },
  { t:'grid', icon:'▤', label:'شبكة', desc:'أعمدة متساوية' },
]
export const LEAF_META: { t: NType; icon: string; label: string; desc: string }[] = [
  { t:'text', icon:'T', label:'نص', desc:'عنوان / فقرة' },
  { t:'image', icon:'▨', label:'صورة', desc:'من مكتبة الوسائط' },
  { t:'button', icon:'⬌', label:'زر', desc:'زر تفاعلي' },
  { t:'divider', icon:'━', label:'فاصل', desc:'خط فاصل' },
  { t:'icon', icon:'✦', label:'أيقونة', desc:'أيقونة ملونة' },
  { t:'badge', icon:'➤', label:'شارة', desc:'شارة صغيرة' },
  { t:'spacer', icon:'⋮', label:'مسافة', desc:'تباعد رأسي/أفقي' },
]

// ---------- نمط افتراضي لكل نوع ----------
export const DEFAULT_STYLE: Record<NType, Record<string, any>> = {
  section:{ bg:'transparent', radius:0, pt:14, pr:14, pb:14, pl:14, direction:'vertical', alignX:'stretch', gap:10, widthMode:'full' },
  card:{ bg:'#ffffff', radius:14, shadow:true, pt:14, pr:14, pb:14, pl:14, direction:'vertical', alignX:'stretch', gap:10, borderWidth:0, widthMode:'full' },
  container:{ bg:'transparent', radius:10, pt:8, pr:8, pb:8, pl:8, direction:'vertical', alignX:'stretch', gap:8, widthMode:'full' },
  row:{ bg:'transparent', direction:'horizontal', alignY:'center', gap:8, widthMode:'full', pt:0, pr:0, pb:0, pl:0 },
  column:{ bg:'transparent', direction:'vertical', gap:8, widthMode:'auto', alignX:'stretch' },
  grid:{ bg:'transparent', direction:'vertical', columns:2, gap:10, widthMode:'full' },
  text:{ color:'#0b2233', textSize:'base', textWeight:400, textAlign:'start', lineHeight:1.5, widthMode:'full' },
  image:{ bg:'transparent', fit:'cover', radius:10, widthMode:'full', heightMode:'px', heightPx:160 },
  button:{ bg:'#0ea5e9', color:'#ffffff', textSize:'base', textWeight:600, radius:12, pt:12, pr:18, pb:12, pl:18, widthMode:'auto', textAlign:'center' },
  divider:{ borderColor:'#cbd5e1', borderWidth:1, mt:6, mb:6, widthMode:'full' },
  icon:{ color:'#0ea5e9', widthMode:'auto', radius:0 },
  badge:{ bg:'#f59e0b', color:'#ffffff', textSize:'xs', textWeight:600, radius:999, pt:3, pr:8, pb:3, pl:8, widthMode:'auto' },
  spacer:{ bg:'transparent', heightMode:'px', heightPx:12, widthMode:'full' },
  progress:{ bg:'#e2e8f0', radius:999, heightMode:'px', heightPx:8, widthMode:'full', color:'#0ea5e9' },
}

export function makeDefaultText(kind: 'heading1'|'heading2'|'heading3'|'paragraph'|'label'): string {
  if(kind==='heading1') return 'عنوان رئيسي'
  if(kind==='heading2') return 'عنوان فرعي'
  if(kind==='heading3') return 'عنوان صغير'
  if(kind==='paragraph') return 'هذا نص برمجي تجريبي يمكنك تخصيصه بالكامل من لوحة الخصائص. اضغط على أي مكوّن لتحديده.'
  return 'تسمية'
}

export function createNode(type: NType, parentType?: NType): Node {
  const base = DEFAULT_STYLE[type]
  let text: string | undefined
  let textKind: Node['textKind']
  let fit: Node['fit'] = undefined
  let badgeColor = '#f59e0b'
  if (type === 'text') { textKind = 'paragraph'; text = makeDefaultText('paragraph') }
  if (type === 'button') { text = 'زر جديد'; textKind = 'label'; }
  if (type === 'badge') { text = 'جديد'; textKind = 'label'; badgeColor='#0ea5e9' }
  if (type === 'image') { fit = 'cover' }
  if (type === 'section' && parentType) { /* nested default more compact handled later */ }
  return {
    id: uid(type),
    type,
    name: NTYPE_LABEL[type] + ' ' + Math.floor(Math.random()*90+10),
    text, textKind, fit, badgeColor,
    style: clone(base as Style),
    visible: true,
    visibleWhen: 'always',
    status: 'draft',
    events: {},
    children: [],
  }
}

// ---------- قواعد الاحتواء ----------
export function accepts(container: NType, child: NType): boolean {
  if (isContainer(container)) return true          // الحاويات تقبل أي شيء
  return false                                      // العناصر النهائية لا تقبل أطفالاً
}

// العناصر الجذرية التي لا توضع داخل الكانفاس مباشرة (تدار بمديرها)
export const OUTER_TYPES = ['bar','popup'] as NType[]

export function normalizeSlug(s: string) {
  let out = s.trim().toLowerCase()
  if (out === '/') return '/'
  return '/' + out.replace(/^\/+/, '').replace(/[^\w\u0600-\u06FF\-/]+/g, '-').replace(/-+/g,'-')
}
