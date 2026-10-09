# App entry simplification

The entry screen focuses on signing in, creating an account, or exploring the guest workspace. It uses the green and sage app theme with the original generated food photography. On narrow screens, the full-width photo stays at the bottom corners over a continuous pale sage canvas; the form follows the heading directly. Setup guidance is available in the expandable “How EatWise works” section. The existing workspace components, guest data, account requests, routing, and draft operations remain in use.

Redundant portal badges, security marketing, duplicated navigation, oversized guest promotion, and the “Remember this device” checkbox were removed. The decorative food bowls background is restored, and the logo is displayed without a white frame. Password requirements remain visible during registration, with a show/hide control. Registration still creates an account and then asks the user to sign in.

## Verification

- Production build and lint of modified React components passed.
- Browser layouts checked at 1440, 768, 390, and 320 pixels, with no horizontal overflow.
- Registration, login, failure, offline, and pending states verified with simulated API responses; live account authentication was not verified.
- Existing guest generation, saving, deletion, session restoration, overview navigation, logout, and signed-out workspace routing passed in an isolated browser context.
- Reduced motion disables the brief card entrance. Focus outlines and input boundaries use the app's green palette.

## Background image

Asset: `client/src/assets/app-welcome-background.png`

Generated with the built-in image-generation tool, then copied into the project. It is a decorative CSS background and does not convey instructions or nutrition data.

Final prompt:

> Create a premium photographic background for a calm nutrition PLANNING APP sign-in screen. Wide landscape 3:2 composition, pale desaturated sage-green seamless matte kitchen surface, soft natural daylight, restrained appetizing realism. CRITICAL layout: entire central 65% of the image and entire upper middle must remain completely empty uniform pale sage space for UI text and login form. Food arranged ONLY at extreme lower left and lower right edges, partially cropped out of frame: at lower left a small off-white ceramic bowl of quinoa, cucumber, cherry tomato and fresh spinach with a few basil leaves; lower right a small off-white bowl of berries and a few citrus slices. Objects modest in size, lower 25% and outer 20% only, never competing with interface. Overhead view, no board, no glass of milk, no tablecloth, no hands, no cutlery, no text, no logo, no interface, no strong shadows, no vignette. Fresh quiet contemporary product app aesthetic, clean low contrast sage background.
