# Mockup Changelog

## v001 — Initial Design (2026-06-11)
**Status:** Initial cyberpunk design with all 7 screens

**Screens:**
- Login (GitHub auth, feature chips, pulsing title)
- Channels Hub (turn badges, ambient grid, FAB)
- Incoming (scrambled magenta bubble with flicker)
- Revealing (cyan locked chars, decrypt progress bar)
- Compose (quoted message, textarea, transmit button)
- Awaiting (purple glyph, ciphertext preview)
- Manual (system manual with 4 sections)

**Design Tokens:**
- Colors: Cyan (#00F6FF) · Magenta (#FF00C8) · Purple (#8A2BE2)
- Fonts: Orbitron (display) · Rajdhani (body)
- Glows: 8px/24px box-shadows with 0.35 alpha
- Grid: Ambient 36px animated drift background

**Applied to App:** 2026-06-11 (branch: `feature/apply-mockup-styling`)

---

## v003 — Neon Conversation Cards (2026-06-11)
**Status:** Redesigned main screen with corner-bracket borders, status-based color coding, and avatar initials

**Key Changes:**
- **Corner Brackets:** All panels (header, conversations, input) feature CSS corner decorations with sharp 2px glowing borders
- **Status Colors:** Conversations coded by state:
  - Cyan (#00F6FF): Active/secure channel
  - Magenta (#FF00C8): Awaiting transmission
  - Red (#FF1744): Signal lost/error
- **Avatar Initials:** Avatar circles now display user initials (A, J, R, S) in Orbitron bold
- **Conversation Status Text:** Each card includes descriptive status (e.g., "Decrypting data stream...", "Awaiting transmission.", "Signal lost.", "Secure channel open.")
- **Border Glow:** Elevated shadow effects with `inset` highlights for depth
- **Input Row:** Simplified to placeholder + 3 action icons (send ✈️, mute 🔇, add ➕)

**Design Tokens (Updated):**
- Corner Size: 12px (items) / 15px (header & input)
- Border: 2px solid with color inheritance
- Shadows: `0 0 15px colorWithAlpha(0.4)` + `inset 0 0 8px colorWithAlpha(0.1)`
- Hover: Elevated to `0 0 25px alpha(0.6)` + `inset 0 0 12px alpha(0.15)`
- Font: Orbitron (names, title), Rajdhani (status, input)

**Diff from v001:**
- Removed centered "Channels Hub" layout; now left-aligned list
- Removed turn badges; replaced with status text
- Added corner decorations to all major elements
- Conversation items are now larger, more scannable cards
- Avatar colors now inherit from item border color

---

## v004 — Chat Screen (2026-06-11)
**Status:** Full chat conversation view with message bubbles, encryption display, and timestamps

**Key Changes:**
- **Header:** Back arrow (←), title, and menu (⋯) with enhanced neon glows
- **Message Bubbles:** Left (incoming/cyan) and right (outgoing/magenta) alignment
- **Message Content:**
  - Sender name in Orbitron bold uppercase
  - Encrypted ciphertext line in monospace (small, muted)
  - Decrypted plaintext message in white
  - Timestamp on the right (colored to match bubble)
- **Corner Brackets:** Full suite on header, input, and all message bubbles (18px, glowing)
- **Status Messages:** Special bubbles for system events (no encrypted text)
- **Input Row:** Simplified with 3 action icons (send, mute, add)
- **Scrollable Messages:** Overflow-y: auto with cyan scrollbar

**Design Tokens (Consistent with v003):**
- Incoming: Cyan (#00F6FF) with triple-layer glow
- Outgoing: Magenta (#FF00C8) with triple-layer glow
- Corner Size: 25px (header/input), 18px (messages)
- Shadows: Elevated 30px + 60px + inset layers
- Font: Orbitron (names), Rajdhani (text), Courier (encrypted)

**Diff from v003:**
- Chat view instead of channel list- Message bubbles instead of conversation cards- Sender/encrypted/decrypted layout- Timestamps- Status messages- Aligned left/right for conversation flow

---

## v005 — Complete System with Neon Corners (2026-06-11)
**Status:** Full 7-screen design with v001 structure + v003/v004 corner bracket styling

**Screens:**
1. **Login** — GitHub auth button, centered lockicon + title
2. **Hub** — Conversation list with status badges
3. **Chat** — Message bubbles (left/right, cyan/magenta), timestamps, encrypted ciphertext
4. **Manual** — System info panels (E2E, Ephemeral, Real-time Sync)

**Key Features:**
- **Corner Brackets:** All panels, headers, input areas, list items
  - Header: 20px, 3px border
  - Panels/Input: 16px, 2px border
  - List items: 14px, 2px border
- **Enhanced Glows:** Multi-layer shadows (30px + 60px + inset)
- **Icon Highlights:** Lock, settings, menu, input actions all glow
- **Scrollable Areas:** Messages and manual sections
- **Screen Navigation:** Buttons at top to switch between screens
- **Ambient Grid:** Original drifting grid background maintained
- **CRT Scanlines:** Original overlay effect preserved

**Design System (Unified):**
- Cyan (#00F6FF) — primary, actives
- Magenta (#FF00C8) — outgoing messages, accents
- Corner brackets on everything for cohesive tech aesthetic
- Enhanced backdrop blur (8-10px)
- Triple-layer neon glow throughout

**Diff from v001-v004:**
- Single file with all 4 screens (switchable via buttons)
- Corner brackets added to every major component
- Glows significantly enhanced (30px base + 60px far)
- Consistent glow theme across headers, panels, inputs, list items
- Icons now have multi-layer drop-shadow effects

---

## Future Versions
- v006 — Compose/Reveal/Awaiting screens (pending)
- v007 — Animation and interaction refinements (pending)
