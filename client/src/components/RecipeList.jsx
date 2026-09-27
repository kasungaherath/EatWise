import { useEffect, useState } from 'react'
import './RecipeList.css'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const numberFormat = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
})

function formatNumber(value) {
  return Number.isFinite(value)
    ? numberFormat.format(value)
    : '—'
}

function isValidRecipe(recipe) {
  return (
    recipe !== null &&
    typeof recipe === 'object' &&
    recipe.id != null &&
    typeof recipe.name === 'string' &&
    Number.isFinite(recipe.servings) &&
    recipe.servings > 0 &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.every(
      (ingredient) =>
        ingredient !== null &&
        typeof ingredient === 'object' &&
        typeof ingredient.name === 'string' &&
        Number.isFinite(ingredient.quantityGrams)
    ) &&
    Array.isArray(recipe.instructions) &&
    recipe.instructions.every(
      (instruction) => typeof instruction === 'string'
    ) &&
    recipe.nutrition?.perServing !== null &&
    typeof recipe.nutrition?.perServing === 'object'
  )
}

export default function RecipeList({ refreshKey = 0 }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadRecipes() {
      setLoading(true)
      setError('')
      setRecipes([])

      try {
        const response = await fetch(
          `${API_URL}/api/recipes`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        let data

        try {
          data = await response.json()
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error
          }

          throw new Error(
            'The server returned an unexpected response.'
          )
        }

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.message || 'Unable to load recipes.'
          )
        }

        if (
          !Array.isArray(data?.recipes) ||
          !data.recipes.every(isValidRecipe)
        ) {
          throw new Error(
            'The server returned incomplete recipe data.'
          )
        }

        if (!controller.signal.aborted) {
          setRecipes(data.recipes)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof TypeError
              ? 'Cannot connect to EatWise. Check that the backend is running.'
              : error.message
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadRecipes()

    return () => controller.abort()
  }, [retry, refreshKey])

  return (
    <section
      className="recipe-section"
      aria-labelledby="recipes-heading"
      aria-busy={loading}
    >
      <h3 id="recipes-heading">Recipe catalogue</h3>

      <p className="recipe-intro">
        Recipes matching your saved diet type, with estimated
        nutrition. Allergy and avoided-food checks are not
        available yet.
      </p>

      {loading && (
        <p role="status">Loading recipes…</p>
      )}

      {!loading && error && (
        <div>
          <p
            className="account-message account-error"
            role="alert"
          >
            {error}
          </p>

          <button
            className="recipe-retry"
            type="button"
            onClick={() =>
              setRetry((current) => current + 1)
            }
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <p role="status">
          No recipes currently match your saved diet type.
          We’re expanding the catalogue.
        </p>
      )}

      {!loading &&
        !error &&
        recipes.map((recipe) => {
          const nutrition = recipe.nutrition.perServing

          return (
            <article
              className="recipe-card"
              key={recipe.id}
            >
              <span className="recipe-type">
                {recipe.mealType}
              </span>

              <h4>{recipe.name}</h4>

              {recipe.description && (
                <p className="recipe-description">
                  {recipe.description}
                </p>
              )}

              <p className="recipe-calories">
                <strong>
                  {formatNumber(nutrition.calories)}
                </strong>
                {' '}kcal per serving
              </p>

              <dl className="recipe-macros">
                <div>
                  <dt>Protein</dt>
                  <dd>
                    {formatNumber(nutrition.proteinGrams)} g
                  </dd>
                </div>

                <div>
                  <dt>Carbs</dt>
                  <dd>
                    {formatNumber(
                      nutrition.carbohydrateGrams
                    )} g
                  </dd>
                </div>

                <div>
                  <dt>Fat</dt>
                  <dd>
                    {formatNumber(nutrition.fatGrams)} g
                  </dd>
                </div>
              </dl>

              <details className="recipe-details">
                <summary>
                  Ingredients and instructions
                </summary>

                <p className="recipe-yield">
                  Makes {formatNumber(recipe.servings)}
                  {' '}
                  {recipe.servings === 1
                    ? 'serving'
                    : 'servings'}.
                  {' '}Ingredient quantities below are for
                  the whole recipe.
                </p>

                <h5>Ingredients</h5>

                <ul>
                  {recipe.ingredients.map(
                    (ingredient, index) => (
                      <li
                        key={`${ingredient.foodId}-${index}`}
                      >
                        <strong>
                          {formatNumber(
                            ingredient.quantityGrams
                          )} g
                        </strong>
                        {' '}{ingredient.name}

                        {ingredient.preparationNote && (
                          <small>
                            {ingredient.preparationNote}
                          </small>
                        )}
                      </li>
                    )
                  )}
                </ul>

                <h5>Instructions</h5>

                <ol>
                  {recipe.instructions.map(
                    (instruction, index) => (
                      <li key={index}>
                        {instruction}
                      </li>
                    )
                  )}
                </ol>
              </details>
            </article>
          )
        })}
    </section>
  )
}