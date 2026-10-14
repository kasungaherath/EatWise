import catalogue from '../../database/deployment_catalogue.json' with { type: 'json' }
import extraFoods from '../../database/twenty_more_foods.json' with { type: 'json' }

// Use the same familiar names in food results and catalogue selections.
const labelsByReference = new Map([
  ['171265', 'Fresh whole milk'],
  ['173806', 'Unsalted peanuts'],
  ['168917', 'Cooked quinoa'],
  ['170287', 'Cooked bulgur'],
  ['171688', 'Apple'],
  ['171705', 'Avocado'],
  ['168463', 'Cooked spinach'],
  ['175168', 'Cooked salmon'],
  ['168878', 'Cooked rice'],
  ['173944', 'Banana'],
  ['172421', 'Cooked lentils'],
  ['173424', 'Boiled egg'],
  ['171477', 'Roasted chicken breast'],
  ['171413', 'Olive oil'],
  ['172475', 'Firm tofu'],
  ['170567', 'Almonds'],
  ['173757', 'Cooked chickpeas'],
  ['169967', 'Cooked broccoli'],
  ['168483', 'Baked sweet potato'],
  ['170894', 'Plain Greek yogurt'],
  ...extraFoods.map(({ food, presentation }) => [String(food.source_reference), presentation.displayName]),
])

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

const names = new Map([...catalogue.foods, ...extraFoods].map(({ food }) => [
  normalize(food.name), labelsByReference.get(String(food.source_reference)) ?? food.name,
]))
const referencesByLabel = new Map([...labelsByReference].map(([reference, label]) => [normalize(label), reference]))

export function foodDisplayName(name) {
  if (typeof name !== 'string' || !name.trim()) return 'Food'
  return names.get(normalize(name)) ?? name.trim()
}

export function foodReferenceForDisplayName(name) {
  return typeof name === 'string' ? referencesByLabel.get(normalize(name)) ?? null : null
}
