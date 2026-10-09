# Generated food quantity list

Generated foods are presented as compact rows. Each row shows its familiar food name and `item.grams` as the daily edible weight. Selecting the full row reveals calories, protein, carbohydrates, fat, preparation, and any original non-gram portion (for example, a number of eggs). Nutrition remains the backend-calculated value for that exact quantity; neither the calculation nor the daily comparison totals change.

Only one food is expanded at a time. All start collapsed, and generating another draft resets the disclosure. Buttons expose `aria-expanded` and `aria-controls`; associated regions stay hidden until opened. Keyboard activation, clear focus, generous touch targets, and reduced-motion preferences are supported.

A neutral list surface, thin separators, dark green weights, and a pale green expanded row replace the alternating coloured cards and nested macro tiles. The desktop nutrition breakdown uses four columns; narrow screens use two. Daily comparisons and saving remain below the list.

Verified at 1440, 768, 390, and 320 pixels: every demo weight and macro value (including zero), one-row expansion, keyboard toggle/focus, new-generation reset, unchanged comparison totals, save/delete workflow, non-gram portions, and long names. Production build and the modified component's lint check passed. Interaction verification uses an isolated guest session; live AI generation was not exercised.
