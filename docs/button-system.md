# EatWise button system

`client/src/Buttons.css` owns the geometry, color, focus, loading, and disabled states for current app actions. Controls use `ew-action` with explicit variants:

- Default: outlined secondary action (refresh, overview, sample values, cancel, guest entry).
- `ew-action--primary`: solid green save, generate, and sign-in actions.
- `ew-action--quiet` / `ew-action--link`: lower-emphasis logout and account switching.
- `ew-action--danger`: outlined delete request.
- `ew-action--danger-confirm`: solid red confirmation after the existing confirmation step.

Actions have at least a 44px touch target, 10px corners, a visible keyboard focus ring, and aligned labels/icons. Loading uses `aria-busy` where the underlying component exposes pending state. Disabled styles also apply to buttons within disabled fieldsets. Reduced-motion preferences disable button animations.

Workspace navigation is separate from form actions. It uses five evenly spaced icons, a clear selected state with `aria-current="location"`, and remains sticky while scrolling. Each button has an accessible name and a native tooltip. All five buttons fit across narrow screens with at least a 44px touch target. Section handlers, account operations, and draft logic remain in place.

Verification: production build passed; browser checks cover desktop and 768/390/320px layouts, every section link, keyboard focus, primary/secondary actions, guest profile and preference saving, nutrition refresh, generation, draft save, delete cancellation/confirmation, and overview/logout. The frontend code check includes preserving the original cause when wrapping network or parsing errors.
