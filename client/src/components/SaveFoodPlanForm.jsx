import { useEffect, useRef, useState } from 'react'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

function localDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function SaveFoodPlanForm({ suggestion, onSaved, onSavingChange }) {
  const [title, setTitle] = useState('My food-plan draft')
  const [planDate, setPlanDate] = useState(localDate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)

  useEffect(() => {
    return () => requestRef.current?.abort()
  }, [])

  async function handleSave(event) {
    event.preventDefault()

    if (requestRef.current || saved) return

    const cleanedTitle = title.trim()
    const sourceItems = suggestion?.calculation?.items

    if (!cleanedTitle || cleanedTitle.length > 120) {
      setError('Enter a title between 1 and 120 characters.')
      return
    }

    if (!planDate) {
      setError('Choose a date for this draft.')
      return
    }

    if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
      setError('There are no food quantities to save.')
      return
    }

    const items = sourceItems.map((item) => ({
      portionId: item.portionId,
      quantity: item.quantity,
    }))

    const controller = new AbortController()
    requestRef.current = controller
    setSaving(true)
    onSavingChange?.(true)
    setError('')

    let savedDraft

    try {
      const response = await fetch(`${API_URL}/api/food-plans`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: cleanedTitle,
          planDate,
          items,
        }),
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to save your draft.')
      }

      if (!data.draft?.id) {
        throw new Error(
          'The save response could not be confirmed. Refresh saved drafts before trying again.'
        )
      }

      if (!controller.signal.aborted) {
        savedDraft = data.draft
        setSaved(true)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof TypeError
            ? 'The save could not be confirmed. Refresh saved drafts before retrying to avoid a duplicate.'
            : error.message
        )
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
      }

      if (!controller.signal.aborted) {
        setSaving(false)
        onSavingChange?.(false)
      }
    }

    if (savedDraft) {
      onSaved?.(savedDraft)
    }
  }

  return (
    <form onSubmit={handleSave}>
      <h4>Save this draft</h4>

      <p className="profile-note">
        Saving checks your current preferences and recalculates
        nutrition using your current targets. The result remains
        a draft.
      </p>

      <fieldset className="profile-fields" disabled={saving || saved}>
        <legend className="profile-legend">Draft details</legend>

        <div className="account-field">
          <label htmlFor="food-plan-title">Title</label>
          <input
            id="food-plan-title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setError('')
            }}
            maxLength={120}
            required
          />
        </div>

        <div className="account-field">
          <label htmlFor="food-plan-date">Plan date</label>
          <input
            id="food-plan-date"
            type="date"
            value={planDate}
            onChange={(event) => {
              setPlanDate(event.target.value)
              setError('')
            }}
            min="1000-01-01"
            max="9999-12-31"
            required
          />
        </div>

        <button className="profile-save" type="submit">
          {saving ? 'Saving…' : saved ? 'Draft saved' : 'Save draft'}
        </button>
      </fieldset>

      {error && (
        <p className="account-message account-error" role="alert">
          {error}
        </p>
      )}

      {saved && (
        <p className="account-message account-success" role="status">
          Your draft has been saved. It is available under saved
          food-plan drafts.
        </p>
      )}
    </form>
  )
}
