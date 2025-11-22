# LensLlama Style Guide

## Design Philosophy

**Clean, minimal, structured.** Let photography be the hero. UI should be invisible.

**Core Principles:**
- Square edges only - no border-radius anywhere
- No borders - use spacing and background contrast to separate elements
- No shadows - flat design
- Generous whitespace - let things breathe
- Grid alignment - structure through placement, not decoration
- System fonts - fast, native, doesn't compete with photos

---

## Visual Language

### Colors

**Neutral-first palette.** Photos provide the color. Use llama cream for warmth.

- **Backgrounds:** White primary, llama cream (#FDF6E3) for cards/sections/hover states
- **Text:** Near-black (neutral-950) for headings, gray (neutral-600) for body, light gray (neutral-400) for metadata
- **Accent:** Black for buttons and interactive elements
- **Feedback:** Green for success, red for errors

The cream tone (#FDF6E3) replaces all grays for backgrounds - it's warm, subtle, and on-brand.

### Typography

- System font stack only
- Limited scale: 5 sizes maximum (48px, 30px, 20px, 16px, 12px)
- Medium weight for headings, regular for body
- Tight line heights for headings, relaxed for body text

### Spacing

- 4px base unit
- Prefer larger spacing - 24px, 32px, 48px, 64px
- Consistent gaps in grids (32px)
- Generous page padding (24px mobile, 48px desktop)

### Images

- Square aspect ratio for grid thumbnails
- Images touch container edges - no internal padding
- Subtle zoom on hover (scale 1.05)
- Cream background while loading

---

## User Journeys

### Journey 1: Browse Images (Homepage)

**Goal:** Discover images quickly, find something worth buying

**Page Structure:**
1. Minimal navigation bar - logo left, sign in right
2. Optional hero with single tagline (one line, not a paragraph)
3. Image grid - 4 columns desktop, 2 mobile, 1 on smallest
4. Each card shows: image thumbnail, title, price - nothing else

**UX Directives:**
- No filters or search in MVP - just a clean grid
- Images are the UI - minimize chrome around them
- Price visible on every card - no "click to see price"
- Cards link to detail page - entire card is clickable
- No pagination - show all images (MVP scale)
- No categories or tags displayed on cards

**Interactions:**
- Image zoom on card hover
- No loading spinners - use skeleton rectangles

---

### Journey 2: View Image Detail

**Goal:** Evaluate image quality and decide to purchase

**Page Structure:**
1. Same minimal nav as homepage
2. Two-column layout: large image left, details right
3. Details stack: title, description, price, buy button, metadata

**UX Directives:**
- Image should be as large as possible - it's the product
- Watermark visible but not obstructive
- Price prominently displayed - larger than body text
- Single primary action: "Buy License" button
- Metadata (dimensions, photographer) is tertiary - small and gray
- No related images or recommendations in MVP

**Interactions:**
- Buy button triggers Privy login if not authenticated
- Show loading state on button during payment processing
- Success state: button changes to "Download"
- No modals for purchase - keep user on same page

---

### Journey 3: Purchase Flow

**Goal:** Complete payment with minimal friction

**Flow States:**
1. **Not authenticated** - Click buy → Privy modal appears
2. **Authenticated, not paid** - Click buy → Sign message → Processing
3. **Processing** - Button shows loading state, disabled
4. **Success** - Button becomes "Download", success message appears
5. **Already licensed** - Page loads with "Download" button ready

**UX Directives:**
- Never navigate away from the image during purchase
- Privy handles auth UI - don't build custom login forms
- Show clear loading state during blockchain operations
- Display transaction confirmation after success
- Allow re-download - button stays as "Download" for licensed images
- Error messages in plain English, not technical errors

**Feedback:**
- Processing: "Completing purchase..."
- Success: "License purchased successfully"
- Error: "Purchase failed. Please try again."

---

### Journey 4: Upload Image

**Goal:** Photographer adds image to marketplace

**Page Structure:**
1. Same minimal nav
2. Single column, centered form
3. Form sections: file upload, metadata, pricing
4. Submit button at bottom

**UX Directives:**
- Require authentication before showing form
- Large drop zone for file upload - make it obvious
- Show image preview after file selection
- Minimal required fields: image, title, price
- Optional: description, tags
- Tags as comma-separated text input, not fancy tag picker
- Price input in USDC with clear label

**Interactions:**
- Drag and drop or click to upload
- Client-side image preview immediately
- Progress indicator during upload (percentage or bar)
- Redirect to homepage on success
- Keep user on page for errors - don't lose their input

**Validation:**
- File type check before upload
- File size check (show limit clearly)
- Required field validation on submit
- Inline error messages below fields

---

### Journey 5: Re-download Licensed Image

**Goal:** User retrieves previously purchased image

**UX Directives:**
- When user visits image detail page they've licensed, show "Download" button immediately
- No need to re-authenticate for download
- Same page layout as unpurchased - just different button state
- Could show "Licensed" badge near price (grayed out price, "Purchased" label)

---

## Component Patterns

### Navigation
- Fixed height, not sticky
- Logo as text, not image (faster, simpler)
- Maximum 2-3 nav items
- Sign in/profile on right

### Image Cards
- Aspect-square thumbnail
- Title truncated to one line
- Price below title
- No description, tags, or metadata on card
- Entire card clickable

### Buttons
- Primary: black background, white text
- Secondary: transparent background, black text
- Full button padding (16px vertical, 24px horizontal)
- Text centered, medium weight

### Form Inputs
- Cream background (#FDF6E3), no border
- Generous padding inside input
- Label above input, not inside
- Error message below input in red

### Loading States
- Skeleton rectangles matching content shape
- Cream background (#FDF6E3)
- No shimmer animation - static blocks

---

## Content Guidelines

### Tone
- Concise and direct
- No marketing fluff
- Technical terms only when necessary

### Microcopy Examples
- Button: "Buy License" not "Purchase Now!"
- Empty state: "No images yet" not "Wow, such empty!"
- Error: "Upload failed" not "Oops! Something went wrong :("
- Success: "Image uploaded" not "Awesome! Your image is live!"

### Labels
- "Price" not "Cost" or "Amount"
- "Title" not "Name" or "Image Title"
- "Description" not "About" or "Details"
- "Sign In" not "Login" or "Log In"

---

## Responsive Behavior

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Grid Adaptation
- 4 columns → 2 columns → 1 column
- Maintain consistent gap at all sizes

### Layout Changes
- Two-column detail page stacks to single column on mobile
- Image above details on mobile
- Full-width buttons on mobile

### Touch Considerations
- Larger tap targets on mobile (minimum 44px)
- No hover-dependent information

---

## Don'ts

- No rounded corners on anything
- No borders to separate content
- No drop shadows
- No gradients
- No decorative icons or illustrations
- No animated loaders (spinners, bouncing dots)
- No toast notifications popping in from corners
- No modals except for Privy auth
- No carousels or sliders
- No infinite scroll
- No skeleton shimmer animations
- No emoji in UI copy
