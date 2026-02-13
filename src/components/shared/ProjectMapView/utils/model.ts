import { GetModelAllDtoOut, ModelConfig, SARChangeDetectionKey } from '@interfaces/index'

export function buildModelNameWithParent(model: GetModelAllDtoOut, modelAll?: GetModelAllDtoOut[]): GetModelAllDtoOut {
  if (!model?.parentModelId || !Array.isArray(modelAll)) return model

  const byId = new Map<number, GetModelAllDtoOut>()
  for (const m of modelAll) byId.set(m.id, m)

  let cur: GetModelAllDtoOut | undefined = model
  const seen = new Set<number>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (!cur.parentModelId) break
    const parent = byId.get(cur.parentModelId)
    if (!parent) break
    cur = parent
  }

  if (cur) {
    return {
      ...model,
      name: `${cur.name} - ${model.name}`,
      nameEn: `${cur.nameEn} - ${model.nameEn}`,
    }
  }
  return model
}

export function findModelByKeyOrName(
  modelAll: GetModelAllDtoOut[] | undefined,
  key: string,
): GetModelAllDtoOut | undefined {
  if (!Array.isArray(modelAll) || modelAll.length === 0 || !key) return undefined

  let byKey = modelAll.find((m) => m.key === key)

  // Special case: SAR change detection "key"
  if (key === SARChangeDetectionKey) {
    byKey = modelAll.find((m) => m.id === ModelConfig.sar_change_detection_v1)
  }

  if (byKey && byKey.parentModelId != null) {
    return buildModelNameWithParent(byKey, modelAll)
  }
  if (byKey) return byKey

  // Fallback by name
  const byName = modelAll.find((m) => m.modelName === key)
  return byName
}
