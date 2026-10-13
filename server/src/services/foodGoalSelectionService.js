import extraFoods from '../../database/twenty_more_foods.json' with { type: 'json' }
import { calculateFoodPortions } from './foodPortionService.js'
import { applyDailyQuantityLimits, maximumWholeQuantity } from './foodQuantityLimitService.js'

const groups = new Map([
  ['168878', 'carbohydrate'], ['172421', 'protein'], ['173424', 'protein'],
  ['171477', 'protein'], ['171413', 'fat'], ['172475', 'protein'],
  ['170567', 'fat'], ['173757', 'protein'], ['169967', 'vegetable'],
  ['168483', 'carbohydrate'], ['170894', 'protein'], ['171265', 'protein'],
  ['173806', 'fat'], ['168917', 'carbohydrate'], ['171705', 'fat'],
  ['168463', 'vegetable'], ['175168', 'protein'], ['170287', 'carbohydrate'],
  ['171688', 'fruit'], ['173944', 'fruit'],
  ...extraFoods.map(({ food, presentation }) => [food.source_reference, presentation.group]),
])

// Product defaults for everyday shopping, not live availability or price data.
const everydayFoods = new Set([
  '171477', '173424', '172421', '171265', '173757', '168878',
  '169704', '173904', '172688', '170093', '175194', '173735',
  '173806', '172470', '168463', '169967', '170394', '170397',
  '173944', '171688', '169097',
])
const specialtyFoods = new Set([
  '171496', '168917', '175168', '170287', '168411', '172182',
  '170187', '170557', '170554', '169414', '167762',
])
const chickenReference = '171477'
const turkeyReference = '171496'

function shoppingPriority(food) {
  const reference = String(food.sourceReference)
  return everydayFoods.has(reference) ? 0 : specialtyFoods.has(reference) ? 2 : 1
}

const policies = {
  gain_muscle: {
    label: 'Gain muscle',
    focus: 'Protein sources, enough energy, and a varied mix of grains, fruit, and vegetables.',
    counts: { protein: 2, carbohydrate: 3, fat: 2, vegetable: 2, fruit: 1 },
  },
  lose_weight: {
    label: 'Lose weight',
    focus: 'Lean protein, fibre-rich foods, fruit, and vegetables within your calorie target.',
    counts: { protein: 2, carbohydrate: 3, fat: 2, vegetable: 2, fruit: 1 },
  },
  maintain_weight: {
    label: 'Maintain weight',
    focus: 'A balanced mix of protein, grains, healthy fats, fruit, and vegetables.',
    counts: { protein: 2, carbohydrate: 3, fat: 2, vegetable: 2, fruit: 1 },
  },
}

export function foodGroup(food) {
  return groups.get(String(food.sourceReference ?? food.source_reference)) ?? 'other'
}

function rank(food, goal) {
  const n = food.nutritionPer100g
  const energy = Math.max(1, n.calories)
  const proteinDensity = n.proteinGrams * 4 / energy
  const fibre = Math.min(10, (n.fiberGrams ?? 0) * food.maxDailyGrams / 100)
  const group = foodGroup(food)
  // Rank realistic daily capacity, so a small seed allowance cannot displace
  // the foods needed to meet the day's carbohydrate and fat targets.
  if (group === 'fat') return n.fatGrams * food.maxDailyGrams / 100 + fibre * 0.3
  if (group === 'carbohydrate') {
    const wholeGrain = ['173904','169704','172688','168917','170287'].includes(String(food.sourceReference))
    return n.carbohydrateGrams * food.maxDailyGrams / 800 + fibre * 0.4 + (wholeGrain ? 3 : 0)
  }
  if (goal === 'lose_weight') return proteinDensity * 50 + fibre * 3 - energy / 100
  if (goal === 'gain_muscle') return proteinDensity * 35 + fibre + energy / 150
  return proteinDensity * 25 + fibre * 2
}

function family(food) {
  return ['168878', '169704'].includes(String(food.sourceReference)) ? 'rice' : String(food.sourceReference)
}

function preferredPortion(food) {
  return food.portions.find(p => !['gram', 'g'].includes(p.unitSingular) && p.maxQuantity >= 1)
    ?? food.portions.find(p => p.maxQuantity >= 1)
}

export function goalFoodSelection(context, { preferCommon = true } = {}) {
  const policy = policies[context.goal]
  if (!policy) throw new Error('Select a valid nutrition goal.')
  const chicken = context.dietType === 'omnivore'
    ? context.foods.find(food => String(food.sourceReference) === chickenReference && preferredPortion(food))
    : null
  // Turkey remains a fallback when chicken is unavailable or excluded.
  const ranked = context.foods.filter(food => !chicken || String(food.sourceReference) !== turkeyReference)
    .sort((a, b) => (preferCommon ? shoppingPriority(a) - shoppingPriority(b) : 0)
      || rank(b, context.goal) - rank(a, context.goal) || a.foodId - b.foodId)
  // This list is already filtered for the user's diet and exclusions.
  // Still check the diet explicitly: a muscle goal must never override vegan choices.
  const egg = context.goal === 'gain_muscle' && ['omnivore', 'vegetarian', 'pescatarian'].includes(context.dietType)
    ? ranked.find(food => String(food.sourceReference) === '173424' && preferredPortion(food))
    : null
  const required = [chicken, egg].filter(Boolean)
  const selected = [...required]
  for (const [group, count] of Object.entries(policy.counts)) {
    const available = ranked.filter(food => foodGroup(food) === group && preferredPortion(food))
    for (const food of available) {
      if (selected.filter(item => foodGroup(item) === group).length >= count) break
      if (selected.some(item => family(item) === family(food))) continue
      if (!selected.some(item => item.foodId === food.foodId)) selected.push(food)
    }
  }
  return { ...policy, required, selected, ranked }
}

function initialQuantity(food, portion, calories) {
  const group = foodGroup(food)
  const grams = String(food.sourceReference) === '173424' ? 100
    : group === 'vegetable' || group === 'fruit' ? 150
    : calories / Math.max(1, food.nutritionPer100g.calories) * 100
  return Math.max(1, Math.min(
    maximumWholeQuantity(food.maxDailyGrams, portion.amount, portion.gramWeight),
    Math.round(grams / portion.gramWeight * portion.amount),
  ))
}

export function goalFoodCandidate(context, options) {
  const selection = goalFoodSelection(context, options)
  const budgets = { protein: 0.38, carbohydrate: 0.4, fat: 0.12, vegetable: 0.04, fruit: 0.06 }
  return selection.selected.map(food => {
    const portion = preferredPortion(food)
    const group = foodGroup(food)
    const count = selection.selected.filter(item => foodGroup(item) === group).length
    return { portionId: portion.portionId, quantity: initialQuantity(food, portion, context.targets.targetCalories * budgets[group] / count) }
  })
}

export function completeGoalSelection(proposal, context) {
  const selection = goalFoodSelection(context)
  const portions = new Map(context.foods.flatMap(food => food.portions.map(portion => [portion.portionId, food])))
  const chickenPreferred = selection.required.some(food => String(food.sourceReference) === chickenReference)
  const result = proposal.filter(item => !chickenPreferred
    || String(portions.get(item.portionId)?.sourceReference) !== turkeyReference)
    .map(item => ({ ...item }))
  const selected = new Set(result.map(item => portions.get(item.portionId)?.foodId))
  const append = (food) => {
    if (selected.has(food.foodId)) return
    const portion = preferredPortion(food)
    if (!portion) return
    result.push({ portionId: portion.portionId, quantity: initialQuantity(food, portion, 150) })
    selected.add(food.foodId)
  }
  selection.required.forEach(append)
  // Preserve variety even if the provider proposes only protein or starch.
  for (const group of Object.keys(selection.counts)) {
    if (result.some(item => foodGroup(portions.get(item.portionId) ?? {}) === group)) continue
    const food = selection.selected.find(item => foodGroup(item) === group)
    if (food) append(food)
  }
  if (result.length > 50) throw new Error('The food selection contains too many foods.')
  return result
}

function calculateProposal(proposal, context) {
  // Search floors keep fruit and vegetables from becoming token quantities.
  // These are editable prototype bounds, not clinical serving prescriptions.
  const minimums = { protein: 50, carbohydrate: 50, fat: 10, vegetable: 100, fruit: 100 }
  const boundedContext = {
    ...context,
    foods: context.foods.map(food => ({
      ...food,
      minDailyGrams: Math.min(food.maxDailyGrams, minimums[foodGroup(food)] ?? 1),
    })),
  }
  const lookup = new Map(context.foods.flatMap(food => food.portions.map(portion => [portion.portionId, {food, portion}])))
  const selected = new Set()
  const items = proposal.map(item => {
    const entry = lookup.get(item.portionId)
    if (!entry || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || selected.has(entry.food.foodId)) throw new Error('Invalid food candidate.')
    selected.add(entry.food.foodId)
    const {food, portion} = entry
    return {
      food: {id:food.foodId,name:food.name,preparation_state:food.preparationState,
        calories_per_100g:food.nutritionPer100g.calories,protein_per_100g:food.nutritionPer100g.proteinGrams,
        carbohydrate_per_100g:food.nutritionPer100g.carbohydrateGrams,fat_per_100g:food.nutritionPer100g.fatGrams,
        fiber_per_100g:food.nutritionPer100g.fiberGrams},
      portion: {id:portion.portionId,food_id:food.foodId,amount:portion.amount,gram_weight:portion.gramWeight,
        unit_singular:portion.unitSingular,unit_plural:portion.unitPlural},
      quantity:Math.min(item.quantity, maximumWholeQuantity(food.maxDailyGrams,portion.amount,portion.gramWeight)),
    }
  })
  return applyDailyQuantityLimits({status:'draft',calculation:calculateFoodPortions(items)},boundedContext)
}

export function nutritionDistance(comparison) {
  return Object.values(comparison).reduce((score, row) => {
    const distance = Math.abs(row.actual - row.target) / row.target
    return score + Math.max(0, distance - row.tolerancePercent / 100) ** 2 + 0.001 * distance ** 2
  }, 0)
}

function candidateIsBetter(candidate, current, context) {
  const candidateMatches = candidate.targetMatch.status === 'within_tolerance'
  const currentMatches = current.targetMatch.status === 'within_tolerance'
  if (candidateMatches !== currentMatches) return candidateMatches
  if (candidateMatches) {
    const byId = new Map(context.foods.map(food => [food.foodId, food]))
    const shoppingScore = result => result.calculation.items.reduce(
      (score, item) => score + shoppingPriority(byId.get(item.foodId)), 0,
    )
    const difference = shoppingScore(candidate) - shoppingScore(current)
    if (difference !== 0) return difference < 0
  }
  return nutritionDistance(candidate.comparison) < nutritionDistance(current.comparison)
}

export function planGoalFoodQuantities(context, proposal = null) {
  const template = calculateProposal(goalFoodCandidate(context), context)
  // If staples alone cannot meet the targets, compare a nutrition-ranked mix.
  const nutritionTemplate = template.targetMatch.status === 'within_tolerance' ? null
    : calculateProposal(goalFoodCandidate(context, { preferCommon: false }), context)
  const fromAI = proposal ? calculateProposal(completeGoalSelection(proposal, context), context) : null
  const selection = goalFoodSelection(context)
  let best = nutritionTemplate && candidateIsBetter(nutritionTemplate, template, context) ? nutritionTemplate : template
  if (fromAI && candidateIsBetter(fromAI, best, context)) best = fromAI
  const useAI = best === fromAI
  let changedFoods = false
  if (best.targetMatch.status !== 'within_tolerance') {
    // One bounded comparison pass over alternative foods. Keep required eggs
    // and every existing food group, and never accept a worse macro match.
    for (let index = 0; index < best.calculation.items.length; index++) {
      // Carry earlier improvements forward so complementary swaps can work
      // together, rather than repeatedly returning to the original candidate.
      const initialItems = best.calculation.items
      const current = context.foods.find(food => food.foodId === initialItems[index].foodId)
      if (selection.required.some(food => food.foodId === current.foodId)) continue
      const alternatives = selection.ranked.filter(food => foodGroup(food) === foodGroup(current)
        && !initialItems.some(item => item.foodId === food.foodId)
        && !initialItems.some(item => family(context.foods.find(food => food.foodId === item.foodId)) === family(food)))
        .slice(0, 3)
      for (const food of alternatives) {
        const portion = preferredPortion(food)
        if (!portion) continue
        const variant = initialItems.map((item, i) => i === index
          ? {portionId:portion.portionId, quantity:initialQuantity(food, portion, item.nutrition.calories)}
          : {portionId:item.portionId,quantity:item.quantity})
        const candidate = calculateProposal(variant, context)
        if (candidateIsBetter(candidate, best, context)) {
          best = candidate
          changedFoods = true
        }
      }
    }
  }
  return {
    ...best,
    calculation: {
      ...best.calculation,
      items: [...best.calculation.items].sort((a, b) => {
        const isChicken = item => selection.required.some(food => food.foodId === item.foodId
          && String(food.sourceReference) === chickenReference)
        return Number(isChicken(b)) - Number(isChicken(a))
      }),
    },
    goalSelection: {goal:context.goal,label:selection.label,focus:selection.focus,
      method:changedFoods ? 'goal_and_macro_comparison' : useAI ? 'ai_with_goal_rules' : 'goal_ranked_catalogue',
      foodPreference: 'common_first',
      requiredFoodIds:selection.required.map(food=>food.foodId)},
  }
}
