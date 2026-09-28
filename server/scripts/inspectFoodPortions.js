import 'dotenv/config'

const foods = [
  { fdcId: '173424', name: 'Hard-boiled egg' },
  { fdcId: '173944', name: 'Raw banana' },
]

async function main() {
  const apiKey = process.env.USDA_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('Add USDA_API_KEY to server/.env first.')
  }

  for (const food of foods) {
    const url = new URL(
      `https://api.nal.usda.gov/fdc/v1/food/${food.fdcId}`
    )

    url.searchParams.set('api_key', apiKey)

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(
        `USDA request for ${food.name} failed: ${response.status}`
      )
    }

    const data = await response.json()

    if (String(data.fdcId) !== food.fdcId) {
      throw new Error('USDA returned an unexpected food record.')
    }

    console.log(`\n${data.description}`)
    console.log(`FDC ID: ${data.fdcId}`)

    if (
      !Array.isArray(data.foodPortions) ||
      data.foodPortions.length === 0
    ) {
      console.log('No household portions available.')
      continue
    }

    console.table(
      data.foodPortions.map((portion) => ({
        portionId: portion.id ?? 'Not supplied',
        amount: portion.amount ?? 'Not supplied',
        unit: portion.measureUnit?.name ?? '',
        modifier: portion.modifier ?? '',
        description: portion.portionDescription ?? '',
        gramWeight: portion.gramWeight ?? 'Not supplied',
      }))
    )
  }
}

main().catch((error) => {
  if (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError'
  ) {
    console.error('USDA request timed out. Try again.')
  } else if (error instanceof TypeError) {
    console.error(
      'Could not read the USDA response. Check your connection.'
    )
  } else {
    console.error(error.message)
  }

  process.exitCode = 1
})