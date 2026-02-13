import { GetLookupDtoOut, GetModelAllDtoOut } from '@interfaces/index'

export class HierarchicalLookupNode {
  id: number
  name: string
  nameEn: string
  children: HierarchicalLookupNode[]
}
export function buildHierarchicalLookup(items: GetLookupDtoOut[], parentKey = 'parentId'): HierarchicalLookupNode[] {
  const map = new Map()
  const roots: HierarchicalLookupNode[] = []

  // Create a map of all items
  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  // Link children to parents
  items.forEach((item) => {
    const parentId = (item as any)[parentKey]
    if (parentId) {
      const parent = map.get(parentId)
      if (parent) {
        parent.children.push(map.get(item.id))
      }
    } else {
      roots.push(map.get(item.id))
    }
  })

  return roots
}

export function getHierarchicalNames(
  models: GetModelAllDtoOut[],
  key: string,
): { name: string[]; nameEn: string[] } | null {
  if (!key) return null

  const byId = new Map<number, GetModelAllDtoOut>()
  for (const m of models) {
    byId.set(m.id, m)
  }

  // หา node โดย key
  const node = models.find((m) => m.key === key)
  if (!node) return null

  const names: string[] = []
  const namesEn: string[] = []
  let cur: GetModelAllDtoOut | undefined = node
  const seen = new Set<number>()

  // เดินขึ้นจาก leaf ไปหา root (ตาม parentModelId)
  while (cur) {
    if (seen.has(cur.id)) break // ป้องกัน loop ถ้ามีข้อมูลผิดพลาด
    seen.add(cur.id)

    names.push(cur.name)
    namesEn.push(cur.nameEn)

    if (!cur.parentModelId) break
    cur = byId.get(cur.parentModelId)
  }

  // ตอนนี้ arrays เป็น leaf->root, จึงต้อง reverse เพื่อเป็น root->...->leaf
  return {
    name: names.toReversed(),
    nameEn: namesEn.toReversed(),
  }
}
