USE eatwise;

CREATE TABLE IF NOT EXISTS food_portions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  food_id INT UNSIGNED NOT NULL,

  portion_key VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  unit_singular VARCHAR(50) NOT NULL,
  unit_plural VARCHAR(50) NOT NULL,
  gram_weight DECIMAL(10,3) NOT NULL,

  source_name VARCHAR(150) NOT NULL,
  source_reference VARCHAR(150) NOT NULL,

  review_status ENUM('pending', 'approved', 'rejected')
    NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_food_portions_food
    FOREIGN KEY (food_id)
    REFERENCES foods(id)
    ON DELETE CASCADE,

  UNIQUE KEY uq_food_portion (food_id, portion_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  '100 g edible portion',
  100,
  'gram',
  'grams',
  100,
  'EatWise',
  'metric-weight-100g',
  'approved'
FROM foods f
WHERE f.source_name = 'USDA FoodData Central'
  AND f.source_reference IN (
    '168878',
    '173944',
    '172421',
    '173424',
    '171477'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM food_portions p
    WHERE p.food_id = f.id
      AND p.portion_key = '100g'
  );