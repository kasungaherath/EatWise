import 'dotenv/config'

async function main() {
  const apiKey = process.env.USDA_API_KEY?.trim()
  const query = process.argv.slice(2).join(' ').trim()

  if (!apiKey) {
    throw new Error('Add USDA_API_KEY to server/.env first.')
  }

  if (!query) {
    throw new Error(
      'Enter a food name. Example: node scripts/searchFoods.js "rice cooked"'
    )
  }

  const url = new URL(
    'https://api.nal.usda.gov/fdc/v1/foods/search'
  )

  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      dataType: ['Foundation', 'SR Legacy'],
      pageSize: 10,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const messages = {
      400: 'USDA rejected the search request.',
      401: 'USDA authentication failed. Check your API key.',
      403: 'USDA denied access. Check that your API key is valid.',
      429: 'USDA request limit reached. Try again later.',
    }

    throw new Error(
      messages[response.status] ||
        `USDA request failed with status ${response.status}.`
    )
  }

  const data = await response.json()

  if (!Array.isArray(data.foods)) {
    throw new Error('USDA returned an unexpected response.')
  }

  console.log(`\nSearch: ${query}`)
  console.log(`Total matches: ${data.totalHits ?? 'Unknown'}\n`)

  if (data.foods.length === 0) {
    console.log('No matches found. Try a simpler food name.')
    return
  }

  console.table(
    data.foods.map((food) => ({
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
    }))
  )
}

main().catch((error) => {
  if (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError'
  ) {
    console.error('The USDA request timed out. Try again.')
  } else if (error instanceof TypeError) {
    console.error(
      'Could not connect to USDA. Check your internet connection.'
    )
  } else {
    console.error(error.message)
  }

  process.exitCode = 1
})