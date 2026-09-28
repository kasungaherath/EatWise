import { useEffect, useState } from 'react'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

export default function FoodList({ refreshKey = 0 }) {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFoods() {
      setLoading(true)
      setError('')
      setFoods([])

      try {
        const response = await fetch(
          `${API_URL}/api/foods/eligible`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load your foods.'
          )
        }

        if (!Array.isArray(data.foods)) {
          throw new Error('The server returned an invalid food list.')
        }

        if (!controller.signal.aborted) {
          setFoods(data.foods)
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

    loadFoods()

    return () => controller.abort()
  }, [refreshKey, retry])

  return (
    <section
      className="profile-section"
      aria-labelledby="food-list-heading"
    >
      <h3 id="food-list-heading">Foods matching your preferences</h3>

      <p className="profile-description">
        Explore foods and portions available for your food suggestions.
        Nutrition values below are per 100 grams.
      </p>

      {loading ? (
        <p role="status">Loading your foods…</p>
      ) : error ? (
        <>
          <p className="account-message account-error" role="alert">
            {error}
          </p>

          <button
            className="profile-save"
            type="button"
            onClick={() => setRetry((current) => current + 1)}
          >
            Try again
          </button>
        </>
      ) : foods.length === 0 ? (
        <p className="account-message" role="status">
          No foods currently match the supported preference checks.
          Some foods or exclusions may still need review.
        </p>
      ) : (
        <div className="profile-grid">
          {foods.map((food) => (
            <article className="account-card" key={food.id}>
              <h4>{food.name}</h4>

              <p>Preparation: {food.preparationState}</p>

              <dl>
                <dt>Calories</dt>
                <dd>{food.nutritionPer100g.calories} kcal</dd>

                <dt>Protein</dt>
                <dd>{food.nutritionPer100g.proteinGrams} g</dd>

                <dt>Carbohydrates</dt>
                <dd>
                  {food.nutritionPer100g.carbohydrateGrams} g
                </dd>

                <dt>Fat</dt>
                <dd>{food.nutritionPer100g.fatGrams} g</dd>

                <dt>Fibre</dt>
                <dd>
                  {food.nutritionPer100g.fiberGrams == null
                    ? 'Not available'
                    : `${food.nutritionPer100g.fiberGrams} g`}
                </dd>
              </dl>

              <h5>Available portions</h5>

              <ul>
                {food.portions.map((portion) => (
                  <li key={portion.id}>
                    {portion.label} — {portion.gramWeight} g
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <p className="profile-note">
        These foods pass the currently supported preference checks.
        This list is not a daily food plan or a guarantee of allergy safety.
      </p>
    </section>
  )
}