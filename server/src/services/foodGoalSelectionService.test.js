import test from 'node:test'
import assert from 'node:assert/strict'
import catalogue from '../../database/deployment_catalogue.json' with { type:'json' }
import expansion from '../../database/twenty_more_foods.json' with { type:'json' }
import { calculateEnergy } from './nutritionService.js'
import { calculateNutritionTargets } from './nutritionTargets.js'
import { evaluateFoodEligibility } from './foodEligibilityService.js'
import { maximumWholeQuantity } from './foodQuantityLimitService.js'
import { foodGroup, goalFoodSelection, goalFoodCandidate, planGoalFoodQuantities, nutritionDistance } from './foodGoalSelectionService.js'
import { generateFoodSuggestion } from './foodSuggestionService.js'

function contextFor(goal, dietType = 'omnivore', avoidedFoods = []) {
  const { maintenanceCalories } = calculateEnergy({age:23,sexForCalculation:'male',heightCm:172,weightKg:75,activityLevel:'active'})
  const foods = [...catalogue.foods,...expansion].flatMap(({food,portions,limit},index)=>{
    if (!evaluateFoodEligibility(food,{diet_type:dietType,allergies:[],avoided_foods:avoidedFoods}).eligible) return []
    const maxDailyGrams=Number(limit.max_daily_grams)
    return [{foodId:index+1,sourceReference:food.source_reference,name:food.name,preparationState:food.preparation_state,
      maxDailyGrams,quantityPolicyLabel:limit.policy_label,
      nutritionPer100g:{calories:Number(food.calories_per_100g),proteinGrams:Number(food.protein_per_100g),carbohydrateGrams:Number(food.carbohydrate_per_100g),fatGrams:Number(food.fat_per_100g),fiberGrams:Number(food.fiber_per_100g)},
      portions:portions.map((p,n)=>({portionId:index*10+n+1,amount:Number(p.amount),gramWeight:Number(p.gram_weight),unitSingular:p.unit_singular,unitPlural:p.unit_plural,maxQuantity:maximumWholeQuantity(maxDailyGrams,p.amount,p.gram_weight)})),
    }]
  })
  return {goal,dietType,foods,targets:calculateNutritionTargets({maintenanceCalories,goal})}
}

test('expansion contains exactly 20 distinct new USDA foods with usable portions and full macros',()=>{
  assert.equal(expansion.length,20)
  const existing=new Set(catalogue.foods.map(x=>x.food.source_reference))
  const refs=new Set(expansion.map(x=>x.food.source_reference))
  assert.equal(refs.size,20)
  for(const {food,portions,limit} of expansion){
    assert.equal(existing.has(food.source_reference),false)
    for(const key of ['calories_per_100g','protein_per_100g','carbohydrate_per_100g','fat_per_100g','fiber_per_100g']) assert.ok(Number.isFinite(Number(food[key])) && Number(food[key])>=0)
    assert.ok(portions.length && Number(limit.max_daily_grams)>0)
    assert.ok(food.source_url.includes(food.source_reference))
  }
})

test('new foods respect vegan, vegetarian, pescatarian and avoidance classifications',()=>{
  const get = key=>expansion.find(x=>x.presentation.key===key).food
  const preferences={diet_type:'vegan',allergies:[],avoided_foods:[]}
  for(const key of ['turkey','tuna','cottage-cheese','whole-wheat-bread']) assert.equal(evaluateFoodEligibility(get(key),preferences).eligible,false)
  assert.equal(evaluateFoodEligibility(get('edamame'),preferences).eligible,true)
  assert.equal(evaluateFoodEligibility(get('tuna'),{...preferences,diet_type:'pescatarian'}).eligible,true)
  assert.equal(evaluateFoodEligibility(get('turkey'),{...preferences,diet_type:'pescatarian'}).eligible,false)
  for(const [key,term] of [['edamame','soy'],['whole-wheat-bread','gluten'],['walnuts','tree nuts'],['peanut-butter','peanuts'],['pumpkin-seeds','seeds'],['tuna','fish']]) {
    assert.equal(evaluateFoodEligibility(get(key),{...preferences,diet_type:'omnivore',avoided_foods:[term]}).reason,'avoided_food')
  }
})

test('muscle goal includes eligible eggs in whole counts when the AI omits them',async()=>{
  const context=contextFor('gain_muscle')
  const rice=context.foods.find(x=>x.sourceReference==='168878')
  const result=await generateFoodSuggestion(context,{requestProposal:async()=>({output_text:JSON.stringify({status:'candidate',items:[{portionId:rice.portions[0].portionId,quantity:200}]})})})
  const egg=context.foods.find(x=>x.sourceReference==='173424')
  const item=result.calculation.items.find(x=>x.foodId===egg.foodId)
  assert.ok(item)
  assert.ok(item.unit.includes('egg'))
  assert.ok(Number.isSafeInteger(item.quantity) && item.quantity>=1)
  assert.equal(result.goalSelection.label,'Gain muscle')
})

test('muscle goal never forces eggs into vegan or egg-free eligible selections',()=>{
  for(const context of [contextFor('gain_muscle','vegan'),contextFor('gain_muscle','omnivore',['eggs'])]){
    assert.ok(goalFoodSelection(context).required.every(food=>food.sourceReference!=='173424'))
    const result=planGoalFoodQuantities(context)
    assert.ok(result.calculation.items.every(item=>!/\begg\b/i.test(item.name)))
  }
})

test('goal planner keeps variety, quantities within limits and totals reproducible for every goal and diet',()=>{
  for(const goal of ['gain_muscle','lose_weight','maintain_weight']) for(const diet of ['omnivore','vegetarian','vegan','pescatarian']){
    const context=contextFor(goal,diet)
    const result=planGoalFoodQuantities(context)
    const ids=new Set()
    const selectedGroups=new Set()
    let calories=0
    for(const item of result.calculation.items){
      assert.equal(ids.has(item.foodId),false)
      ids.add(item.foodId)
      const food=context.foods.find(x=>x.foodId===item.foodId)
      assert.ok(food)
      selectedGroups.add(foodGroup(food))
      assert.ok(item.grams>0 && item.grams<=food.maxDailyGrams)
      if (['vegetable','fruit'].includes(foodGroup(food))) assert.ok(item.grams>=100)
      assert.ok(Number.isSafeInteger(item.quantity))
      calories+=item.nutrition.calories
    }
    for(const group of ['protein','carbohydrate','fat','vegetable','fruit']) assert.ok(selectedGroups.has(group),`${goal}/${diet}: missing ${group}`)
    assert.ok(Math.abs(result.calculation.totals.calories-calories)<0.1)
    assert.ok(result.calculation.items.length<=10)
    assert.equal(result.targetMatch.status,'within_tolerance',`${goal}/${diet}: did not match the reference targets`)
    assert.equal(result.goalSelection.goal,goal)
  }
})

test('muscle and loss goals rank protein choices differently and only muscle requires eggs',()=>{
  const muscle=goalFoodSelection(contextFor('gain_muscle'))
  const loss=goalFoodSelection(contextFor('lose_weight'))
  assert.ok(muscle.required.some(food=>food.sourceReference==='173424'))
  assert.ok(loss.required.every(food=>food.sourceReference!=='173424'))
  assert.notDeepEqual(muscle.ranked.map(x=>x.foodId),loss.ranked.map(x=>x.foodId))
})

test('every omnivore goal gives chicken first place instead of turkey and keeps macro matching',()=>{
  for(const goal of ['gain_muscle','lose_weight','maintain_weight']) {
    const context=contextFor(goal)
    const selection=goalFoodSelection(context)
    const chicken=context.foods.find(food=>food.sourceReference==='171477')
    const turkey=context.foods.find(food=>food.sourceReference==='171496')
    assert.equal(selection.selected[0].foodId,chicken.foodId)
    assert.ok(selection.ranked.every(food=>food.foodId!==turkey.foodId))
    const result=planGoalFoodQuantities(context)
    assert.equal(result.calculation.items[0].foodId,chicken.foodId)
    assert.ok(result.calculation.items.every(item=>item.foodId!==turkey.foodId))
    assert.equal(result.targetMatch.status,'within_tolerance',goal)
    assert.equal(result.goalSelection.foodPreference,'common_first')
  }
})

test('chicken preference cannot override dietary or avoided-food exclusions',()=>{
  for(const context of [contextFor('gain_muscle','vegan'),contextFor('gain_muscle','vegetarian'),contextFor('gain_muscle','pescatarian'),contextFor('gain_muscle','omnivore',['chicken breast'])]) {
    const selection=goalFoodSelection(context)
    assert.ok(selection.required.every(food=>food.sourceReference!=='171477'))
    const result=planGoalFoodQuantities(context)
    assert.ok(result.calculation.items.every(item=>!/chicken/i.test(item.name)))
  }
  const context=contextFor('gain_muscle','omnivore',['chicken'])
  assert.ok(goalFoodSelection(context).ranked.some(food=>food.sourceReference==='171496'))
})

test('AI turkey proposals are replaced by eligible chicken and chicken is shown first',async()=>{
  const context=contextFor('gain_muscle')
  const turkey=context.foods.find(food=>food.sourceReference==='171496')
  const chicken=context.foods.find(food=>food.sourceReference==='171477')
  const result=await generateFoodSuggestion(context,{requestProposal:async request=>{
    assert.ok(request.input.includes('Do not\n  choose turkey breast'))
    return {output_text:JSON.stringify({status:'candidate',items:[{portionId:turkey.portions[0].portionId,quantity:300}]})}
  }})
  assert.equal(result.calculation.items[0].foodId,chicken.foodId)
  assert.ok(result.calculation.items.every(item=>item.foodId!==turkey.foodId))
})

test('everyday staples take priority over specialty foods within each food group',()=>{
  const selection=goalFoodSelection(contextFor('gain_muscle'))
  const before=(common,specialty)=>assert.ok(selection.ranked.findIndex(food=>food.sourceReference===common)
    <selection.ranked.findIndex(food=>food.sourceReference===specialty))
  before('172421','168411') // lentils before edamame
  before('173904','168917') // oats before quinoa
  before('173806','170187') // peanuts before walnuts
  before('173944','167762') // bananas before strawberries
})

test('a target-matching everyday draft stays preferred over an AI specialty mix',()=>{
  const context=contextFor('gain_muscle')
  const baseline=planGoalFoodQuantities(context)
  const withSpecialtyProposal=planGoalFoodQuantities(context,goalFoodCandidate(context,{preferCommon:false}))
  assert.equal(baseline.targetMatch.status,'within_tolerance')
  assert.equal(withSpecialtyProposal.targetMatch.status,'within_tolerance')
  assert.deepEqual(withSpecialtyProposal.calculation.items.map(item=>item.foodId),baseline.calculation.items.map(item=>item.foodId))
})

test('candidate comparison keeps the better macro fit after clamping and adjustment',()=>{
  const context=contextFor('gain_muscle')
  const template=planGoalFoodQuantities(context)
  const rice=context.foods.find(x=>x.sourceReference==='168878')
  const chosen=planGoalFoodQuantities(context,[{portionId:rice.portions[0].portionId,quantity:5}])
  assert.ok(nutritionDistance(chosen.comparison)<=nutritionDistance(template.comparison)+1e-12)
})
