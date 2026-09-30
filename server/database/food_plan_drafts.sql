USE eatwise;

CREATE TABLE IF NOT EXISTS food_plan_drafts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  plan_date DATE NOT NULL,

  -- Snapshot of foods, quantities, calculated nutrition,
  -- targets, and target-match results.
  suggestion_json JSON NOT NULL,

  status ENUM('draft') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_food_plan_drafts_user_date (user_id, plan_date)
);