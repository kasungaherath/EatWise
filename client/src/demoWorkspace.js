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

export const DEFAULT_DEMO_NUTRITION = {
  estimate: {
    restingCalories: 1410,
    maintenanceCalories: 2185,
  },
  targets: {
    goal: 'maintain_weight',
    calorieAdjustmentPercent: 0,
    targetCalories: 2185,
    macros: {
      proteinGrams: 125,
      carbohydrateGrams: 245,
      fatGrams: 72,
    },
  },
}

export const DEFAULT_DEMO_PREFERENCES = {
  dietType: 'omnivore',
  allergies: ['peanuts'],
  avoidedFoods: ['grapefruit'],
  dailyBudgetLkr: '2500',
  mealsPerDay: '3',
}

export const DEFAULT_DEMO_SUGGESTION = {
  status: 'draft',
  calculation: {
    items: [
      {
        foodId: 101,
        portionId: 1,
        name: 'Rolled Oats with Cinnamon',
        quantity: 80,
        unit: 'g',
        grams: 80,
        nutrition: {
          calories: 303,
          proteinGrams: 13.5,
          carbohydrateGrams: 54.0,
          fatGrams: 5.2,
        },
      },
      {
        foodId: 102,
        portionId: 2,
        name: 'Greek Yogurt (Plain, Low-Fat)',
        quantity: 200,
        unit: 'g',
        grams: 200,
        nutrition: {
          calories: 146,
          proteinGrams: 20.0,
          carbohydrateGrams: 7.8,
          fatGrams: 3.8,
        },
      },
      {
        foodId: 103,
        portionId: 3,
        name: 'Grilled Herb Chicken Breast',
        quantity: 220,
        unit: 'g',
        grams: 220,
        nutrition: {
          calories: 363,
          proteinGrams: 68.2,
          carbohydrateGrams: 0.0,
          fatGrams: 7.9,
        },
      },
      {
        foodId: 104,
        portionId: 4,
        name: 'Steamed Brown Basmati Rice',
        quantity: 200,
        unit: 'g',
        grams: 200,
        nutrition: {
          calories: 240,
          proteinGrams: 5.2,
          carbohydrateGrams: 50.4,
          fatGrams: 1.8,
        },
      },
      {
        foodId: 105,
        portionId: 5,
        name: 'Garden Steamed Broccoli & Zucchini',
        quantity: 180,
        unit: 'g',
        grams: 180,
        nutrition: {
          calories: 61,
          proteinGrams: 5.1,
          carbohydrateGrams: 12.1,
          fatGrams: 0.7,
        },
      },
      {
        foodId: 106,
        portionId: 6,
        name: 'Cold-Pressed Extra Virgin Olive Oil',
        quantity: 18,
        unit: 'g',
        grams: 18,
        nutrition: {
          calories: 160,
          proteinGrams: 0.0,
          carbohydrateGrams: 0.0,
          fatGrams: 18.0,
        },
      },
      {
        foodId: 107,
        portionId: 7,
        name: 'Baked Atlantic Salmon Fillet',
        quantity: 170,
        unit: 'g',
        grams: 170,
        nutrition: {
          calories: 354,
          proteinGrams: 34.0,
          carbohydrateGrams: 0.0,
          fatGrams: 23.5,
        },
      },
      {
        foodId: 108,
        portionId: 8,
        name: 'Roasted Sweet Potato Wedges',
        quantity: 180,
        unit: 'g',
        grams: 180,
        nutrition: {
          calories: 155,
          proteinGrams: 2.9,
          carbohydrateGrams: 36.2,
          fatGrams: 0.2,
        },
      },
    ],
    totals: {
      calories: 1782,
      proteinGrams: 148.9,
      carbohydrateGrams: 160.5,
      fatGrams: 61.1,
    },
  },
  comparison: {
    calories: { target: 2185, actual: 1782, difference: -403, withinTolerance: true },
    proteinGrams: { target: 125, actual: 148.9, difference: 23.9, withinTolerance: true },
    carbohydrateGrams: { target: 245, actual: 160.5, difference: -84.5, withinTolerance: false, direction: 'below_target' },
    fatGrams: { target: 72, actual: 61.1, difference: -10.9, withinTolerance: true },
  },
  targetMatch: {
    status: 'within_tolerance',
  },
}

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
