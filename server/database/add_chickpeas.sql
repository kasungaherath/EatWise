USE eatwise;

-- Classify the specific cooked chickpea record we previewed.
-- Allergen review remains unset.
UPDATE foods
SET
  is_vegan = 1,
  is_vegetarian = 1,
  is_pescatarian = 1,
  review_status = 'approved'
WHERE source_name = 'USDA FoodData Central'
  AND source_reference = '173757'
  AND preparation_state = 'cooked, boiled, without salt'
  AND review_status = 'pending';

-- Add a gram-based portion if it does not already exist.
-- Quantity 150 will mean 150 grams.
INSERT INTO food_portions (
  food_id,
  portion_key,
  label,
  amount,
  unit_singular,
  unit_plural,
  gram_weight,
  source_name,
  source_reference,
  review_status
)
SELECT
  f.id,
  '100g',
  '100 g',
  100,
  'gram',
  'grams',
  100,
  'USDA FoodData Central',
  '173757',
  'approved'
FROM foods f
WHERE f.source_name = 'USDA FoodData Central'
  AND f.source_reference = '173757'
  AND f.review_status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM food_portions p
    WHERE p.food_id = f.id
      AND p.portion_key = '100g'
  );

-- Editable demo limit for testing, not dietary guidance.
-- Preserve any existing limit.
INSERT INTO food_quantity_limits (
  food_id,
  max_daily_grams,
  policy_label
)
SELECT
  f.id,
  400,
  'demo-v1'
FROM foods f
LEFT JOIN food_quantity_limits limits
  ON limits.food_id = f.id
WHERE f.source_name = 'USDA FoodData Central'
  AND f.source_reference = '173757'
  AND f.review_status = 'approved'
  AND limits.food_id IS NULL;

-- Verify the setup.
SELECT
  f.id AS food_id,
  f.name,
  f.review_status,
  f.is_vegan,
  p.id AS portion_id,
  p.amount,
  p.gram_weight,
  p.review_status AS portion_status,
  limits.max_daily_grams
FROM foods f
LEFT JOIN food_portions p
  ON p.food_id = f.id
  AND p.portion_key = '100g'
LEFT JOIN food_quantity_limits limits
  ON limits.food_id = f.id
WHERE f.source_name = 'USDA FoodData Central'
  AND f.source_reference = '173757';