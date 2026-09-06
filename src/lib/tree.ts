import type { Node } from '../types'
import { clone } from './util'

export function findNode(root: Node | null, id: string): Node | null {
  if (!root) return null
  if (root.id === id) return root
  for (const ch of root.children || []) {
    const f = findNode(ch, id)
    if (f) return f
  }
  return null
}

// يعيد معلومات الأب وموضع المكوّن ضمن الجذر
export function locate(root: Node | null, id: string): { parent: Node | null; index: number; container: Node } | null {
  if (!root) return null
  if (root.id === id) return { parent: null, index: -1, container: root }
  const walk = (par: Node): { parent: Node; index: number; container: Node } | null => {
    for (let i = 0; i < (par.children?.length || 0); i++) {
      const ch = par.children[i]
      if (ch.id === id) return { parent: par, index: i, container: root }
      const inner = walk(ch)
      if (inner) return inner
    }
    return null
  }
  return walk(root)
}

// يعيد مسار (سلسلة أسماء) من الجذر إلى العقدة
export function pathOf(root: Node | null, id: string): { id: string; name: string; type: string }[] {
  if (!root) return []
  const walk = (par: Node, trail: { id: string; name: string; type: string }[]): { id: string; name: string; type: string }[] | null => {
    if (par.id === id) return trail
    for (const ch of par.children || []) {
      const r = walk(ch, [...trail, { id: ch.id, name: ch.name, type: ch.type }])
      if (r) return r
    }
    return null
  }
  const r = walk(root, [{ id: root.id, name: root.name, type: root.type }])
  return r || []
}

export function removeNode(root: Node | null, id: string): Node | null {
  if (!root) return root
  if (root.id === id) return null
  const cloneRoot = clone(root)
  const strip = (par: Node): boolean => {
    if (!par.children) return false
    for (let i = 0; i < par.children.length; i++) {
      if (par.children[i].id === id) { par.children.splice(i, 1); return true }
      if (strip(par.children[i])) return true
    }
    return false
  }
  strip(cloneRoot)
  return cloneRoot
}

// إدراج عقدة كطفل للحاوية المحددة في موضع index (أو النهاية)
export function insertNode(root: Node | null, containerId: string, node: Node, index = -1): Node | null {
  if (!root) return root
  const newRoot = clone(root)
  const target = findNode(newRoot, containerId)
  if (!target) return root
  if (!target.children) target.children = []
  const pos = index < 0 ? target.children.length : Math.min(index, target.children.length)
  target.children.splice(pos, 0, node)
  return newRoot
}

// إعادة ترتيب / نقل داخل نفس الأب
export function moveChild(root: Node | null, parentId: string, from: number, to: number): Node | null {
  if (!root) return root
  const nr = clone(root)
  const p = findNode(nr, parentId)
  if (!p || !p.children) return root
  const arr = p.children
  if (from < 0 || from >= arr.length) return root
  const [it] = arr.splice(from, 1)
  let t = to
  if (t < 0) t = 0
  if (t > arr.length) t = arr.length
  arr.splice(t, 0, it)
  return nr
}

export function countNodes(n: Node): number {
  let s = 1
  for (const ch of n.children || []) s += countNodes(ch)
  return s
}

export function collectIds(n: Node | null, acc: string[] = []): string[] {
  if (!n) return acc
  acc.push(n.id)
  for (const ch of n.children || []) collectIds(ch, acc)
  return acc
}

export function mapTree<T>(n: Node, fn: (node: Node, depth: number, parent: Node | null) => T | 'skip', depth = 0, parent: Node | null = null): (T | null)[] {
  const out: (T | null)[] = []
  const r = fn(n, depth, parent)
  if (r === 'skip') return out
  out.push(r)
  for (const ch of n.children || []) out.push(...mapTree(ch, fn, depth + 1, n))
  return out
}

export function renameIds(n: Node, map: Record<string, string>): Node {
  const nn = { ...n }
  if (map[n.id]) nn.id = map[n.id]
  if (nn.children) nn.children = nn.children.map((ch) => renameIds(ch, map))
  return nn
}

// يعيد جذرًا جديدًا بعد تطبيق cb على العقدة ذات id
export function updateNode(root: Node, id: string, cb: (n: Node) => Node): Node {
  const work = (n: Node): Node => {
    if (n.id === id) return cb(clone(n))
    if (n.children && n.children.length) return { ...clone(n), children: n.children.map((c) => work(c)) }
    return clone(n)
  }
  return work(root)
}
