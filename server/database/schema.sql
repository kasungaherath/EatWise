CREATE DATABASE IF NOT EXISTS eatwise
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE eatwise;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_email (email)
);

USE eatwise;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  age TINYINT UNSIGNED NOT NULL,
  sex_for_calculation ENUM('male', 'female') NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  activity_level ENUM(
    'sedentary',
    'light',
    'moderate',
    'active',
    'very_active'
  ) NOT NULL,
  goal ENUM(
    'lose_weight',
    'maintain_weight',
    'gain_muscle'
  ) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

USE eatwise;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INT UNSIGNED PRIMARY KEY,
  diet_type ENUM(
    'omnivore',
    'vegetarian',
    'vegan',
    'pescatarian'
  ) NOT NULL,
  allergies JSON NOT NULL,
  avoided_foods JSON NOT NULL,
  daily_budget_lkr DECIMAL(10,2) NULL,
  meals_per_day TINYINT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);