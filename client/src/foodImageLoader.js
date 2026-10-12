import foodAtlas from './assets/food-photography-atlas.webp'
import expansionAtlas from './assets/food-photography-expansion.webp'

export { foodAtlas }
export const foodAtlases = {
  default: { source: foodAtlas, width: 1536, height: 1024 },
  expansion: { source: expansionAtlas, width: 1402, height: 1122 },
}

const atlasImages = []
let preparation

// Fetch once while the workspace opens, rather than when AI results arrive.
// Keep the decoded image alive so generated and saved lists share the cache.
export function prepareFoodImages() {
  if (preparation) return preparation

  preparation = Promise.all(Object.values(foodAtlases).map(({ source }) => {
    const atlasImage = new Image()
    atlasImages.push(atlasImage)
    atlasImage.decoding = 'async'
    atlasImage.fetchPriority = 'low'

    return new Promise((resolve) => {
      atlasImage.onload = async () => {
        try {
          await atlasImage.decode()
        } catch {
          // A loaded image can still render when explicit decoding is unavailable.
        }
        resolve(true)
      }
      atlasImage.onerror = () => resolve(false)
      atlasImage.src = source
    })
  })).then(results => {
    if (results.some(loaded => !loaded)) preparation = null
    return results.every(Boolean)
  })

  return preparation
}
