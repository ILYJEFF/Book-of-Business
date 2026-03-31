import type { Industry } from '../../../shared/types'

export interface IndustryNode extends Industry {
  children: IndustryNode[]
}

/** Build a forest of industries (roots have no parentId). Children sorted by name. */
export function buildIndustryTree(flat: Industry[]): IndustryNode[] {
  const byParent = new Map<string | undefined, Industry[]>()
  for (const i of flat) {
    const p = i.parentId
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p)!.push(i)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  function walk(parentKey: string | undefined): IndustryNode[] {
    return (byParent.get(parentKey) ?? []).map((i) => ({
      ...i,
      children: walk(i.id)
    }))
  }
  return walk(undefined)
}

/** Depth-first order for lists and pickers. */
export function flattenIndustryTree(nodes: IndustryNode[], depth = 0): Array<{ industry: Industry; depth: number }> {
  const out: Array<{ industry: Industry; depth: number }> = []
  for (const n of nodes) {
    const { children, ...industry } = n
    out.push({ industry, depth })
    out.push(...flattenIndustryTree(children, depth + 1))
  }
  return out
}

export function orderIndustriesForUi(flat: Industry[]): Array<{ industry: Industry; depth: number }> {
  return flattenIndustryTree(buildIndustryTree(flat))
}

/** When editing `selfId`, cannot choose self or any descendant as parent. */
export function excludedParentIds(flat: Industry[], selfId: string | undefined): Set<string> {
  const excluded = new Set<string>()
  if (!selfId) return excluded
  excluded.add(selfId)
  const byParent = new Map<string | undefined, Industry[]>()
  for (const i of flat) {
    const p = i.parentId
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p)!.push(i)
  }
  function walkDown(rootId: string) {
    for (const ch of byParent.get(rootId) ?? []) {
      excluded.add(ch.id)
      walkDown(ch.id)
    }
  }
  walkDown(selfId)
  return excluded
}
