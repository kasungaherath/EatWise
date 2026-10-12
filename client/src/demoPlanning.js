// Guest preview shares the server's pure calculations and public catalogue.
// No API credentials, account data, or network calls are used here.
import catalogue from '../../server/database/deployment_catalogue.json'
import expansion from '../../server/database/twenty_more_foods.json'
import { calculateEnergy } from '../../server/src/services/nutritionService.js'
import { calculateNutritionTargets } from '../../server/src/services/nutritionTargets.js'
import { evaluateFoodEligibility } from '../../server/src/services/foodEligibilityService.js'
import { maximumWholeQuantity } from '../../server/src/services/foodQuantityLimitService.js'
import { planGoalFoodQuantities } from '../../server/src/services/foodGoalSelectionService.js'

export function demoNutrition(profile) {
  const estimate = calculateEnergy(profile)
  return { estimate, targets: calculateNutritionTargets({maintenanceCalories:estimate.maintenanceCalories,goal:profile.goal}) }
}

export function generateDemoFoodSuggestion(profile, preferences) {
  const { targets } = demoNutrition(profile)
  const records = [...new Map([...catalogue.foods, ...expansion].map(entry => [entry.food.source_reference, entry])).values()]
  const foods = records.flatMap(({food, portions, limit}, index) => {
    if (!limit || !evaluateFoodEligibility(food, {
      diet_type:preferences.dietType,
      allergies:preferences.allergies,
      avoided_foods:preferences.avoidedFoods,
    }).eligible) return []
    const maxDailyGrams = Number(limit.max_daily_grams)
    return [{foodId:1000+index,sourceReference:food.source_reference,name:food.name,preparationState:food.preparation_state,
      maxDailyGrams,quantityPolicyLabel:limit.policy_label,
      nutritionPer100g:{calories:Number(food.calories_per_100g),proteinGrams:Number(food.protein_per_100g),
        carbohydrateGrams:Number(food.carbohydrate_per_100g),fatGrams:Number(food.fat_per_100g),
        fiberGrams:food.fiber_per_100g == null ? null : Number(food.fiber_per_100g)},
      portions:portions.map((portion,p)=>({portionId:10000+index*10+p,label:portion.label,amount:Number(portion.amount),
        unitSingular:portion.unit_singular,unitPlural:portion.unit_plural,gramWeight:Number(portion.gram_weight),
        maxQuantity:maximumWholeQuantity(maxDailyGrams,portion.amount,portion.gram_weight)})).filter(p=>p.maxQuantity>=1),
    }]
  }).filter(food=>food.portions.length)
  if (!foods.length) throw new Error('No sample foods match these preferences. Check your diet and exclusions; unsupported allergy terms cannot be safely matched.')
  return {...planGoalFoodQuantities({goal:profile.goal,dietType:preferences.dietType,targets,foods}),generatedBy:'guest_preview',isDemo:true,scope:'daily_totals'}
}
