USE eatwise;

CREATE TABLE IF NOT EXISTS food_quantity_limits (
  food_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  max_daily_grams DECIMAL(8, 2) NOT NULL,
  policy_label VARCHAR(100) NOT NULL DEFAULT 'demo-v1',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

-- Seed limits only where no setting exists.
-- Match foods by USDA reference, not local database ID.
INSERT INTO food_quantity_limits
  (food_id, max_daily_grams, policy_label)
SELECT
  f.id,
  settings.max_daily_grams,
  'demo-v1'
FROM foods f
INNER JOIN (
  SELECT '168878' AS source_reference, 800 AS max_daily_grams
  UNION ALL SELECT '173944', 300
  UNION ALL SELECT '172421', 600
  UNION ALL SELECT '173424', 250
  UNION ALL SELECT '171477', 400
  UNION ALL SELECT '171413', 30
  UNION ALL SELECT '172475', 500
  UNION ALL SELECT '170567', 60
) settings
  ON f.source_reference = settings.source_reference
LEFT JOIN food_quantity_limits existing
  ON existing.food_id = f.id
WHERE f.source_name = 'USDA FoodData Central'
  AND existing.food_id IS NULL;

SELECT
  f.id,
  f.name,
  f.preparation_state,
  limits.max_daily_grams,
  limits.policy_label
FROM foods f
LEFT JOIN food_quantity_limits limits
  ON limits.food_id = f.id
ORDER BY f.id;