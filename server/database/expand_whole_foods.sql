-- USDA SR Legacy records retrieved and checked on 2026-10-06.
-- Nutrition per 100 g of the stated preparation; never AI-generated values.
-- Safe to rerun. Existing reviewed records and configured limits are preserved.
START TRANSACTION;
INSERT IGNORE INTO foods
(name, preparation_state, calories_per_100g, protein_per_100g,
 carbohydrate_per_100g, fat_per_100g, fiber_per_100g, source_name,
 source_reference, source_url, source_accessed_at, review_status)
VALUES
('Broccoli, cooked, boiled, drained, without salt', 'cooked, boiled, drained, without salt',
 35, 2.38, 7.18, 0.41, 3.3, 'USDA FoodData Central', '169967',
 'https://fdc.nal.usda.gov/food-details/169967/nutrients', '2026-10-06', 'pending'),
('Sweet potato, cooked, baked in skin, flesh, without salt', 'cooked, baked in skin, flesh, without salt',
 90, 2.01, 20.71, 0.15, 3.3, 'USDA FoodData Central', '168483',
 'https://fdc.nal.usda.gov/food-details/168483/nutrients', '2026-10-06', 'pending'),
('Yogurt, Greek, plain, nonfat (Includes foods for USDA''s Food Distribution Program)', 'plain, nonfat',
 59, 10.19, 3.6, 0.39, 0, 'USDA FoodData Central', '170894',
 'https://fdc.nal.usda.gov/food-details/170894/nutrients', '2026-10-06', 'pending');

-- Ingredient classifications only; allergen review remains unset.
UPDATE foods SET is_vegan = (source_reference <> '170894'),
 is_vegetarian = 1, is_pescatarian = 1, review_status = 'approved'
WHERE source_name = 'USDA FoodData Central'
 AND source_reference IN ('169967', '168483', '170894')
 AND review_status = 'pending';

INSERT INTO food_portions
(food_id, portion_key, label, amount, unit_singular, unit_plural,
 gram_weight, source_name, source_reference, review_status)
SELECT f.id, '100g', '100 g', 100, 'gram', 'grams', 100,
 f.source_name, f.source_reference, 'approved'
FROM foods f WHERE f.source_name = 'USDA FoodData Central'
 AND f.source_reference IN ('169967', '168483', '170894')
 AND f.review_status = 'approved'
 AND NOT EXISTS (SELECT 1 FROM food_portions p WHERE p.food_id = f.id AND p.portion_key = '100g');

-- Editable prototype search bounds, not dietary recommendations.
INSERT INTO food_quantity_limits (food_id, max_daily_grams, policy_label)
SELECT f.id, 400, 'demo-v1' FROM foods f
WHERE f.source_name = 'USDA FoodData Central'
 AND f.source_reference IN ('169967', '168483', '170894')
 AND f.review_status = 'approved'
 AND NOT EXISTS (SELECT 1 FROM food_quantity_limits q WHERE q.food_id = f.id);
COMMIT;
