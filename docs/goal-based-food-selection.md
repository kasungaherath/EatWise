# Goal-based food selection

This extension adds 20 foods and restores chicken breast and banana to the deployment catalogue, giving 40 foods. It improves the existing **Gain muscle**, **Lose weight**, and **Maintain weight** selections. Gain muscle remains the existing `gain_muscle` goal.

## Catalogue and provenance

`server/database/twenty_more_foods.json` contains the added USDA FoodData Central SR Legacy 2018 records, with source IDs, preparation states, and calories, protein, carbohydrate, fat, and fibre per 100 g. The source dataset is available through [USDA FoodData Central downloads](https://fdc.nal.usda.gov/download-datasets/). Each record includes its individual source URL and an access date of 2026-10-12. Added portions use edible grams; preparation states matter when weighing food, particularly dry oats versus cooked grains.

| Added food | FDC ID |
| --- | --- |
| Dry rolled oats | 173904 |
| Cooked brown rice | 169704 |
| Whole-wheat bread | 172688 |
| Baked potato | 170093 |
| Cooked kidney beans | 175194 |
| Cooked black beans | 173735 |
| Cooked green peas | 170420 |
| Cooked edamame | 168411 |
| Roasted turkey breast | 171496 |
| Tuna in water | 173709 |
| Low-fat cottage cheese | 172182 |
| Unsalted peanut butter | 172470 |
| Walnuts | 170187 |
| Roasted pumpkin seeds | 170557 |
| Chia seeds | 170554 |
| Flaxseeds | 169414 |
| Orange | 169097 |
| Strawberries | 167762 |
| Cooked carrots | 170394 |
| Cooked cauliflower | 170397 |

The base catalogue also contains USDA chicken breast (171477) and banana (173944), with a source-backed 118 g medium banana portion. Their existing display names and photos are reused. `prepareDatabase.js` merges the base and expansion by source name and ID, giving 40 distinct seed foods. It inserts missing foods, portions, and quantity limits without replacing existing records or reversing deployed review decisions. From the repository root, run `npm --prefix server run db:prepare` against the configured database. Railway runs preparation through the pre-deploy command documented in `DEPLOYMENT.md`; `npm start` starts the server.

The old chicken and banana starter records were pending with unknown diet flags. Preparation completes those two pending nutrition reviews from the verified source records. Existing approved/rejected decisions and allergen review metadata remain unchanged; no other pending food is promoted.

## Eligibility and goal matching

Eligibility filtering runs before selection. Diet flags, supported avoidance terms, and allergy checks apply to both existing and added foods. Unknown exclusion terms or classifications fail closed. All 20 added records have `allergen_reviewed_at: null`; an allergy preference therefore excludes these records until their allergen metadata has been reviewed. A food's approved nutrition status does not establish reviewed allergen data.

`foodGoalSelectionService.js` ranks eligible foods and selects from protein, carbohydrate, fat, vegetable, and fruit groups. All goals request two protein, three carbohydrate, two fat, two vegetable, and one fruit choice where available. The extra carbohydrate choice supplies the energy left after using weight-based protein targets, without forcing additional protein foods. Everyday staples take priority, with protein density, fibre, energy, and usable daily capacity breaking ties. The shopping tiers are editable product defaults, not live local stock or price data. White and brown rice share a family so the ranked template avoids selecting both.

For omnivores, eligible chicken breast is required and shown first. Turkey is excluded from ranked selections and removed from AI proposals whenever eligible chicken is available. When chicken is excluded or unavailable, turkey remains an optional fallback. This never overrides diet, allergy, review, portion, or avoided-food eligibility.

Boiled eggs are required for Gain muscle only when an egg record with a usable portion is already eligible and the diet is omnivore, vegetarian, or pescatarian. The planner adds eligible eggs if an AI proposal omits them and preserves their whole-count portions. Vegan choices, avoided eggs, and allergy exclusions are never overridden.

The server recalculates nutrition from catalogue values and adjusts whole-number quantities within the configured bounds. It compares the AI candidate with an everyday-food template and, if necessary, a nutrition-ranked fallback. A candidate within all target tolerances beats one outside them; among matching candidates, the more common mix wins, then normalized macro distance breaks ties. Outside tolerance, lower macro distance wins. One bounded pass can consider up to three alternatives in the same group per selected food, preserving required chicken and eggs and accepting only an improved candidate. Each successive swap starts from the current best candidate, so improvements can complement one another.

### Protein targets and generation recovery

`nutritionTargets.js` replaces the old fixed 25%-of-calories protein formula with saved body weight, goal, and activity defaults:

| Goal | Sedentary/light | Moderate/active/very active |
| --- | --- | --- |
| Maintain weight | 1.0 g/kg/day | 1.2 g/kg/day |
| Lose weight | 1.2 g/kg/day | 1.4 g/kg/day |
| Gain muscle | 1.6 g/kg/day | 1.6 g/kg/day |

These are product planning defaults, not exact clinical requirements for each goal. For context, [EFSA's adult reference intake](https://www.efsa.europa.eu/en/press/news/120209) is 0.83 g/kg/day, while the [NIH exercise fact sheet](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/) summarizes athlete protein needs as 1.2–2.0 g/kg/day. The app's higher loss/muscle defaults are implementation choices; neither source prescribes this exact goal table. Sources checked 2026-10-13.

Fat remains 30% of goal energy; carbohydrate receives the remaining energy. A 35%-of-energy protein ceiling keeps extreme weight/energy inputs balanced and is reported in `proteinBasis.calorieCapApplied`. Macro percentages are calculated from the resulting grams. Nutrition display, generation context, save-time target snapshots, and guest planning share this calculation. Guest estimates recalculate from the saved profile instead of reusing a session's old cached 25% result. Existing saved drafts remain historical snapshots.

`foodSuggestionService.js` validates provider JSON, IDs, duplicate foods, and positive whole quantities. An excessive quantity for a known eligible portion is bounded using the server's daily limit before gram conversion, so a model confusing egg counts with grams does not terminate generation. Invented IDs, invalid/empty output, duplicates, and malformed quantities are never accepted. Instead, the existing goal planner runs without that proposal and selects only from the already eligible catalogue. The result is labelled `generatedBy: catalogue_fallback`, includes `proposalRecovery.applied: true`, and the food list explains its source. Provider connection/configuration/quota failures and corrupt catalogue measurements remain errors.

Current target tolerances are 5% for calories and 10% each for protein, carbohydrate, and fat. Group minimums and per-food maximums are editable prototype search bounds, not clinical nutrition rules. `within_tolerance` describes the calculated target comparison; it does not establish nutritional completeness or personal suitability, and an unsuccessful search does not prove that a matching combination is impossible.

## Guest planning and presentation

`client/src/demoPlanning.js` shares the pure nutrition, eligibility, goal-selection, and quantity calculations using the public base and expansion JSON. Guest generation uses no provider keys, account data, or network requests. Vite allows these public catalogue and service imports; the Docker frontend stage copies the files needed by that bundle.

The incumbent sage/green interface retains compact food-photo rows. Tapping a row expands its calculated macros, preparation state, and any non-gram portion. Names and photos are resolved independently of database IDs so generated and saved drafts also work with guest IDs. `additionalFoodPresentation.json` supplies the added display names and mapping order.

The built-in image tool generated `client/src/assets/food-photography-expansion.webp` using the incumbent atlas as a style reference. The saved asset is 1402 × 1122 px, five columns by four rows, and 261,000 bytes. The exact generation prompt is retained in `food-photography-expansion.webp.json`. Tiles follow the table's row-major order. `foodImages.js` uses square crops inset by at least 6 px from each cell edge; `FoodPhoto.jsx` clips each crop to prevent neighbouring images from leaking into the frame. Photos illustrate food identity rather than suggested serving size. Both atlases load and remain cached when the workspace opens. Current navigation and the Gemini generate icon are retained.

## Recorded validation

The extension passed 45 server tests, client lint, and the production build. A real Gemini Gain muscle draft contained 10 foods, included eligible eggs, and met the target ranges. Browser checks at 390 px found no page overflow and verified expanded macros and photos in saved drafts. These checks did not individually display all 20 added foods in the browser.

The common-food update passed 50 server tests, including chicken-first ordering for every omnivore goal, chicken avoidance, vegetarian/vegan/pescatarian exclusions, AI turkey replacement, and preference for an everyday mix when both candidates meet the targets. Client lint and production build passed again. A fresh guest Gain muscle draft showed chicken first, followed by eggs, lentils, rice, oats, peanuts, peanut butter, spinach, broccoli, and orange, with all calculated macros within the target ranges.

The local database preparation confirmed 40 approved foods with usable portions and limits. A subsequent real Gemini test also returned chicken first, no turkey, eligible eggs, and all target comparisons within tolerance.

The protein/recovery fixes passed 61 server tests, client lint, and the production build. Regression cases include the oversized egg count that formerly exceeded 10,000 g, invented portion IDs, invalid quantities, duplicate foods, malformed/empty responses, and preservation of provider/configuration errors. A separate comparison of two reference profiles across three goals and four diets matched all 24 target sets within the configured tolerances. A real Gemini check for the active 75 kg Gain muscle profile returned ten foods, chicken first, all quantities within bounds, and 123.21 g calculated protein against the new 120 g target. The working changes passed the redacted secret scan. These checks validate the local changes, not a new production deployment.
