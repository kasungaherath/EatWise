// Presentation names only. Keep source names and nutrition records unchanged.
const names = new Map([
  ['Milk, whole, 3.25% milkfat, with added vitamin D', 'Fresh whole milk'],
  ['Peanuts, all types, dry-roasted, without salt', 'Unsalted peanuts'],
  ['Quinoa, cooked', 'Cooked quinoa'],
  ['Bulgur, cooked', 'Cooked bulgur'],
  ["Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)", 'Apple'],
  ['Avocados, raw, all commercial varieties', 'Avocado'],
  ['Spinach, cooked, boiled, drained, without salt', 'Cooked spinach'],
  ['Fish, salmon, Atlantic, farmed, cooked, dry heat', 'Cooked salmon'],
  ['Rice, white, long-grain, regular, enriched, cooked', 'Cooked rice'],
  ['Bananas, raw', 'Banana'],
  ['Lentils, mature seeds, cooked, boiled, without salt', 'Cooked lentils'],
  ['Egg, whole, cooked, hard-boiled', 'Boiled egg'],
  ['Chicken, broilers or fryers, breast, meat only, cooked, roasted', 'Roasted chicken breast'],
  ['Oil, olive, salad or cooking', 'Olive oil'],
  ['Tofu, raw, firm, prepared with calcium sulfate', 'Firm tofu'],
  ['Nuts, almonds', 'Almonds'],
  ['Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt', 'Cooked chickpeas'],
  ['Broccoli, cooked, boiled, drained, without salt', 'Cooked broccoli'],
  ['Sweet potato, cooked, baked in skin, flesh, without salt', 'Baked sweet potato'],
  ["Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)", 'Plain Greek yogurt'],
].map(([source, label]) => [source.toLowerCase(), label]))

export function foodDisplayName(name) {
  if (typeof name !== 'string' || !name.trim()) return 'Food'
  return names.get(name.trim().toLowerCase()) ?? name.trim()
}
