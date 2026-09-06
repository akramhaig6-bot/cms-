// مجموعة أيقونات داخلية خفيفة (خطوط) تستخدم في /admin وفي مكونات /client
const PATHS: Record<string, string[]> = {
  heart: ['M12 20s-7-4.4-9.3-8.6C1 8 2.7 4.6 6 4.6c2 0 3.3 1.2 4 2.4.7-1.2 2-2.4 4-2.4 3.3 0 5 3.4 3.3 6.8C19 15.6 12 20 12 20z'],
  star: ['M12 2l3 6.5 7 .8-5.2 4.8 1.4 6.9L12 17.7 5.8 21l1.4-6.9L2 9.3l7-.8z'],
  home: ['M3 11l9-8 9 8','M5 10v10h5v-6h4v6h5V10'],
  user: ['M12 12a4 4 0 100-8 4 4 0 000 8z','M4 20c1-4 4-6 8-6s7 2 8 6'],
  cart: ['M3 4h2l2.4 11h11L21 8H7','M10 20a1 1 0 100-2 1 1 0 000 2z','M18 20a1 1 0 100-2 1 1 0 000 2z'],
  menu: ['M4 6h16','M4 12h16','M4 18h16'],
  close: ['M6 6l12 12','M18 6L6 18'],
  bell: ['M6 9a6 6 0 1112 0c0 4 1 5 1 5H5s1-1 1-5','M10 20a2 2 0 004 0'],
  search: ['M11 19a8 8 0 100-16 8 8 0 000 16z','M21 21l-4.3-4.3'],
  'arrow-right': ['M5 12h14','M13 6l6 6-6 6'],
  'arrow-left': ['M19 12H5','M11 18l-6-6 6-6'],
  'arrow-up': ['M12 19V5','M6 11l6-6 6 6'],
  'arrow-down': ['M12 5v14','M18 13l-6 6-6-6'],
  check: ['M5 13l4 4L19 7'],
  plus: ['M12 5v14','M5 12h14'],
  trash: ['M4 7h16','M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2','M6 7l1 13h10l1-13','M10 11v6','M14 11v6'],
  settings: ['M4 8h10','M18 8h2','M4 16h2','M10 16h10','M16 6v4','M8 14v4'],
  link: ['M10 14a4 4 0 005 0l3-3a4 4 0 00-6-6l-1 1','M14 10a4 4 0 00-5 0l-3 3a4 4 0 006 6l1-1'],
  play: ['M6 4l14 8-14 8z'],
  pause: ['M6 4h4v16H6z','M14 4h4v16h-4z'],
  mail: ['M3 6h18v12H3z','M3 6l9 7 9-7'],
  phone: ['M6 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z'],
  map: ['M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11z','M12 12a2 2 0 100-4 2 2 0 000 4z'],
  clock: ['M12 21a9 9 0 100-18 9 9 0 000 18z','M12 7v5l3 2'],
  camera: ['M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11H3V8a1 1 0 011-1z','M12 17a4 4 0 100-8 4 4 0 000 8z'],
  image: ['M4 5h16a1 1 0 011 1v12H3V6a1 1 0 011-1z','M3 17l5-5 4 4 3-3 6 6'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z','M12 15a3 3 0 100-6 3 3 0 000 6z'],
  edit: ['M4 20h4L20 8l-4-4L4 16z','M14 6l4 4'],
  download: ['M12 3v12','M6 11l6 6 6-6','M4 21h16'],
  share: ['M12 3v10','M7 8l-4 4 4 4','M17 8l4 4-4 4'],
  logout: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-up': ['M18 15l-6-6-6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  undo: ['M3 7v6h6','M3 13a8 8 0 101-5'],
  redo: ['M21 7v6h-6','M21 13a8 8 0 11-1-5'],
  grid: ['M4 4h7v7H4z','M13 4h7v7h-7z','M4 13h7v7H4z','M13 13h7v7h-7z'],
  layers: ['M12 3l9 5-9 5-9-5z','M3 13l9 5 9-5'],
  flow: ['M4 4h6v6H4z','M14 14h6v6h-6z','M7 10v4h7','M7 12h7'],
  external: ['M14 4h6v6','M20 4L11 13','M20 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h5'],
  drag: ['M9 6a1 1 0 100-2 1 1 0 000 2z','M15 6a1 1 0 100-2 1 1 0 000 2z','M9 12a1 1 0 100-2 1 1 0 000 2z','M15 12a1 1 0 100-2 1 1 0 000 2z','M9 18a1 1 0 100-2 1 1 0 000 2z','M15 18a1 1 0 100-2 1 1 0 000 2z'],
  'chevrons-down': ['M7 6l5 5 5-5','M7 13l5 5 5-5'],
  copy: ['M9 9h11v11H9z','M5 15H4V4h11v1'],
  more: ['M12 6a1 1 0 100-2 1 1 0 000 2z','M12 13a1 1 0 100-2 1 1 0 000 2z','M12 20a1 1 0 100-2 1 1 0 000 2z'],
  send: ['M21 3L3 10.5l6 2.5 2.5 6z','M9 13L21 3'],
  palette: ['M12 3a9 9 0 000 18h1a2 2 0 000-4h-1a2 2 0 010-4h3a2 2 0 002-2 5 5 0 00-5-8z'],
  ruler: ['M2 12l9-9 11 11-9 9z','M6 9l1 1','M9 12l1 1'],
  text: ['M4 6h16','M12 6v14','M9 20h6'],
}

export function Icon({ name, size = 20, color = 'currentColor', sw = 1.8, className }: {
  name: string; size?: number; color?: string; sw?: number; className?: string
}) {
  const paths = PATHS[name] || PATHS.chevronDown
  if (name.startsWith('http') || name.startsWith('data:')) {
    return <img src={name} width={size} height={size} alt="" style={{ objectFit: 'contain' }} />
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: '0 0 auto' }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

export function iconNames(): string[] { return Object.keys(PATHS) }

export function iconList(): { name: string; label: string }[] {
  const labels: Record<string, string> = {
    heart:'قلب', star:'نجمة', home:'الرئيسية', user:'مستخدم', cart:'سلة', menu:'قائمة', close:'إغلاق',
    bell:'تنبيه', search:'بحث', 'arrow-right':'سهم يمين', 'arrow-left':'سهم يسار', 'arrow-up':'سهم أعلى',
    'arrow-down':'سهم أسفل', check:'صح', plus:'إضافة', trash:'حذف', settings:'إعدادات', link:'رابط',
    play:'تشغيل', pause:'إيقاف', mail:'بريد', phone:'هاتف', map:'موقع', clock:'وقت', camera:'كاميرا',
    image:'صورة', eye:'عرض', edit:'تعديل', download:'تنزيل', share:'مشاركة', logout:'خروج',
    'chevron-down':'أسفل', 'chevron-up':'أعلى', grid:'شبكة', layers:'طبقات', flow:'تدفق',
    external:'فتح', drag:'سحب', copy:'نسخ', more:'أكثر', send:'إرسال', palette:'ألوان', text:'نص',
  }
  return iconNames().map((name) => ({ name, label: labels[name] || name }))
}
