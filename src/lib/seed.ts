import type { DB, Node } from '../types'
import { createNode, uid } from './util'
import { findNode } from './tree'

export const STORAGE_KEY = 'sky_cms_v1'

function T(id: string, text: string, style: Record<string, any> = {}, kind: any = 'paragraph'): Node {
  const n = createNode('text')
  n.id = id; n.text = text; n.textKind = kind; n.style = { ...n.style, ...style } as any
  return n
}
function S(id: string, name: string, style: Record<string, any> = {}): Node {
  const n = createNode('section')
  n.id = id; n.name = name; n.style = { ...n.style, ...style } as any
  return n
}
function Btn(id: string, text: string, style: Record<string, any> = {}): Node {
  const n = createNode('button')
  n.id = id; n.text = text; n.style = { ...n.style, ...style } as any
  return n
}
function Img(id: string, style: Record<string, any> = {}, src?: string): Node {
  const n = createNode('image')
  n.id = id; n.src = src; n.style = { ...n.style, ...style } as any
  return n
}
function Card(id: string, style: Record<string, any> = {}): Node {
  const n = createNode('card')
  n.id = id; n.style = { ...n.style, ...style } as any
  return n
}

export function seedDB(): DB {
  const home = S('root', 'الجذر', { bg: 'transparent', pt: 0, pr: 0, pb: 0, pl: 0 })
  const homePage: any = {
    id: 'p_home', name: 'الرئيسية', path: '/', title: 'الرئيسية',
    status: 'published', updatedAt: Date.now(), root: home,
  }
  // قسم الترحيب
  const hero = S('s_hero', 'قسم الترحيب', { bg: 'linear-gradient' as any })
  hero.style = { ...hero.style, bg: '#0ea5e9', pt: 46, pr: 20, pb: 40, pl: 20, radius: 0 }
  const ht = T('t_hero', 'مرحبًا بك في متجرنا الرقمي', { color: '#ffffff', textAlign: 'center', textSize: '2xl' as any, textWeight: 800 }, 'heading1')
  const hsub = T('t_herosub', 'موقع مبني بالكامل من لوحة /admin بدون كتابة أي كود، منشور الآن على /client.', { color: '#e0f2fe', textAlign: 'center', textSize: 'sm' as any })
  const hrow: any = createNode('row'); hrow.id = 'row_cta'; hrow.style = { ...hrow.style, gap: 10, alignX: 'center' as any } as any
  const btn1 = Btn('b_shop', 'تسوّق الآن', { bg: '#ffffff', color: '#0369a1', radius: 12 })
  btn1.events.click = [{ id: uid('a'), type: 'nav', target: { kind: 'page', id: 'p_shop', label: 'المتجر' } }]
  const btn2 = Btn('b_offer', 'عرض خاص 🔥', { bg: '#f59e0b', color: '#fff', radius: 12 })
  btn2.events.click = [{ id: uid('a'), type: 'openPopup', target: { kind: 'popup', id: 'pop_offer', label: 'عرض خاص' } }]
  hrow.children = [btn1, btn2]
  hero.children = [ht, hsub, hrow]
  homePage.root.children.push(hero)

  // قسم المنتجات (شبكة بطاقات)
  const prod = S('s_prod', 'قسم المنتجات', { bg: '#f0f9ff', pt: 22, pr: 16, pb: 22, pl: 16 })
  const pt = T('t_prod', 'منتجات مختارة', { textSize: 'lg' as any, textWeight: 700, color: '#0b2233' }, 'heading2')
  const grid: any = createNode('grid'); grid.id = 'grid_prod'; grid.style = { ...grid.style, columns: 2, gap: 12 } as any
  const mk = (i: number, title: string, sub: string, price: string, color: string) => {
    const c = Card('c_p' + i, { bg: '#ffffff' })
    const band = Img('img_p' + i, { heightMode: 'px' as any, heightPx: 90, radius: 10, mb: 8 }, `https://picsum.photos/seed/seed${i}/300/200`)
    const tt = T('tt_p' + i, title, { textSize: 'base' as any, textWeight: 700, textAlign: 'center' as any }, 'label')
    const pr = T('pr_p' + i, price, { color, textSize: 'lg' as any, textWeight: 800, textAlign: 'center' as any }, 'label')
    c.children = [band, tt, pr]
    return c
  }
  grid.children = [
    mk(1, 'قميص قطني', 'تشكيلة ألوان', '120 ر.س', '#0ea5e9'),
    mk(2, 'حذاء رياضي', 'خامة مريحة', '260 ر.س', '#f59e0b'),
    mk(3, 'حقيبة جلد', 'تصميم أنيق', '340 ر.س', '#7c3aed'),
    mk(4, 'ساعة ذكية', 'إصدار حديث', '520 ر.س', '#059669'),
  ]
  prod.children = [pt, grid]

  // بطاقة مخفية مبدئيًا تُظهرها الأزرار (إثبات للإجراءات)
  const hidden = Card('c_hidden', { bg: '#fef3c7' })
  hidden.visible = false
  hidden.name = 'بطاقة هدية مخفية'
  const htxt = T('t_hidden', '🎁 هدية: خصم 20% على أول طلب! استخدم الكود WELCOME20', { color: '#92400e', textSize: 'sm' as any, textWeight: 600, textAlign: 'center' as any })
  hidden.children = [htxt]
  // زر داخل قسم المنتجات يُظهر البطاقة المخفية
  const showBtn = Btn('b_show_hidden', '🎁 كشف الهدية', { bg: '#f59e0b', color: '#fff', radius: 12, alignX: 'center' as any })
  showBtn.style = { ...showBtn.style, widthMode: 'auto' as any }
  showBtn.events.click = [{ id: uid('a'), type: 'show', target: { kind: 'node', id: 'c_hidden', label: 'بطاقة هدية مخفية' } }]
  prod.children = [pt, grid, showBtn, hidden]
  // زر إخفاء
  const hideBtn = Btn('b_hide_hidden', 'إخفاء الهدية', { bg: '#94a3b8', color: '#fff', radius: 12 })
  hideBtn.style = { ...hideBtn.style, widthMode: 'auto' as any }
  hideBtn.events.click = [{ id: uid('a'), type: 'hide', target: { kind: 'node', id: 'c_hidden', label: 'بطاقة هدية مخفية' } }]
  prod.children.push(hideBtn)

  // فاصل
  const div = createNode('divider'); div.id = 'div1'
  prod.children.push(div)

  const footer = S('s_footer', 'التذييل', { bg: '#082f49', pt: 22, pr: 16, pb: 26, pl: 16 })
  const ft = T('t_footer', 'موقع تجريبي مبني عبر نظام CMS للهاتف. كل ما تراه هنا مُنشأ ومدار من لوحة /admin.', { color: '#bae6fd', textSize: 'xs' as any, textAlign: 'center' as any })
  footer.children = [ft]
  homePage.root.children.push(prod, footer)

  // صفحة المتجر
  const shopRoot = S('root', 'الجذر', { pt: 0, pr: 0, pb: 0, pl: 0, bg: '#f0f9ff' })
  const shopPage: any = {
    id: 'p_shop', name: 'المتجر', path: '/shop', title: 'المتجر',
    status: 'published', updatedAt: Date.now(), root: shopRoot,
  }
  const shopHead = T('shop_h', '🛍️ المتجر', { textSize: '2xl' as any, textWeight: 800, color: '#082f49', textAlign: 'center' as any, mt: 20 }, 'heading1')
  const shopSub = T('shop_s', 'استعرض أحدث منتجاتنا', { textAlign: 'center' as any, color: '#64748b', textSize: 'sm' as any })
  const shopGrid = createNode('grid'); shopGrid.id = 'sg'; shopGrid.style = { ...shopGrid.style, columns: 2, gap: 12, pt: 4, pr: 14, pl: 14 } as any
  shopGrid.children = [mk(5, 'سماعات بلوتوث', 'صوت نقّي', '180 ر.س', '#e11d48'), mk(6, 'نظارة شمسية', 'حماية UV', '90 ر.س', '#0891b2'), mk(7, 'مصباح مكتب', 'إضاءة ليد', '75 ر.س', '#ca8a04'), mk(8, 'كوب حراري', 'سعة كبيرة', '65 ر.س', '#7c3aed')]
  shopRoot.children = [shopHead, shopSub, shopGrid]
  // زر رجوع
  const backBtn = Btn('b_back', '→ الرجوع للرئيسية', { bg: '#e0f2fe', color: '#0369a1', radius: 10 })
  backBtn.events.click = [{ id: uid('a'), type: 'nav', target: { kind: 'page', id: 'p_home', label: 'الرئيسية' } }]
  const wrap: any = createNode('container'); wrap.id = 'wb'; wrap.style = { ...wrap.style, pt: 0, pr: 14, pb: 16, pl: 14, alignX: 'start' as any } as any
  wrap.children = [backBtn]
  shopRoot.children.push(wrap)

  // صفحة حول
  const aboutRoot = S('root', 'الجذر', { bg: '#f8fafc', pt: 20, pr: 18, pb: 20, pl: 18 })
  const aboutPage: any = { id: 'p_about', name: 'من نحن', path: '/about', title: 'من نحن', status: 'published', updatedAt: Date.now(), root: aboutRoot }
  const at = T('at', 'من نحن', { textSize: '2xl' as any, textWeight: 800, color: '#082f49' }, 'heading1')
  const ac = Card('ac', { bg: '#ffffff' })
  const a1 = T('a1', 'نحن فريق شغوف ببناء تجارب رقمية بسيطة ومتاحة. أسسنا هذا المتجر لنقدم منتجات مختارة بعناية.', { color: '#334155' })
  ac.children = [a1]
  aboutRoot.children = [at, ac]

  // صفحة تواصل
  const contactRoot = S('root', 'الجذر', { bg: '#f8fafc', pt: 20, pr: 18, pb: 20, pl: 18 })
  const contactPage: any = { id: 'p_contact', name: 'تواصل معنا', path: '/contact', title: 'تواصل', status: 'published', updatedAt: Date.now(), root: contactRoot }
  const ct = T('ct', 'تواصل معنا 📮', { textSize: '2xl' as any, textWeight: 800, color: '#082f49' }, 'heading1')
  const cs = T('cs', 'نحب أن نسمع منك! راسلنا على البريد أو عبر النموذج أدناه.', { color: '#475569', textSize: 'sm' as any })
  const cmail = T('cm', 'support@store.com', { color: '#0ea5e9', textSize: 'lg' as any, textWeight: 600 })
  contactRoot.children = [ct, cs, cmail]

  const pages: any = [homePage, shopPage, aboutPage, contactPage]

  // ===== شريط علوي
  const barTopRoot: any = createNode('row'); barTopRoot.id = 'root'; barTopRoot.name = 'جذر الشريط العلوي'
  barTopRoot.style = { ...barTopRoot.style, alignY: 'center' as any, alignX: 'stretch' as any, pr: 6, pl: 6, pt: 2, pb: 2, gap: 6, bg: 'transparent' } as any
  const logo = T('logo', '🛍️ سوقنا', { color: '#0ea5e9', textSize: 'lg' as any, textWeight: 800 })
  const navHome = navBtn('nv_home', 'الرئيسية', 'p_home', 'الرئيسية')
  const navShop = navBtn('nv_shop', 'المتجر', 'p_shop', 'المتجر')
  const navAbout = navBtn('nv_about', 'من نحن', 'p_about', 'من نحن')
  barTopRoot.children = [logo, navHome, navShop, navAbout]
  const barTop: any = {
    id: 'bar_top', name: 'الشريط العلوي', type: 'top', scope: 'all',
    mode: 'fixed', foldable: true, defaultFolded: false, hidden: false,
    updatedAt: Date.now(), root: barTopRoot,
  }

  // ===== شريط سفلي (تنقل)
  const navB = createNode('row'); navB.id = 'root'; navB.name = 'جذر الشريط السفلي'
  navB.style = { ...navB.style, bg: '#ffffff', radius: 16, pt: 6, pr: 4, pb: 6, pl: 4, gap: 4, alignY: 'stretch' as any, shadow: true } as any
  navB.style.borderColor = '#e2e8f0'
  const mknav = (id: string, txt: string, icon: string, page: string, plabel: string): Node => {
    const col: any = createNode('column'); col.id = id + '_c'; col.name = txt
    col.style = { ...col.style, widthMode: 'full' as any, gap: 2, alignY: 'center' as any, alignX: 'center' as any } as any
    const ic = createNode('icon'); ic.id = id; ic.name = icon; ic.icon = icon
    ic.style = { ...ic.style, color: '#0ea5e9', textAlign: 'center' as any, textSize: 'lg' as any } as any
    const la = T(id + '_t', txt, { color: '#0b2233', textSize: 'xs' as any, textWeight: 600, textAlign: 'center' as any }, 'label')
    col.children = [ic, la]
    col.clickable = true
    col.events.click = [{ id: uid('a'), type: 'nav', target: { kind: 'page', id: page, label: plabel } }]
    return col
  }
  navB.children = [mknav('nb_h', 'الرئيسية', 'home', 'p_home', 'الرئيسية'), mknav('nb_s', 'المتجر', 'grid', 'p_shop', 'المتجر'), mknav('nb_c', 'تواصل', 'mail', 'p_contact', 'تواصل')]
  const barBottom: any = {
    id: 'bar_bot', name: 'شريط التنقل السفلي', type: 'bottom', scope: 'all',
    mode: 'fixed', foldable: false, defaultFolded: false, hidden: false,
    updatedAt: Date.now(), root: navB,
  }

  // ===== نافذة منبثقة
  const popRoot = S('root', 'الجذر', { bg: 'transparent', pt: 0, pr: 0, pb: 0, pl: 0 })
  const banner = S('pop_b', 'محتوى العرض', { bg: '#ffffff', radius: 18, pt: 22, pr: 18, pb: 18, pl: 18 })
  const ptt = T('ptt', '🎉 عرض خاص لك فقط', { textSize: 'xl' as any, textWeight: 800, textAlign: 'center' as any, color: '#b45309' }, 'heading2')
  const pts = T('pts', 'اطلب الآن واحصل على خصم 20% + شحن مجاني للطلبات فوق 200 ر.س.', { textAlign: 'center' as any, color: '#78350f', textSize: 'sm' as any })
  const pbtn = Btn('pb', 'ابدأ التسوق', { bg: '#f59e0b', color: '#fff', radius: 12 })
  pbtn.events.click = [{ id: uid('a'), type: 'closePopup', target: { kind: 'popup', id: 'pop_offer', label: 'عرض خاص' } }, { id: uid('a'), type: 'nav', target: { kind: 'page', id: 'p_shop', label: 'المتجر' } }]
  banner.children = [ptt, pts, pbtn]
  popRoot.children.push(banner)
  const popOffer: any = {
    id: 'pop_offer', name: 'عرض خاص', size: 'sheet', closeMode: 'both',
    openAnim: 'slide-up', updatedAt: Date.now(), root: popRoot,
  }

  // تدفق تجريبي
  const flow: any = {
    id: 'flow1', name: 'جولة المتجر', desc: 'يوضح لك المنتجات ثم يفتح العرض',
    steps: [
      { id: uid('a'), type: 'nav', target: { kind: 'page', id: 'p_shop', label: 'المتجر' }, delay: 0 },
      { id: uid('a'), type: 'openPopup', target: { kind: 'popup', id: 'pop_offer', label: 'عرض خاص' }, delay: 600 },
    ],
  }

  const media: any = []
  const libs: any = []
  const redirects: any = []

  return {
    settings: {
      siteName: 'سوقنا', siteDesc: 'متجر إلكتروني تجريبي مبني عبر نظام CMS للهاتف',
      primary: '#0ea5e9', primaryText: '#ffffff', text: '#0b2233', bg: '#ffffff', card: '#ffffff', muted: '#64748b',
      siteColors: [
        { name: 'أساسي', value: '#0ea5e9' }, { name: 'غامق', value: '#0b2233' }, { name: 'ذهبي', value: '#f59e0b' },
        { name: 'أخضر', value: '#059669' }, { name: 'بنفسجي', value: '#7c3aed' },
      ],
      fonts: [], activeFont: 'system', homePageId: 'p_home', lang: 'ar', dir: 'rtl', reduceMotion: false,
      accounts: [
        { id: 'acc_owner', handle: 'admin', code: 'admin123', role: 'owner', name: 'مدير النظام' },
        { id: 'acc_editor', handle: 'editor', code: 'editor123', role: 'editor', name: 'محرر' },
      ],
      redirects,
    },
    pages, bars: [barTop, barBottom], popups: [popOffer], flows: [flow], media, libs,
    variables: [
      { id: 'var1', name: 'زيارات', vtype: 'number', def: 0, scope: 'session' },
    ],
  } as unknown as DB
}

function navBtn(id: string, txt: string, page: string, plabel: string): Node {
  const b = Btn(id, txt, { bg: 'transparent', color: '#0b2233', textSize: 'xs' as any, textWeight: 700, radius: 999, pt: 6, pr: 10, pb: 6, pl: 10 })
  b.events.click = [{ id: uid('a'), type: 'nav', target: { kind: 'page', id: page, label: plabel } }]
  return b
}
