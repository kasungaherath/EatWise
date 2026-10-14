// One locally bundled photo sheet covers the catalogue and guest food names.
// Resolve by name, never database ID: guest IDs differ from catalogue IDs.
import additionalFoods from './additionalFoodPresentation.json'

// The photographed tiles are not an equal grid. Use their actual boundaries,
// and trim only the empty table space below the final row's dishes.
const expansionColumns = [0, 279, 561, 845, 1129, 1402]
const expansionRows = [0, 279, 551, 819, 1102]

const extraPhotos = new Map(additionalFoods.flatMap((food, index) => {
  const column = index % 5
  const row = Math.floor(index / 5)
  const cellWidth = expansionColumns[column + 1] - expansionColumns[column]
  const cellHeight = expansionRows[row + 1] - expansionRows[row]
  const size = Math.min(cellWidth, cellHeight)
  const x = expansionColumns[column] + (cellWidth - size) / 2
  const y = expansionRows[row]
  const photo = { key: food.key, atlas: 'expansion', viewBox: `${x} ${y} ${size} ${size}` }
  return [food.sourceName, food.displayName].map(name => [name.toLowerCase(), photo])
}))

const photos = [
  ['rice', /\brice\b/i],
  ['lentils', /\blentils?\b/i],
  ['egg', /\beggs?\b/i],
  ['chicken', /\bchicken\b/i],
  ['olive-oil', /\bolive\b.*\boil\b|\boil\b.*\bolive\b/i],
  ['tofu', /\btofu\b/i],
  ['almonds', /\balmonds?\b/i],
  ['chickpeas', /\bchickpeas?\b|\bgarbanzo\b/i],
  ['broccoli', /\bbroccoli\b/i],
  ['sweet-potato', /\bsweet[ -]+potato(?:es)?\b/i],
  ['yogurt', /\byog[hu]*urt\b/i],
  ['banana', /\bbananas?\b/i],
  ['milk', /\bmilk\b/i],
  ['peanuts', /\bpeanuts?\b/i],
  ['quinoa', /\bquinoa\b/i],
  ['avocado', /\bavocados?\b/i],
  ['spinach', /\bspinach\b/i],
  ['salmon', /\bsalmon\b/i],
  ['bulgur', /\bbulgur\b/i],
  ['apple', /\bapples?\b/i],
  ['oats', /\boats?\b|\boatmeal\b/i],
  ['brown-rice', null],
  ['broccoli-zucchini', null],
  ['general-food', null],
]

// Square crops fill the thumbnail without letterboxing or stretching.
// Keep each crop inside its photographed row; trim the last row's empty
// table space below the food rather than shrinking it into a tall frame.
const rowFrames = [
  { top: 0, size: 250 },
  { top: 250, size: 246 },
  { top: 496, size: 244 },
  { top: 740, size: 256 },
]

function photoAt(index) {
  const { top, size } = rowFrames[Math.floor(index / 6)]
  const left = (index % 6) * 256 + (256 - size) / 2
  return {
    key: photos[index][0],
    viewBox: left + ' ' + top + ' ' + size + ' ' + size,
  }
}

export function foodImageFor(name) {
  const label = typeof name === 'string' ? name : ''
  const extra = extraPhotos.get(label.trim().toLowerCase())
  if (extra) return extra
  if (/\bbrown\b/i.test(label) && /\brice\b/i.test(label)) return photoAt(21)
  if (/\bbroccoli\b/i.test(label) && /\bzucchini\b/i.test(label)) return photoAt(22)
  const index = photos.findIndex(([, match]) => match?.test(label))
  return photoAt(index < 0 ? 23 : index)
}
