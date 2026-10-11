import foodAtlas from './assets/food-photography-atlas.webp'

export { foodAtlas }

let atlasImage
let preparation

// Fetch once while the workspace opens, rather than when AI results arrive.
// Keep the decoded image alive so generated and saved lists share the cache.
export function prepareFoodImages() {
  if (preparation) return preparation

  atlasImage = new Image()
  atlasImage.decoding = 'async'
  atlasImage.fetchPriority = 'low'

  preparation = new Promise((resolve) => {
    atlasImage.onload = async () => {
      try {
        await atlasImage.decode()
      } catch {
        // A loaded image can still render when explicit decoding is unavailable.
      }
      resolve(true)
    }
    atlasImage.onerror = () => {
      preparation = null
      resolve(false)
    }
    atlasImage.src = foodAtlas
  })

  return preparation
}
