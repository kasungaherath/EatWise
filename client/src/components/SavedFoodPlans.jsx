import WorkspaceSectionTitle from './WorkspaceSectionTitle.jsx'
import { useEffect, useRef, useState } from 'react'
import { foodDisplayName } from '../foodDisplayName.js'
import { foodImageFor } from '../foodImages.js'
import './SavedFoodPlans.css'
import FoodPhoto from './FoodPhoto.jsx'
import {
  DEFAULT_DEMO_DRAFTS,
  getDemoStorage,
  setDemoStorage,
} from '../demoWorkspace.js'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

function displayNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function displayDate(value) {
  if (typeof value !== 'string') return 'Date unavailable'

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) return value

  return new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  )
}

function matchLabel(status) {
  if (status === 'within_tolerance') {
    return 'Within target tolerances'
  }

  if (status === 'needs_adjustment') {
    return 'Needs adjustment'
  }

  return 'Target matching not assessed'
}

export default function SavedFoodPlans({ refreshKey = 0, isDemo = false }) {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')
  const deletePending = useRef(false)
  const deletedIds = useRef(new Set())

  async function deleteDraft(draft) {
    if (deletePending.current) return

    if (isDemo) {
      const updated = drafts.filter((item) => item.id !== draft.id)
      setDemoStorage('drafts', updated)
      setDrafts(updated)
      setConfirmDelete(null)
      setNotice(`Deleted “${draft.title}”.`)
      return
    }
    deletePending.current = true
    setDeleting(draft.id)
    setDeleteError('')
    setNotice('')
    try {
      const response = await fetch(`${API_URL}/api/food-plans/${encodeURIComponent(draft.id)}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || 'Unable to delete this draft. Please try again.')
      }
      deletedIds.current.add(draft.id)
      setDrafts((current) => current.filter((item) => item.id !== draft.id))
      setConfirmDelete(null)
      setNotice(`Deleted “${draft.title}”.`)
    } catch (error) {
      setDeleteError(error instanceof TypeError
        ? 'Deletion could not be confirmed. Refresh saved drafts before trying again.'
        : error.message)
    } finally {
      deletePending.current = false
      setDeleting(null)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadDrafts() {
      setLoading(true)
      setError('')

      if (isDemo) {
        const demoDrafts = getDemoStorage('drafts', DEFAULT_DEMO_DRAFTS)
        setDrafts(demoDrafts)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/food-plans`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load your saved drafts.'
          )
        }

        if (!Array.isArray(data.drafts)) {
          throw new Error('The server returned an invalid draft list.')
        }

        if (!controller.signal.aborted) {
          setDrafts(data.drafts.filter((draft) => !deletedIds.current.has(draft.id)))
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

    loadDrafts()

    return () => controller.abort()
  }, [refreshKey, retry, isDemo])

  return (
    <section
      className="profile-section" data-workspace-section="saved"
      aria-labelledby="saved-food-plans-heading"
    >
      <WorkspaceSectionTitle id="saved-food-plans-heading" icon="saved">Saved food-plan drafts</WorkspaceSectionTitle>

      <p className="profile-description">
        Your latest 50 saved drafts. Each keeps the food quantities,
        nutrition totals, and targets recorded when it was saved.
      </p>

      <button
        className="profile-save ew-action"
        aria-busy={loading}
        type="button"
        disabled={loading || deleting !== null}
        onClick={() => setRetry((current) => current + 1)}
      >
        {loading ? 'Loading…' : 'Refresh saved drafts'}
      </button>
      {notice && <p className="account-message account-success" role="status">{notice}</p>}
      {deleteError && <p className="account-message account-error" role="alert">{deleteError}</p>}

      {loading ? (
        <p role="status">Loading your saved drafts…</p>
      ) : error ? (
        <p className="account-message account-error" role="alert">
          {error}
        </p>
      ) : drafts.length === 0 ? (
        <p>No saved drafts yet.</p>
      ) : (
        <div className="saved-drafts-grid">
          {drafts.map((draft) => {
            const snapshot = draft.suggestion
            const calculation = snapshot?.calculation
            const totals = calculation?.totals
            const items = calculation?.items

            return (
              <article className="account-card" key={draft.id}>
                <div className="saved-draft-heading">
                  <h4>{draft.title}</h4>
                  <div className="saved-draft-actions">
                    {confirmDelete === draft.id ? (
                      <>
                        <p>Delete this draft permanently?</p>
                        <button className="draft-delete ew-action ew-action--danger-confirm" aria-busy={deleting === draft.id} type="button" disabled={deleting !== null}
                          onClick={() => deleteDraft(draft)}>
                          {deleting === draft.id ? 'Deleting…' : 'Confirm delete'}
                        </button>
                        <button className="account-switch ew-action" type="button" disabled={deleting !== null}
                          onClick={() => setConfirmDelete(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="draft-delete ew-action ew-action--danger" type="button" disabled={deleting !== null}
                        aria-label={`Delete draft: ${draft.title}`}
                        onClick={() => { setConfirmDelete(draft.id); setDeleteError('') }}>
                        Delete draft
                      </button>
                    )}
                  </div>
                </div>

                <p>
                  <time dateTime={draft.planDate}>
                    {displayDate(draft.planDate)}
                  </time>
                  {' · Draft'}
                </p>

                <p>
                  {matchLabel(snapshot?.targetMatch?.status)}
                </p>

                {totals && (
                  <p>
                    {displayNumber(totals.calories)} kcal
                    {' · '}
                    Protein: {displayNumber(totals.proteinGrams)} g
                    {' · '}
                    Carbs: {displayNumber(totals.carbohydrateGrams)} g
                    {' · '}
                    Fat: {displayNumber(totals.fatGrams)} g
                  </p>
                )}

                <details>
                  <summary>View food quantities</summary>

                  {Array.isArray(items) && items.length > 0 ? (
                    <ul className="saved-food-list">
                      {items.map((item) => {
                        const foodName = foodDisplayName(item.name)
                        const photo = foodImageFor(foodName)
                        const hasPortion = typeof item.unit === 'string' &&
                          !['g', 'gram', 'grams'].includes(item.unit.toLowerCase())

                        return (
                          <li className="saved-food-row" key={`${item.foodId}-${item.portionId}`} data-food-image={photo.key}>
                            <FoodPhoto photo={photo} className="saved-food-photo" />
                            <div className="saved-food-content">
                              <div className="saved-food-heading">
                                <strong>{foodName}</strong>
                                <span className="saved-food-weight">{displayNumber(item.grams)} <span>g</span></span>
                              </div>
                              {(hasPortion || item.preparationState) && (
                                <p className="saved-food-preparation">
                                  {hasPortion && <>{displayNumber(item.quantity)} {item.unit}{item.preparationState ? ' · ' : ''}</>}
                                  {item.preparationState || ''}
                                </p>
                              )}
                              <p className="saved-food-macros">
                                {displayNumber(item.nutrition?.calories)} kcal · Protein {displayNumber(item.nutrition?.proteinGrams)} g
                                {' · '}Carbohydrates {displayNumber(item.nutrition?.carbohydrateGrams)} g
                                {' · '}Fat {displayNumber(item.nutrition?.fatGrams)} g
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p>Food quantities are unavailable.</p>
                  )}
                </details>

                <p className="profile-note">
                  These are daily totals. This draft is a saved
                  snapshot and does not update when your profile
                  or preferences change. Target matching does not
                  establish dietary suitability.
                </p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
