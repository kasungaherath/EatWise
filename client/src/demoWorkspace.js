import { demoNutrition, generateDemoFoodSuggestion } from './demoPlanning.js'

// Realistic demo data and local state for guest preview mode in EatWise

const todayStr = new Date().toISOString().slice(0, 10)

export const DEFAULT_DEMO_PROFILE = {
  age: 26,
  sexForCalculation: 'female',
  heightCm: 168,
  weightKg: 62,
  activityLevel: 'active',
  goal: 'maintain_weight',
}

export const DEFAULT_DEMO_NUTRITION = demoNutrition(DEFAULT_DEMO_PROFILE)

export const DEFAULT_DEMO_PREFERENCES = {
  dietType: 'omnivore',
  allergies: [],
  avoidedFoods: [],
  dailyBudgetLkr: '2500',
  mealsPerDay: '3',
}

export const DEFAULT_DEMO_SUGGESTION = generateDemoFoodSuggestion(DEFAULT_DEMO_PROFILE, DEFAULT_DEMO_PREFERENCES)

export const DEFAULT_DEMO_DRAFTS = [
  {
    id: 901,
    title: 'Balanced High-Energy Active Day',
    planDate: todayStr,
    status: 'draft',
    suggestion: DEFAULT_DEMO_SUGGESTION,
    createdAt: new Date().toISOString(),
  },
]

// Storage helpers for demo persistence across page refresh
const STORAGE_PREFIX = 'eatwise_demo_'

export function getDemoStorage(key, fallback) {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function setDemoStorage(key, value) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
  } catch {
    // Ignore storage errors
  }
}
