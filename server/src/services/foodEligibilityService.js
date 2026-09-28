const dietColumns = {
  omnivore: null,
  vegetarian: 'is_vegetarian',
  vegan: 'is_vegan',
  pescatarian: 'is_pescatarian',
}

const aliases = new Map([
  ['egg', 'egg'],
  ['eggs', 'egg'],
  ['rice', 'rice'],
  ['lentil', 'lentil'],
  ['lentils', 'lentil'],
  ['banana', 'banana'],
  ['bananas', 'banana'],
  ['chicken', 'chicken'],
  ['tofu', 'tofu'],
  ['soy', 'soy'],
  ['soya', 'soy'],
  ['soybean', 'soy'],
  ['soybeans', 'soy'],
  ['soy bean', 'soy'],
  ['soy beans', 'soy'],
  ['almond', 'almond'],
  ['almonds', 'almond'],
  ['tree nut', 'tree_nut'],
  ['tree nuts', 'tree_nut'],
  ['olive oil', 'olive_oil'],
])

// Explicit classifications for the imported USDA records.
// Unknown records remain excluded when exclusions are present.
const foodTags = new Map([
  ['168878', ['rice']],
  ['173944', ['banana']],
  ['172421', ['lentil']],
  ['173424', ['egg']],
  ['171477', ['chicken']],
  ['172475', ['tofu', 'soy']],
  ['170567', ['almond', 'tree_nut']],
  ['171413', ['olive_oil']],
])

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function readList(value) {
  let list = value

  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      return null
    }
  }

  if (
    !Array.isArray(list) ||
    list.some(
      (item) =>
        typeof item !== 'string' ||
        normalize(item).length === 0
    )
  ) {
    return null
  }

  return [...new Set(list.map(normalize))]
}

function canonicalTerms(terms) {
  const result = []

  for (const term of terms) {
    const canonical = aliases.get(term)

    if (!canonical) {
      return null
    }

    result.push(canonical)
  }

  return [...new Set(result)]
}

function excluded(reason) {
  return {
    eligible: false,
    reason,
  }
}

export function evaluateFoodEligibility(food, preferences) {
  if (!food || !preferences) {
    return excluded('missing_data')
  }

  if (food.review_status !== 'approved') {
    return excluded('food_not_approved')
  }

  const diet = preferences.diet_type

  if (!Object.prototype.hasOwnProperty.call(dietColumns, diet)) {
    return excluded('invalid_diet')
  }

  const dietColumn = dietColumns[diet]

  if (
    dietColumn &&
    ![true, 1, '1'].includes(food[dietColumn])
  ) {
    return excluded('diet_mismatch_or_unknown')
  }

  const allergies = readList(preferences.allergies)
  const avoidedFoods = readList(preferences.avoided_foods)

  if (allergies === null || avoidedFoods === null) {
    return excluded('invalid_preferences')
  }

  if (allergies.length === 0 && avoidedFoods.length === 0) {
    return { eligible: true }
  }

  const allergyTerms = canonicalTerms(allergies)
  const avoidedTerms = canonicalTerms(avoidedFoods)

  if (allergyTerms === null || avoidedTerms === null) {
    return excluded('unsupported_exclusion_term')
  }

  const tags =
    food.source_name === 'USDA FoodData Central'
      ? foodTags.get(String(food.source_reference))
      : undefined

  if (!tags) {
    return excluded('food_classification_unknown')
  }

  if (avoidedTerms.some((term) => tags.includes(term))) {
    return excluded('avoided_food')
  }

  if (allergyTerms.some((term) => tags.includes(term))) {
    return excluded('allergy_match')
  }

  if (allergyTerms.length > 0) {
    const declaredAllergens = readList(food.allergens)

    if (
      !food.allergen_reviewed_at ||
      declaredAllergens === null
    ) {
      return excluded('allergen_data_unreviewed')
    }

    const declaredTerms = canonicalTerms(declaredAllergens)

    if (declaredTerms === null) {
      return excluded('allergen_classification_unknown')
    }

    // Include the broader category for almond declarations.
    const declaredTags = new Set(declaredTerms)

    if (declaredTags.has('almond')) {
      declaredTags.add('tree_nut')
    }

    if (allergyTerms.some((term) => declaredTags.has(term))) {
      return excluded('allergy_match')
    }
  }

  return { eligible: true }
}