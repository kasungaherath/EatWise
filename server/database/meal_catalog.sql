USE eatwise;

CREATE TABLE IF NOT EXISTS foods (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  preparation_state VARCHAR(100) NOT NULL,

  calories_per_100g DECIMAL(8,2) NOT NULL,
  protein_per_100g DECIMAL(7,2) NOT NULL,
  carbohydrate_per_100g DECIMAL(7,2) NOT NULL,
  fat_per_100g DECIMAL(7,2) NOT NULL,
  fiber_per_100g DECIMAL(7,2) NULL,

  is_vegan BOOLEAN NULL,
  is_vegetarian BOOLEAN NULL,
  is_pescatarian BOOLEAN NULL,

  allergens JSON NULL,
  allergen_reviewed_at DATETIME NULL,

  source_name VARCHAR(150) NOT NULL,
  source_reference VARCHAR(150) NOT NULL,
  source_url VARCHAR(1000) NULL,
  source_accessed_at DATE NOT NULL,

  review_status ENUM('pending', 'approved', 'rejected')
    NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_food_source (source_name, source_reference),
  INDEX idx_food_name (name),
  INDEX idx_food_review_status (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS recipes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,

  meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack')
    NOT NULL,

  servings DECIMAL(6,2) NOT NULL DEFAULT 1,
  preparation_minutes SMALLINT UNSIGNED NULL,
  cooking_minutes SMALLINT UNSIGNED NULL,

  instructions JSON NOT NULL,

  review_status ENUM('pending', 'approved', 'rejected')
    NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_recipe_slug (slug),
  INDEX idx_recipe_meal_type (meal_type),
  INDEX idx_recipe_review_status (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT UNSIGNED NOT NULL,
  food_id INT UNSIGNED NOT NULL,

  quantity_grams DECIMAL(10,2) NOT NULL,
  preparation_note VARCHAR(255) NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  CONSTRAINT fk_recipe_ingredients_recipe
    FOREIGN KEY (recipe_id)
    REFERENCES recipes(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_recipe_ingredients_food
    FOREIGN KEY (food_id)
    REFERENCES foods(id)
    ON DELETE RESTRICT,

  INDEX idx_recipe_ingredients_order (recipe_id, sort_order),
  INDEX idx_recipe_ingredients_food (food_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;