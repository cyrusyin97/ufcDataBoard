# 5. Design protocol

[Product Spec index](../product-spec.md) · Version 1.1 · Updated 2026-10-24.

### 5.1 Visual language

Use V8 as the visual reference for existing cards and V9 for the bout panel, with the review changes in this spec taking precedence.
Preserve V6, V7, V8, V9, and their local dependencies. Do not edit those references as a substitute for implementing production components.

| Token          | Value / usage                                              |
| -------------- | ---------------------------------------------------------- |
| Canvas         | `#111112`                                                  |
| Panel          | Theme panel `#151516`; history and bout surface `#19191a`  |
| Main text      | Cream `#eeeae2`                                            |
| Secondary text | Muted `#9b9996`                                            |
| Divider        | `#323232`                                                  |
| Accent         | Red `#e83c39`                                              |
| Body           | Local Barlow                                               |
| Display        | Local Barlow Condensed; uppercase names and event headings |
| Focus          | Visible 2px accent outline with 4px offset                 |

Use Tailwind theme variables and component variants. Keep global CSS limited to fonts, theme, focus, and base rendering.
Do not add a separate visual system or CSS Modules for each revision.
Keep hierarchy through display type, spacing, thin dividers, and restrained color.
Do not place engineering implementation detail in a user flow unless it helps interpret data or make a decision.

### 5.2 Screen composition

| State    | Desktop composition                                              | Narrow composition                                                                            |
| -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Rankings | Selector, figure, profile                                        | Selector and figure adapt; profile follows. Mobile order is selector, portrait, profile.      |
| History  | Figure left, internally scrollable History middle, profile right | Preserve readable record rows and profile access; mobile order is portrait, History, profile. |
| Bout     | Figure left, bout middle, profile right                          | Mobile order is portrait, analysis, profile.                                                  |

Current shell maximum width is 1800px. Main adaptation breakpoints are 1100px, 900px, and 600px.
At 900px and below, the desktop three-column composition adapts; at 600px and below, the detail layout stacks vertically.
Current desktop History region is 586px high, or 554px at width at least 1000px and height at most 850px. Bout uses an 840px region.
These are layout baselines, not fixed data limits. Preserve content reachability when changing them.
No horizontal page overflow is permitted at the supported review sizes.

### 5.3 Component appearance and content

- The division menu is a dark custom menu with active checkmark and right-aligned weights. Do not use an operating-system select popup.
- Ranking rows use reviewed headshots and the largest available thumbnail variant. Preserve vertical head composition, center horizontal cropping, and use initials if absent.
- Main figure media follows its reviewed anatomical role. A social metadata image is not automatically a full-body portrait.
- History keeps its count, column headings, result badge, opponent, event, location, date, method, round/time, and coverage footer.
- Event names use the same display typeface and uppercase treatment in History and Bout. History text is smaller; long titles wrap at word boundaries.
- Profile keeps career digits, finish bars, imperial height/reach, age, recent-result dates, and source link. Career and profile facts retain their own snapshot provenance.
- Bout shows the actual event name as its large heading, date, bout type, participants, outcome, ending details, period controls, summary, radar, and disclosure.
- The return bar is outside the bout content scroll area and sticks to the card top during page scrolling through that card.
- Radar has named red/blue series, thin solid lines, subtle points, and stable series colors when participant selection changes. Current strokes are 1.1px, 1.5px on hover; visible points are 2px with larger pointer targets.
- Hover inspection shows fighter and score first, then separate metric rows. The default-closed disclosure provides all ten axis breakdowns without hover dependence.

### 5.4 Input and accessibility

Use semantic buttons, links, menu controls, headings, status messages, and disclosure elements.
Modified link clicks must retain native browser behavior.
The division menu supports Arrow keys, Home/End, Enter/Space, Escape, Tab, and outside dismissal.
The dial supports click, wheel, drag, buttons, Arrow keys, and Home/End.
Opponent preview supports hover, focus, and an explicit information button for touch.
Escape closes Preview before leaving History. In Bout it returns to History; in History it returns home when no preview is open.
Focus the destination heading or dial after navigation with `preventScroll`.
Radar geometry has hover interaction only. Do not add click, tap, or keyboard selection to it.
The disclosure supplies complete score access for keyboard and touch users.
Use text labels as well as series colors and result colors.
Do not claim full accessibility certification from the current automated checks.
