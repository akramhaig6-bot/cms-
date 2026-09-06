// ================= نموذج البيانات الكامل (مشترك بين /admin و /client) =================

export type NType =
  | 'section' | 'card' | 'container' | 'row' | 'column' | 'grid'
  | 'text' | 'image' | 'button' | 'divider' | 'icon' | 'badge' | 'spacer'
  | 'progress'

export type ContainerType = 'section' | 'card' | 'container' | 'row' | 'column' | 'grid'

export interface Style {
  bg?: string
  opacity?: number
  color?: string
  borderColor?: string
  borderWidth?: number
  borderStyle?: 'solid' | 'dashed' | 'none'
  radius?: number
  shadow?: boolean
  // مقاسات
  widthMode?: 'auto' | 'full' | 'fit' | 'px'
  widthPx?: number
  heightMode?: 'auto' | 'px'
  heightPx?: number
  minH?: number
  pt?: number; pr?: number; pb?: number; pl?: number
  mt?: number; mr?: number; mb?: number; ml?: number
  // نصوص
  textSize?: 'xs'|'sm'|'base'|'lg'|'xl'|'2xl'|'3xl'
  textWeight?: number
  textAlign?: 'start'|'center'|'end'
  lineHeight?: number
  letterSpacing?: number
  // محاذاة حاوية
  direction?: 'vertical'|'horizontal'
  alignX?: 'start'|'center'|'end'|'stretch'
  alignY?: 'start'|'center'|'end'|'stretch'
  gap?: number
  columns?: number
}

export type EventName =
  | 'click' | 'longPress' | 'onVisible' | 'onHidden'
  | 'progressComplete' | 'onOpen' | 'onClose' | 'onError'

export type ActionType =
  | 'nav' | 'openPopup' | 'closePopup' | 'closeAllPopups'
  | 'show' | 'hide' | 'toggle' | 'showAndHide'
  | 'foldBar' | 'unfoldBar' | 'toggleBar'
  | 'back' | 'runFlow' | 'sequence' | 'openLink'
  | 'setVar' | 'incVar' | 'toggleVar'

export interface ActionTarget {
  kind: 'page' | 'bar' | 'popup' | 'node' | 'flow' | 'url'
  id?: string
  label?: string
  broken?: boolean
}

export interface ProgressCfg {
  enabled: boolean
  duration: number        // ms
  start: 'auto' | 'click'
  cancellable: boolean
  color?: string
}

export interface Action {
  id: string
  type: ActionType
  target?: ActionTarget
  showId?: string // for showAndHide
  hideId?: string
  delay?: number
  children?: Action[]
}

export interface VisibilityCond {
  // بسيط: شروط ظهور مبنية على حالة إظهار مكوّن آخر
  op: 'visible' | 'hidden' | 'folded' | 'opened'
  refKind?: string
  refId?: string
  refLabel?: string
}

export interface Node {
  id: string
  type: NType
  name: string
  // محتوى
  text?: string
  textKind?: 'heading1'|'heading2'|'heading3'|'paragraph'|'label'
  mediaId?: string
  alt?: string
  fit?: 'cover'|'contain'|'fill'
  icon?: string // اسم أيقونة أو url
  src?: string  // رابط مباشر (اختياري بديل للوسائط)
  badgeColor?: string
  clickable?: boolean
  href?: string
  // خصائص
  style: Style
  visible: boolean          // الظهور المبدئي
  visibleWhen?: 'always' | 'shown'   // مبدئي
  hiddenWhenCollapsed?: boolean      // للشريط
  hideWhenEmpty?: boolean
  responsive?: { hideOnTiny?: boolean }
  // دورة الحياة: مسودة/منشور/مخفي
  status?: 'draft'|'published'|'hidden'
  progress?: ProgressCfg
  // إجراءات حسب الحدث
  events: Partial<Record<EventName, Action[]>>
  cond?: VisibilityCond
  animIn?: string
  animOut?: string
  animMs?: number
  children: Node[]
}

export interface Page {
  id: string
  name: string
  path: string
  title: string
  seoImage?: string
  status: 'published'|'draft'|'hidden'
  updatedAt: number
  root: Node
}

export type BarType = 'top'|'bottom'|'nav'|'side'

export interface Bar {
  id: string
  name: string
  type: BarType
  scope: 'all' | string[]        // all أو معرّفات صفحات
  mode: 'fixed' | 'foldable' | 'scroll'
  foldable: boolean
  defaultFolded: boolean
  hidden: boolean
  updatedAt: number
  root: Node
}

export interface Popup {
  id: string
  name: string
  size: 'sheet'|'center'|'full'
  closeMode: 'outside'|'button'|'both'
  openAnim?: string
  updatedAt: number
  root: Node
}

export interface Flow {
  id: string
  name: string
  desc?: string
  steps: Action[]
}

export interface Media {
  id: string
  name: string
  type: 'image'|'file'
  mime: string
  size: number
  dataUrl: string
  at: number
}

export interface Lib {
  id: string
  name: string
  cat: string
  desc?: string
  root: Node   // نسخة من الشجرة تُدرج عند الاستخدام
  updatedAt: number
}

export interface Variable {
  id: string
  name: string
  vtype: 'text'|'number'|'bool'
  def: string | number | boolean
  scope: 'session'|'temp'
}

export interface Account {
  id: string
  handle: string
  code: string
  role: 'owner'|'editor'|'viewer'
  name?: string
}

export interface SiteColor { name: string; value: string }

export interface RedirectRule { from: string; to: string }

export interface Settings {
  siteName: string
  siteDesc: string
  logo?: string
  favicon?: string
  primary: string
  primaryText: string
  text: string
  bg: string
  card: string
  muted: string
  siteColors: SiteColor[]
  fonts: string[]
  activeFont: string
  homePageId?: string
  lang: 'ar'|'en'
  dir: 'rtl'|'ltr'
  reduceMotion: boolean
  accounts: Account[]
  redirects: RedirectRule[]
  notFoundPageId?: string
  unpublishedPageId?: string
}

export interface DB {
  settings: Settings
  pages: Page[]
  bars: Bar[]
  popups: Popup[]
  flows: Flow[]
  media: Media[]
  libs: Lib[]
  variables: Variable[]
}

export interface PublishEntry {
  id: string
  at: number
  by: string
  kind: 'publish'|'rollback'
  note: string
  snap: DB
}

export interface Notification {
  id: string
  type: 'info'|'success'|'error'|'warn'|'recover'
  text: string
  at: number
  read: boolean
  ref?: { kind: string; id?: string; label?: string }
}

export interface Session {
  loggedIn: boolean
  accountId?: string
  name?: string
  role?: 'owner'|'editor'|'viewer'
}

// مرجع مكسور
export interface BrokenRef {
  id: string
  kind: 'action'|'media'|'cond'
  source: { entityKind: string; entityId?: string; entityLabel: string; nodeId?: string; nodeLabel?: string }
  what: string
  targetLabel?: string
}
