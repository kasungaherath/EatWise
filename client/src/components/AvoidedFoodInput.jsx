import { useEffect, useId, useRef, useState } from 'react'
import { foodDisplayName } from '../foodDisplayName.js'
import { getDemoFoodCatalogue } from '../demoPlanning.js'
import './AvoidedFoodInput.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

function normalize(value) {
  return value.trim().toLowerCase().replace(/[-_\s]+/g, ' ')
}

function currentToken(value, cursor) {
  const position = Math.min(cursor, value.length)
  const start = position === 0 ? 0 : value.lastIndexOf(',', position - 1) + 1
  const nextComma = value.indexOf(',', position)
  const end = nextComma === -1 ? value.length : nextComma
  return { start, end, query: normalize(value.slice(start, end)) }
}

function catalogueOptions(foods) {
  return [...new Map(foods.map(food => {
    const label = foodDisplayName(food.name)
    return [normalize(label), { label, search: normalize(label + ' ' + food.name) }]
  })).values()].sort((a, b) => a.label.localeCompare(b.label))
}

export default function AvoidedFoodInput({ value, onChange, isDemo, disabled }) {
  const listId = useId()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [options, setOptions] = useState(() => isDemo ? catalogueOptions(getDemoFoodCatalogue()) : [])
  const [status, setStatus] = useState(isDemo ? 'ready' : 'loading')
  const [retry, setRetry] = useState(0)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(value.length)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (isDemo) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    let mounted = true

    async function loadCatalogue() {
      setStatus('loading')
      try {
        const response = await fetch(`${API_URL}/api/foods`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok || data.success === false || !Array.isArray(data.foods) ||
          data.foods.some(food => typeof food?.name !== 'string' || !food.name.trim())) {
          throw new Error('Catalogue unavailable')
        }
        if (mounted) {
          setOptions(catalogueOptions(data.foods))
          setStatus('ready')
        }
      } catch {
        if (mounted) setStatus('error')
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadCatalogue()
    return () => {
      mounted = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [isDemo, retry])

  const token = currentToken(value, cursor)
  const otherTokens = new Set((value.slice(0, token.start) + value.slice(token.end)).split(',').map(normalize).filter(Boolean))
  const words = token.query.split(' ').filter(Boolean)
  const matches = token.query ? options.filter(option => !otherTokens.has(normalize(option.label)) &&
    words.every(word => option.search.includes(word))).sort((a, b) => {
      const rank = option => normalize(option.label).startsWith(token.query) ? 0 :
        words.every(word => normalize(option.label).includes(word)) ? 1 : 2
      return rank(a) - rank(b) || a.label.localeCompare(b.label)
    }).slice(0, 8) : []
  const showingSuggestions = open && !disabled && token.query.length > 0
  const activeOption = showingSuggestions ? matches[activeIndex] : null

  useEffect(() => {
    if (activeIndex >= 0 && showingSuggestions) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, showingSuggestions])

  function chooseFood(option) {
    const before = value.slice(0, token.start)
    const after = value.slice(token.end)
    const insertion = (before ? ' ' : '') + option.label
    const updated = before + insertion + (after || ', ')
    const nextCursor = before.length + insertion.length + (after ? 0 : 2)
    onChange(updated)
    setCursor(nextCursor)
    setActiveIndex(-1)
    inputRef.current?.focus()
    setOpen(false)
    window.requestAnimationFrame(() => inputRef.current?.setSelectionRange(nextCursor, nextCursor))
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) return
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(current => event.key === 'ArrowDown'
        ? (current + 1) % matches.length
        : current <= 0 ? matches.length - 1 : current - 1)
    } else if (event.key === 'Enter' && activeOption) {
      event.preventDefault()
      chooseFood(activeOption)
    } else if (event.key === 'Escape' && showingSuggestions) {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="avoid-food-input" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }}>
      <input
        ref={inputRef}
        id="preferences-avoided"
        name="avoidedFoods"
        type="text"
        role="combobox"
        value={value}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showingSuggestions}
        aria-controls={showingSuggestions ? listId : undefined}
        aria-activedescendant={activeOption ? `${listId}-${activeIndex}` : undefined}
        aria-describedby="preferences-avoided-hint"
        placeholder="Type a food name, for example: chicken"
        onChange={event => {
          onChange(event.target.value)
          setCursor(event.target.selectionStart ?? event.target.value.length)
          setActiveIndex(-1)
          setOpen(true)
        }}
        onSelect={event => setCursor(event.target.selectionStart ?? value.length)}
        onFocus={event => {
          setCursor(event.target.selectionStart ?? value.length)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {showingSuggestions && (
        <div className="avoid-food-popup">
          <ul id={listId} ref={listRef} className="avoid-food-options" role="listbox" aria-label="Food catalogue suggestions">
            {matches.map((option, index) => (
              <li
                id={`${listId}-${index}`}
                key={option.label}
                role="option"
                aria-selected={activeIndex === index}
                onPointerDown={event => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseFood(option)}
              >
                {option.label}
              </li>
            ))}
          </ul>
          {status === 'loading' && <p role="status">Loading the food catalogue…</p>}
          {status === 'error' && (
            <div className="avoid-food-error">
              <p role="status">Food suggestions are unavailable. You can still type foods manually.</p>
              <button type="button" className="avoid-food-retry" onClick={() => setRetry(current => current + 1)}>Try again</button>
            </div>
          )}
          {status === 'ready' && matches.length === 0 && <p role="status">No matching catalogue foods. Try another name or keep your own entry.</p>}
        </div>
      )}
    </div>
  )
}
