import { useEffect } from 'react'
import eatwiseLogo from '../assets/eatwise-logo.png'
import './SignInTransition.css'

export default function SignInTransition({ onComplete }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2000)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="ew-signin-transition" role="status" aria-live="polite" aria-atomic="true">
      <div className="ew-signin-brand">
        <span className="ew-logo-frame">
          <img className="ew-logo-image" src={eatwiseLogo} width="1945" height="809" alt="EatWise" />
        </span>
        <p>Opening your workspace…</p>
      </div>
    </div>
  )
}
