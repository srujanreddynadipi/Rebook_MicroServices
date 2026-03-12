  REBOOK — GLOBAL UI DESIGN SYSTEM
  ══════════════════════════════════════════════════════════════════════

  This is a used-books marketplace. The UI must feel like a hybrid of:
    • Amazon     → product detail pages, trust signals, structured info
    • Airbnb     → card design, soft shadows, beautiful imagery, whitespace
    • OLX/Swiggy → marketplace logic, sticky search, category chips, filters

  DO NOT make it look like a generic Bootstrap/MUI app.
  DO NOT use flat gray cards or default browser fonts.
  The UI must look like a funded startup product.

  ════════════════════════════════════════════════════════════════════
  1. DESIGN TOKENS — use these exact values everywhere
  ════════════════════════════════════════════════════════════════════

  Colors (CSS variables in index.css):
    --primary:       #00C9A7   ← teal (CTA buttons, badges, links)
    --primary-dark:  #00A88C   ← hover state
    --primary-light: #E6FBF7   ← backgrounds, tag chips
    --secondary:     #845EF7   ← purple (AI panel, premium badges)
    --secondary-light: #F3EEFF
    --accent-orange: #FF6B35   ← warm CTA, lending badge
    --accent-yellow: #FFB830   ← star ratings, donation badge
    --danger:        #FF4D4F
    --success:       #52C41A
    --warning:       #FAAD14

    --bg-page:       #F7F8FC   ← off-white page background (NOT pure white)
    --bg-card:       #FFFFFF
    --bg-dark:       #0D1117   ← hero section, footer
    --text-primary:  #1A1D23
    --text-secondary:#5C6370
    --text-muted:    #9CA3AF
    --border:        #E8EAED
    --shadow-card:   0 2px 12px rgba(0,0,0,0.08)
    --shadow-hover:  0 8px 32px rgba(0,0,0,0.14)
    --radius-card:   14px
    --radius-btn:    10px
    --radius-input:  10px

  Typography:
    Font display (headings): 'Sora', sans-serif     → import from Google Fonts
    Font body (paragraphs): 'DM Sans', sans-serif   → import from Google Fonts
    Font mono (code/AI):    'JetBrains Mono', monospace

    Sizes:
      hero title:   3.5rem / 700 weight
      page title:   2rem / 700 weight
      section title:1.375rem / 600 weight
      card title:   1rem / 600 weight
      body:         0.9375rem / 400
      small:        0.8125rem / 400
      label/badge:  0.75rem / 600 uppercase

  ════════════════════════════════════════════════════════════════════
  2. NAVBAR — Sticky, always visible (Swiggy-style)
  ════════════════════════════════════════════════════════════════════

  Height: 64px  |  Background: white  |  border-bottom: 1px solid var(--border)
  box-shadow: 0 1px 8px rgba(0,0,0,0.06)  |  z-index: 1000  |  position: sticky top-0

  Layout (flex, 3 zones):
    LEFT:   Logo — "Re" in var(--primary) teal + "Book" in var(--text-primary)
            Font: Sora 700, 1.5rem
            Small teal dot/icon between the two words

    CENTER: Search bar (takes up 40% of navbar width)
            height: 44px, border-radius: 22px (pill shape)
            border: 1.5px solid var(--border)
            background: var(--bg-page)
            Left icon: search icon in --text-muted
            Placeholder: "Search books, authors, or ISBN..."
            On focus: border-color: var(--primary), box-shadow: 0 0 0 3px rgba(0,201,167,0.15)
            Right: small "⌘K" shortcut badge (gray pill)

    RIGHT:  Not logged in → "Login" (ghost button) + "List a Book" (primary teal filled button)
            Logged in →
              Notifications bell icon with red badge (count)
              "List a Book" primary button
              Avatar circle (user initials, teal background) with dropdown:
                My Books / My Requests / Profile / Logout

  Mobile (<768px): hide center search, show hamburger menu icon

  ════════════════════════════════════════════════════════════════════
  3. HOME PAGE
  ════════════════════════════════════════════════════════════════════

  ── HERO SECTION ──
  background: linear-gradient(135deg, #0D1117 0%, #1A2332 50%, #0D2A25 100%)
  min-height: 520px, display: flex, align-items: center

  LEFT (55%):
    Eyebrow label: "🌱 Free Books. Real Community."
      → small pill: background rgba(0,201,167,0.15), color var(--primary), border 1px solid var(--primary)
      → font-size: 0.8125rem, font-weight 600, letter-spacing 0.05em
      → margin-bottom: 20px

    Headline (Sora 700, 3.5rem, color white, line-height 1.2):
      "Discover Books.
      Share Stories."
    
    Subheading (DM Sans 400, 1.0625rem, color rgba(255,255,255,0.65), margin-top 16px):
      "Borrow, donate, and exchange used books with people in your city.
      Free forever. No shipping fees."

    Search bar (large, prominent):
      height: 56px, border-radius: 28px
      background: white, width: 90%, max-width: 560px
      padding: 0 8px 0 20px
      display: flex, align-items: center, gap: 8px
      
      Left: Location pin icon (teal) + city text "Hyderabad ▾" (clickable)
      Divider: 1px solid var(--border) (vertical)
      Input: flex-grow, "Find your next book..."
      Right: teal pill button "Search" (height 40px, border-radius 20px)
      box-shadow: 0 8px 32px rgba(0,0,0,0.3)

    Stats row (margin-top 32px, gap 32px):
      "12,400+ Books" | "3,200+ Readers" | "9 Cities"
      Each: number in teal bold, label in white/60% opacity, separated by • dividers

  RIGHT (45%):
    Floating book stack illustration:
      3 overlapping book cards at angles (-8deg, 0deg, +6deg)
      Each card: 180x240px, border-radius 12px, box-shadow heavy
      Book covers: colored gradients (teal, purple, orange) with title text overlay
      Subtle floating animation: translateY(-8px) back to 0, 3s ease-in-out, infinite, alternate
      Small badge overlays: "Free" pill, "⭐ 4.8" pill, "Near you" pill

  ── CATEGORY CHIPS ROW ──
  background: white
  border-bottom: 1px solid var(--border)
  padding: 0 max(24px, calc(50% - 640px))
  height: 56px, overflow-x: auto, scrollbar hidden

  Chips (horizontal scroll, no wrap):
    📚 All  |  🔧 Engineering  |  💊 Medical  |  📖 Novels  |  🏫 School
    🏆 Competitive  |  🌟 Self Help  |  👶 Story Books  |  🕌 History  |  🌍 Language

  Each chip:
    height: 36px, padding: 0 16px, border-radius: 18px
    font: DM Sans 500 0.875rem
    default: background var(--bg-page), color var(--text-secondary), border 1px solid var(--border)
    active/hover: background var(--primary-light), color var(--primary), border-color var(--primary)
    transition: all 0.2s ease
    cursor: pointer

  ── POPULAR BOOKS SECTION ──
  padding: 56px max(24px, calc(50% - 680px))
  background: var(--bg-page)

  Header row:
    LEFT: section title "Popular Near You" (Sora 600 1.375rem)
          subtitle "Most requested books this week" (DM Sans 0.875rem --text-muted)
    RIGHT: "See all →" link in teal

  Book cards: horizontal scroll row (gap 20px, no wrap, scrollbar hidden)
    Each BookCard: see Section 5 below

  ── HOW IT WORKS ──
  background: white
  padding: 64px max(24px, calc(50% - 680px))
  text-align: center

  Title: "How ReBook Works" (Sora 700 2rem)
  Subtitle: "Exchange books in 3 simple steps" (DM Sans --text-muted)

  3 cards (grid, gap 32px, equal width):
    Each card:
      background: var(--bg-page)
      border-radius: var(--radius-card)
      padding: 32px 24px
      border: 1px solid var(--border)
      
      Step number circle: 40px, background teal gradient, white bold number, centered
      Icon: 48px emoji or lucide icon, margin 20px auto
      Title: Sora 600 1.125rem
      Description: DM Sans 0.875rem --text-muted, line-height 1.6
      
      Step 1: 📚 "List Your Book" — "Take a photo and list a book in under 2 minutes"
      Step 2: 🤝 "Send a Request" — "Find a book near you and send a borrow or donate request"  
      Step 3: ✅ "Exchange & Rate" — "Meet up or coordinate handoff. Rate your experience"
      
      Connecting arrow between cards (desktop only): → in --text-muted

  ── FEATURED CITIES ──
  6 city pill cards in a flex-wrap row
  Each: flag emoji + city name + book count
  Background: teal gradient on hover

  ════════════════════════════════════════════════════════════════════
  4. AUTH PAGES — Login & Register
  ════════════════════════════════════════════════════════════════════

  Layout: two-column (50/50) on desktop, single column on mobile

  LEFT PANEL (50%):
    background: linear-gradient(160deg, #0D1117, #0D2A25)
    padding: 48px
    display: flex, flex-direction: column, justify-content: center

    Top: Logo + tagline
    Middle: Large quote (italic, white, Sora):
      Login page:   "Thousands of books.
                    Zero cost."
      Register:     "Join 3,200+ readers
                    sharing books."
    
    Bottom: 3 trust badges (horizontal):
      ✅ Free forever  |  📍 Local pickup  |  ⭐ Verified readers
      Each: white/60 text, 0.8125rem DM Sans

  RIGHT PANEL (50%):
    background: white
    padding: 48px
    display: flex, flex-direction: column, justify-content: center, max-width: 420px margin-auto

    Title: "Welcome back" / "Create your account" (Sora 700 1.75rem)
    Subtitle: DM Sans 0.9375rem --text-muted, margin-bottom 32px

    Form inputs:
      Each input wrapper: margin-bottom 20px
      Label: DM Sans 600 0.8125rem --text-primary, margin-bottom 6px, display block
      Input:
        height: 48px, width: 100%
        border: 1.5px solid var(--border)
        border-radius: var(--radius-input)
        padding: 0 14px
        font: DM Sans 0.9375rem
        background: var(--bg-page)
        transition: border-color 0.2s, box-shadow 0.2s
        On focus: border-color var(--primary), box-shadow 0 0 0 3px rgba(0,201,167,0.12)
        With icon: padding-left 42px, icon absolutely positioned left-14px

    Password input: show/hide eye toggle button (right side)

    Submit button:
      width: 100%, height: 52px
      background: var(--primary), color white
      border-radius: var(--radius-btn), border: none
      font: DM Sans 600 1rem
      cursor: pointer
      transition: background 0.2s, transform 0.1s, box-shadow 0.2s
      On hover: background var(--primary-dark), box-shadow 0 4px 16px rgba(0,201,167,0.4)
      On active: transform scale(0.98)
      Loading state: show spinner, disable button, text "Signing in..."

    Below form: "Don't have an account? Register →" link in teal

    Register page extras:
      Name + Email + Password + City + Mobile (optional)
      "By registering you agree to our Terms" — small gray text

  ════════════════════════════════════════════════════════════════════
  5. BOOK CARD COMPONENT — Airbnb-style
  ════════════════════════════════════════════════════════════════════

  Width: 280px (in grids: responsive)  |  border-radius: var(--radius-card)
  background: var(--bg-card)
  border: 1px solid var(--border)
  box-shadow: var(--shadow-card)
  overflow: hidden
  transition: transform 0.2s ease, box-shadow 0.2s ease
  cursor: pointer

  On hover:
    transform: translateY(-4px)
    box-shadow: var(--shadow-hover)

  ── IMAGE ZONE (top) ──
  height: 200px, position: relative, overflow: hidden
  background: linear-gradient(135deg, #667eea, #764ba2) as placeholder

  Image: width 100%, height 100%, object-fit: cover

  TOP-LEFT badge strip (position absolute, top 10px, left 10px, display flex, gap 6px):
    Donation pill: background #FFB830, color white, "🎁 Donate" 
    Lending pill: background var(--accent-orange), color white, "📖 Lend"
    Each pill: padding 3px 10px, border-radius 12px, font DM Sans 600 0.7rem

  TOP-RIGHT: Status badge (position absolute, top 10px, right 10px):
    AVAILABLE: background rgba(82,196,26,0.9), color white, "● Available"
    REQUESTED: background rgba(250,173,20,0.9), color white, "● Requested"  
    BORROWED: background rgba(255,77,79,0.9), color white, "● Borrowed"
    Pill: padding 3px 10px, border-radius 12px, backdrop-filter blur(4px)

  BOTTOM-LEFT: Distance badge (if geolocation available):
    background rgba(0,0,0,0.55), color white, "📍 2.3 km"
    backdrop-filter: blur(4px)
    position: absolute, bottom 10px, left 10px

  ── CONTENT ZONE (bottom) ──
  padding: 16px

  Line 1: Category chip
    display inline-block, background var(--primary-light), color var(--primary)
    padding 2px 10px, border-radius 10px, font DM Sans 600 0.7rem uppercase letter-spacing 0.04em

  Line 2 (margin-top 8px): Book title
    font: Sora 600 1rem, color var(--text-primary)
    white-space: nowrap, overflow: hidden, text-overflow: ellipsis
    max 2 lines (line-clamp)

  Line 3: Author name
    font: DM Sans 400 0.875rem, color var(--text-secondary)
    "by {author}" format

  Line 4 (margin-top 10px): Owner row
    flex, align-items center, justify-content space-between
    
    LEFT: Avatar (24px circle, teal bg, white initials, 0.65rem) + owner name (DM Sans 500 0.8125rem)
    
    RIGHT: Star rating display
      ⭐ {averageRating} in DM Sans 600 0.875rem
      below: "({totalRatings})" in --text-muted 0.75rem

  Line 5 (margin-top 12px): Action row
    flex, gap 8px

    "View Details" button:
      flex-1, height 38px, border-radius 8px
      border: 1.5px solid var(--border), background white
      font DM Sans 500 0.875rem, color var(--text-primary)
      hover: border-color var(--primary), color var(--primary)

    "Request" button (only if AVAILABLE + not own book):
      flex-1, height 38px, border-radius 8px
      background var(--primary), color white, border none
      font DM Sans 600 0.875rem
      hover: background var(--primary-dark)

  ════════════════════════════════════════════════════════════════════
  6. BOOK LIST PAGE — Search + Filters + Grid
  ════════════════════════════════════════════════════════════════════

  ── SEARCH HEADER BAR ──
  background: white
  border-bottom: 1px solid var(--border)
  padding: 16px max(24px, calc(50% - 680px))
  sticky below navbar

  Left: "Books" title (Sora 700 1.375rem) + result count chip
        "Showing 248 books near Hyderabad" (DM Sans 0.875rem --text-muted)

  Right: 
    Sort dropdown: "Sort: Most Relevant ▾"
      border: 1px solid var(--border), border-radius 8px, height 38px, DM Sans 0.875rem
    
    View toggle: Grid icon | List icon
      toggle buttons, active gets teal background

  ── MAIN LAYOUT: sidebar + grid ──
  display: grid, grid-template-columns: 280px 1fr, gap: 28px
  padding: 28px max(24px, calc(50% - 680px))

  ── LEFT SIDEBAR (filter panel) ──
  background: white
  border-radius: var(--radius-card)
  border: 1px solid var(--border)
  padding: 20px
  position: sticky, top: 128px (below navbar + search bar)
  max-height: calc(100vh - 160px)
  overflow-y: auto

    Section header: "Filters" (Sora 600 0.9375rem) + "Clear all" link (teal 0.8125rem)
    Divider after header

    Each filter section:
      Section title: DM Sans 600 0.875rem --text-primary, uppercase 0.04em letter-spacing
      margin-bottom: 16px

      ▸ CATEGORY: 3-column icon grid
        Each item: emoji icon + label, 
        selected: teal background, white text, rounded-8px

      ▸ CONDITION: 3 radio pill buttons in a row
        "New" | "Good" | "Old"
        Selected: teal fill. Unselected: border only.

      ▸ TYPE: Two large toggle buttons side by side
        "🎁 Donation" | "📖 Lending"
        Toggle on/off, teal when active

      ▸ DISTANCE: Slider component
        "Within 5 km" label above right
        Teal slider thumb, teal fill track, gray unfilled track
        Show only if geolocation coords available
        Below: "📍 Using your location" chip (small, teal)

      ▸ CITY: text input (same styling as auth inputs)

      Apply button:
        width 100%, height 44px, teal background
        "Apply Filters" DM Sans 600

  ── RIGHT GRID ──
    Loading state: 6 skeleton cards
      Each skeleton card: same dimensions as BookCard
      Elements: gray animated pulse (background shimmer animation)
      @keyframes shimmer: background-position 0% to 100% over 1.5s infinite
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)
      background-size: 200% 100%

    Loaded state: CSS grid
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))
      gap: 20px

    Empty state (centered):
      Large emoji "📭"
      "No books found" Sora 600 1.25rem
      "Try changing your filters or search in a different city"  DM Sans --text-muted
      "Reset Filters" ghost button

  ════════════════════════════════════════════════════════════════════
  7. BOOK DETAIL PAGE — Amazon product-style
  ════════════════════════════════════════════════════════════════════

  Layout: CSS grid, grid-template-columns: 1fr 380px, gap: 40px
  padding: 32px max(24px, calc(50% - 720px))
  background: var(--bg-page)

  ── LEFT COLUMN ──

    ▸ Image Gallery
      Main image: height 420px, border-radius 16px, object-fit cover, border 1px solid var(--border)
      Thumbnail strip below: flex row, gap 10px, margin-top 12px
        Each thumbnail: 72px × 72px, border-radius 8px, object-fit cover
        Active: border 2px solid var(--primary)
        cursor pointer, hover: opacity 0.8

    ▸ Book Info Card
      background white, border-radius var(--radius-card)
      border 1px solid var(--border), padding 28px, margin-top 24px

      Title: Sora 700 1.75rem
      
      Badges row: flex gap 8px, margin 12px 0
        Category: --primary-light background, teal text
        Condition: gray badge
        
      Author line: "by {author}" DM Sans 0.9375rem --text-secondary
      Publisher + ISBN: smaller gray text, margin-top 4px

      Divider

      "About this book" section:
        Keywords as tags: each tag: gray pill, DM Sans 0.8125rem

      Owner section:
        background var(--bg-page), border-radius 10px, padding 16px, margin-top 20px
        Flex row: Avatar (40px, teal circle, initials) + info column + right side
        Info: owner name (DM Sans 600), city (📍 Hyderabad), rating (⭐ 4.7 · 12 reviews)
        Right: "View Profile →" teal link

  ── RIGHT COLUMN (sticky) ──
    position: sticky, top: 80px

    ▸ Availability Card (main action card)
      background white, border 2px solid var(--border)
      border-radius var(--radius-card), padding 24px

      Status banner at top:
        AVAILABLE: background #F6FFED, border-bottom 1px solid #B7EB8F
                  "● This book is available" in green, DM Sans 600
        REQUESTED: background #FFFBE6, "● Someone has requested this" in #D46B08
        BORROWED: background #FFF2F0, "● Currently borrowed" in var(--danger)
      padding 10px 24px, margin -24px -24px 20px -24px

      Book type indicators (flex row, gap 8px):
        Donation card: padding 12px 16px, border-radius 10px
          background: #FFFBF0, border 1px solid #FFD666
          Icon + "Available to Donate" bold + "Free of cost" muted small
        Lending card: same style, orange tones
          "Available to Borrow" bold + "Request for N weeks" muted

      If AVAILABLE + logged in + not owner:
        "Request for Donation" button:
          width 100%, height 52px, background var(--accent-yellow)
          color white, border-radius var(--radius-btn), DM Sans 600 1rem
          margin-top 16px
          hover: brightness(0.92), box-shadow 0 4px 16px rgba(255,184,48,0.4)

        "Request to Borrow" button (if isLending):
          width 100%, height 52px, background var(--primary)
          same styling as above but teal

      If not logged in:
        "Login to Request" ghost button with border-dashed border

    ▸ AI Q&A Panel (below availability card)
      background: linear-gradient(135deg, #1A0F3C, #2D1B69)
      border-radius var(--radius-card), padding 24px, margin-top 20px, color white

      Header: flex row
        Left: 🤖 icon (24px) + "Ask AI About This Book" (Sora 600 1rem white)
        Right: "Powered by OpenAI" pill
          background rgba(255,255,255,0.1), color rgba(255,255,255,0.7)
          border 1px solid rgba(255,255,255,0.15), padding 3px 10px, border-radius 10px
          font DM Sans 0.7rem

      If indexed:
        Q&A history area: max-height 280px, overflow-y auto
          User question bubble: right align, background rgba(255,255,255,0.15), rounded
          AI answer bubble: left align, background rgba(132,94,247,0.3), rounded
          Font: JetBrains Mono 0.8125rem, line-height 1.6
          
        Input row (margin-top 16px):
          Input: background rgba(255,255,255,0.1), border 1px solid rgba(255,255,255,0.2)
                border-radius 10px, color white, placeholder white/50%, padding 10px 14px
                font DM Sans 0.875rem
          Send button: background var(--secondary) #845EF7, 40px square, border-radius 8px
                      lucide SendIcon, white

      If not indexed:
        Centered: "📄 No documents available" + muted subtitle

  ════════════════════════════════════════════════════════════════════
  8. REQUEST MODAL — @headlessui Dialog
  ════════════════════════════════════════════════════════════════════

  Overlay: background rgba(0,0,0,0.5), backdrop-filter blur(4px)

  Modal panel:
    background white, border-radius 20px
    width: 480px, max-width: calc(100vw - 32px), padding 32px
    box-shadow: 0 24px 80px rgba(0,0,0,0.2)
    animation: slide up + fade in (0.25s ease-out)

    Close button: top-right, 32px circle, gray/10% background, X icon

    Title: "Request This Book" Sora 700 1.375rem

    Book mini card (inside modal): flex row, gap 12px
      Thumbnail: 56px × 72px, border-radius 8px
      Info: title (DM Sans 600), author (DM Sans --text-secondary), owner name

    Divider

    Request type selector:
      Two large radio cards side by side (if both types available)
      Each card: border 2px, border-radius 12px, padding 16px, cursor pointer
      Selected: border-color var(--primary), background var(--primary-light)
      Unselected: border-color var(--border), background white
      
      Donation card: 🎁 icon + "Donation" bold + "Free, keep it forever" muted
      Lending card:  📖 icon + "Borrow" bold + "Return after N weeks" muted

    If LENDING selected:
      Weeks selector (appears with slide-down animation):
        Label: "Borrow for:" DM Sans 600
        Row of pill buttons: 1w | 2w | 3w | 4w | 6w | 8w | 12w
        Selected pill: teal fill
        Unselected: border only

      "Due date: {date}" auto-calculated, teal small text

    Submit button:
      full width, height 52px, teal background
      "Send Request" DM Sans 600 1rem
      Loading: spinner + "Sending..."
      
    Cancel: text link below button, --text-muted

  ════════════════════════════════════════════════════════════════════
  9. MICRO-INTERACTIONS & ANIMATIONS
  ════════════════════════════════════════════════════════════════════

  All buttons:
    transition: all 0.2s ease
    active: transform scale(0.97)
    hover: subtle lift or color shift as defined per component

  Page entry animations (CSS only, no library needed):
    @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    Apply to: hero content (0.3s), section headings (0.4s), cards (stagger 0.1s per card using nth-child delay)

  Card hover: translateY(-4px) + box-shadow increase (as defined in BookCard)

  Skeleton shimmer: animated gradient sweep left to right (1.5s infinite)

  Toast notifications (react-hot-toast):
    position: top-right
    success: teal left border accent
    error: red left border accent
    Custom style: white background, DM Sans font, border-radius 12px

  Form input focus: green glow ring (as defined in auth section)

  Navbar shadow increases on scroll:
    default: 0 1px 8px rgba(0,0,0,0.06)
    scrolled: 0 2px 20px rgba(0,0,0,0.12)
    Use IntersectionObserver or scroll event listener

  ════════════════════════════════════════════════════════════════════
  10. RESPONSIVE BREAKPOINTS
  ════════════════════════════════════════════════════════════════════

  Mobile first. Breakpoints:
    sm:  640px   (phones landscape)
    md:  768px   (tablets)
    lg:  1024px  (small laptops)
    xl:  1280px  (desktops)

  Key responsive rules:
    Navbar: hide center search on <md, show hamburger
    Hero: single column on <md, hide floating books illustration on <sm
    Category chips: horizontal scroll on all sizes, hide scrollbar
    BookList: sidebar collapses to bottom sheet on <lg, toggle button
    BookCard grid: 1 col on <sm, 2 col on <md, 3 col on <lg, 4 col on <xl
    BookDetail: stack columns on <lg (images top, action card below)
    Auth: single column on <md (hide left panel)

  ════════════════════════════════════════════════════════════════════
  11. GLOBAL CSS — add to index.css
  ════════════════════════════════════════════════════════════════════

  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --primary:        #00C9A7;
    --primary-dark:   #00A88C;
    --primary-light:  #E6FBF7;
    --secondary:      #845EF7;
    --secondary-light:#F3EEFF;
    --accent-orange:  #FF6B35;
    --accent-yellow:  #FFB830;
    --danger:         #FF4D4F;
    --success:        #52C41A;
    --warning:        #FAAD14;
    --bg-page:        #F7F8FC;
    --bg-card:        #FFFFFF;
    --bg-dark:        #0D1117;
    --text-primary:   #1A1D23;
    --text-secondary: #5C6370;
    --text-muted:     #9CA3AF;
    --border:         #E8EAED;
    --shadow-card:    0 2px 12px rgba(0,0,0,0.08);
    --shadow-hover:   0 8px 32px rgba(0,0,0,0.14);
    --radius-card:    14px;
    --radius-btn:     10px;
    --radius-input:   10px;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg-page);
        color: var(--text-primary); margin: 0; -webkit-font-smoothing: antialiased; }
  h1,h2,h3,h4,h5,h6 { font-family: 'Sora', sans-serif; }

  /* Hide scrollbar but allow scroll */
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }

  /* Shimmer skeleton */
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, #f0f2f5 25%, #e4e8ed 50%, #f0f2f5 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  /* Fade in up */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

  /* Floating */
  @keyframes float {
    0%, 100% { transform: translateY(0);    }
    50%       { transform: translateY(-10px); }
  }
  .float { animation: float 3s ease-in-out infinite; }



Now implement the following using the design system above:

PHASE 8 — REACT FRONTEND
════════════════════════════════════════════

PROMPT 8.1 — React Project Setup

Where to use: frontend-react/ folder
Run first: npm create vite@latest frontend-react -- --template react

Set up the React frontend for the ReBook project.

Tech stack: React 18, Vite, Tailwind CSS, React Router v6, React Query (TanStack Query v5), Axios, SockJS + STOMP.js

1. Install all dependencies. Generate the exact npm install commands for:
   - tailwindcss, postcss, autoprefixer (with npx tailwindcss init -p)
   - @tanstack/react-query, axios
   - react-router-dom
   - sockjs-client, @stomp/stompjs
   - react-leaflet, leaflet (for map view)
   - react-hot-toast (for notifications/toasts)
   - lucide-react (for icons)
   - @headlessui/react (for modals and dropdowns)

2. Configure tailwind.config.js:
   - content: ["./index.html", "./src/**/*.{js,jsx}"]
   - Extend theme with custom colors:
     primary: { 50 to 900 shades based on #00C9A7 teal }
     secondary: { shades based on #845EF7 purple }

3. Create folder structure:
   src/
   ├── api/           (axios instances and API functions per service)
   ├── components/
   │   ├── common/    (Button, Input, Modal, Spinner, Badge, Pagination)
   │   ├── book/      (BookCard, BookGrid, BookFilter, ImageUpload)
   │   ├── request/   (RequestCard, RequestActions)
   │   ├── chat/      (ChatWindow, MessageBubble, InboxList)
   │   └── layout/    (Navbar, Sidebar, Footer, ProtectedRoute)
   ├── pages/
   │   ├── auth/      (LoginPage, RegisterPage)
   │   ├── books/     (BookListPage, BookDetailPage, AddBookPage, EditBookPage, MyBooksPage)
   │   ├── requests/  (MyRequestsPage, IncomingRequestsPage)
   │   ├── chat/      (ChatPage)
   │   ├── notifications/ (NotificationsPage)
   │   ├── admin/     (AdminDashboardPage, AdminUsersPage)
   │   └── HomePage.jsx
   ├── context/
   │   ├── AuthContext.jsx    (JWT token, current user, login/logout)
   │   └── WebSocketContext.jsx (SockJS/STOMP connection)
   ├── hooks/
   │   ├── useAuth.js
   │   ├── useWebSocket.js
   │   └── useGeolocation.js
   └── utils/
       ├── constants.js
       └── helpers.js

4. .env file:
   VITE_API_BASE_URL=http://localhost:8080
   VITE_WS_URL=http://localhost:8084/ws

5. main.jsx:
   - Wrap App in QueryClientProvider, BrowserRouter, AuthProvider, Toaster (react-hot-toast)

6. App.jsx:
   - Define all routes using React Router v6
   - Use ProtectedRoute component to guard authenticated pages
   - Routes: /, /login, /register, /books, /books/:id, /books/add, /books/edit/:id, /my-books, /requests/sent, /requests/received, /chat, /chat/:requestId, /notifications, /admin/*, /profile

PROMPT 8.2 — Axios Setup and API Layer

Where to use: frontend-react/src/api/
Open file context: .env, AuthContext.jsx (after creating it)

Create the complete API layer for the ReBook React frontend.

1. src/api/axiosInstance.js:
   - Create axios instance with baseURL from VITE_API_BASE_URL
   - Request interceptor: attach JWT token from localStorage to Authorization header as "Bearer {token}"
   - Response interceptor:
     * On 401: attempt token refresh using /api/auth/refresh-token with refreshToken from localStorage
     * If refresh succeeds: update localStorage, retry original request
     * If refresh fails: clear localStorage, redirect to /login
     * On other errors: reject with error

2. src/api/authApi.js:
   - register(data): POST /api/auth/register
   - login(data): POST /api/auth/login → store tokens in localStorage
   - refreshToken(): POST /api/auth/refresh-token
   - logout(): clear localStorage tokens

3. src/api/bookApi.js:
   - getBooks(params): GET /api/books/search with query params (BookSearchRequest fields)
   - getBookById(id): GET /api/books/{id}
   - createBook(formData): POST /api/books with multipart/form-data
   - updateBook(id, formData): PUT /api/books/{id}
   - deleteBook(id): DELETE /api/books/{id}
   - getMyBooks(params): GET /api/books/my
   - getPopularBooks(): GET /api/books/popular
   - getRecommendations(bookId): GET /api/recommendations/{bookId}

4. src/api/requestApi.js:
   - createRequest(data): POST /api/requests
   - getSentRequests(params): GET /api/requests/sent
   - getReceivedRequests(params): GET /api/requests/received
   - approveRequest(id): PUT /api/requests/{id}/approve
   - rejectRequest(id): PUT /api/requests/{id}/reject
   - cancelRequest(id): PUT /api/requests/{id}/cancel
   - updateReturnStatus(id, data): PUT /api/requests/{id}/return-status
   - createReview(data): POST /api/reviews

5. src/api/chatApi.js:
   - sendMessage(data): POST /api/messages
   - getMessages(requestId): GET /api/messages/{requestId}
   - getInbox(): GET /api/messages/inbox
   - markAsRead(requestId): PUT /api/messages/{requestId}/read

6. src/api/notificationApi.js:
   - getNotifications(params): GET /api/notifications
   - getUnreadCount(): GET /api/notifications/unread-count
   - markAsRead(id): PUT /api/notifications/{id}/read
   - markAllAsRead(): PUT /api/notifications/read-all

7. src/api/aiApi.js:
   - askAboutBook(bookId, question): POST /api/ai/ask
   - getBookAiStatus(bookId): GET /api/ai/books/{bookId}/status

PROMPT 8.3 — Auth Context and Protected Routes

Where to use: frontend-react/src/context/ and src/components/layout/
Open file context: authApi.js, axiosInstance.js

Create AuthContext and ProtectedRoute for the ReBook React frontend.

1. src/context/AuthContext.jsx:
   - createContext, useContext, useState, useEffect
   - State: user (object or null), isLoading (bool)
   
   On mount: check localStorage for accessToken + user data
   If token exists: set user from localStorage (parse JSON), setIsLoading(false)
   
   login(loginData):
   - Call authApi.login(loginData)
   - Store accessToken, refreshToken in localStorage
   - Store user object (from response.user) as JSON in localStorage
   - setUser(response.user)
   - Return response

   register(registerData):
   - Call authApi.register
   - Auto-login after registration (store tokens)
   - setUser

   logout():
   - Call authApi.logout (clear localStorage)
   - setUser(null)
   - Navigate to /login

   Provide: { user, isLoading, login, register, logout, isAdmin: user?.role === 'ROLE_ADMIN' }

2. src/components/layout/ProtectedRoute.jsx:
   - If isLoading: return Spinner
   - If !user: return <Navigate to="/login" replace />
   - If requireAdmin && !isAdmin: return <Navigate to="/" replace />
   - Otherwise: return <Outlet />

3. src/components/layout/Navbar.jsx:
   - Logo "ReBook" on left
   - Search bar in center (navigates to /books?keyword=...)
   - Right side:
     * Not logged in: Login + Register buttons
     * Logged in: Notifications bell (with unread badge), My Books link, profile dropdown (My Profile, My Requests, Logout)
   - Use React Query to fetch unreadCount and poll every 30 seconds
   - Mobile: hamburger menu
   - Tailwind styling with primary teal color scheme

4. src/hooks/useAuth.js:
   export default function useAuth() { return useContext(AuthContext); }

PROMPT 8.4 — Book Listing and Search Page

Where to use: frontend-react/src/pages/books/
Open file context: bookApi.js, BookCard component placeholder

Create the Book Listing and Search page for the ReBook React frontend.

1. src/components/book/BookCard.jsx:
   - Props: book (BookResponse object), onRequestClick
   - Display: cover image (fallback to placeholder), title, author, category badge
   - Status badge: AVAILABLE (green), REQUESTED (yellow), BORROWED (red)
   - Donation/Lending badges
   - City, distance (if available): "2.3 km away"
   - Owner rating: star display (averageRating)
   - Action button: "Request Book" (only if AVAILABLE and not own book)
   - Click → navigate to /books/{id}
   - Tailwind: card with hover shadow, rounded corners

2. src/components/book/BookFilter.jsx:
   - Props: filters (state), onFilterChange
   - Filter inputs:
     * Text search (keyword)
     * Category dropdown (all BookCategory values)
     * Condition dropdown (NEW, USED_GOOD, USED_OLD)
     * Type checkboxes: Donation / Lending
     * City text input
     * Radius slider: 5km, 10km, 25km, 50km (only if geolocation available)
   - "Use my location" button (triggers geolocation)
   - Apply / Reset buttons
   - Collapsible on mobile

3. src/pages/books/BookListPage.jsx:
   - useSearchParams to read/write URL query params (so search is shareable)
   - Initialize filters from URL params
   - Use useQuery (React Query) to call bookApi.getBooks(filters)
   - Show BookFilter sidebar (hidden on mobile, toggle button)
   - Show BookGrid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
   - Pagination component at bottom
   - Loading skeleton (show 6 skeleton cards while loading)
   - Empty state: "No books found — try adjusting your filters"
   - Map toggle button: switch between grid view and Leaflet map view
   - Map view: render react-leaflet MapContainer, one Marker per book, popup with BookCard mini

4. src/hooks/useGeolocation.js:
   - useState for coords (lat, lng), error, loading
   - getLocation(): calls navigator.geolocation.getCurrentPosition
   - Return { coords, error, loading, getLocation }

PROMPT 8.5 — Book Detail Page with AI Q&A

Where to use: frontend-react/src/pages/books/
Open file context: bookApi.js, requestApi.js, aiApi.js, AuthContext

Create the Book Detail page with AI Q&A panel for the ReBook React frontend.

src/pages/books/BookDetailPage.jsx:

Layout: two-column on desktop (left: book info, right: AI Q&A + recommendations)

Left column:
1. Image gallery:
   - Main image (large), thumbnail strip below
   - Click thumbnail to change main image

2. Book info:
   - Title (large heading), Author, Publisher, ISBN
   - Category badge, Condition badge
   - Donation / Lending indicators with icons
   - City + distance if available
   - Owner card: name, star rating, "View Profile" link

3. Request section (only show if book is AVAILABLE and user is logged in and not owner):
   - "Request for Donation" button (if isDonation)
   - "Request to Borrow" button with weeks input (if isLending)
   - On click: open modal with CreateRequestForm
   - CreateRequestForm: requestType radio, noOfWeeks input (if LENDING), submit button
   - On submit: call requestApi.createRequest, show success toast

4. Status indicator:
   - If REQUESTED: "Someone has requested this book"
   - If BORROWED: "This book is currently borrowed"

Right column:
5. AI Q&A Panel:
   - Heading: "Ask AI About This Book" with robot icon
   - Check if book is indexed (aiApi.getBookAiStatus)
   - If indexed:
     * Question input with submit button
     * Chat-like display of Q&A history (local state — no persistence)
     * Loading spinner while waiting for AI response
     * Call aiApi.askAboutBook(bookId, question) on submit
     * Display answer in a styled bubble
   - If not indexed: "AI analysis not available for this book"
   - Show "Powered by OpenAI" badge

6. Recommendations section (below AI panel):
   - "Similar Books" heading
   - useQuery to fetch recommendations
   - Horizontal scroll of 4 BookCard mini components
   - Navigate to book detail on click

Use React Query for all data fetching, react-hot-toast for notifications.

PROMPT 8.6 — Dashboard and Request Management Pages

Where to use: frontend-react/src/pages/requests/
Open file context: requestApi.js, AuthContext

Create the request management pages for the ReBook React frontend.

1. src/pages/requests/MyRequestsPage.jsx (Sent Requests):
   - Tab layout: "Sent" tab active
   - useQuery: requestApi.getSentRequests() with pagination
   - For each request show RequestCard with:
     * Book title, cover thumbnail
     * Request type badge (DONATION / LENDING)
     * Status badge (color-coded: PENDING=yellow, APPROVED=green, REJECTED=red, CANCELLED=gray)
     * Due date (if lending and approved)
     * Cancel button (only if PENDING): calls requestApi.cancelRequest, invalidate query
     * "Return status" — if APPROVED + LENDING: show current returnStatus
   - Empty state: "You haven't requested any books yet. Browse books →"

2. src/pages/requests/IncomingRequestsPage.jsx (Received Requests):
   - Shows requests where current user is the owner
   - useQuery: requestApi.getReceivedRequests()
   - For each request:
     * Requester name + rating
     * Book title
     * Request type, weeks (if lending)
     * Request date
     * If PENDING: Approve button (green) + Reject button (red)
       → confirm modal before each action
       → call approve/reject API, show toast, invalidate query
     * If APPROVED + LENDING: "Mark as Returned" / "Not Returned" buttons
       → calls requestApi.updateReturnStatus
   - Separate tabs: All / Pending / Approved / Completed

3. src/components/request/CreateRequestModal.jsx:
   - @headlessui/react Dialog
   - Props: bookId, isDonation, isLending, onClose, onSuccess
   - requestType: radio buttons (show only available types)
   - If LENDING: noOfWeeks slider (1–12 weeks) with label "for N weeks"
   - Submit: useMutation(requestApi.createRequest)
   - On success: toast + onSuccess callback + close modal

4. src/pages/HomePage.jsx:
   - Hero section: "Find Your Next Book — Share What You've Read"
   - Search bar (navigates to /books?keyword=...)
   - Popular Books section: useQuery(bookApi.getPopularBooks) → horizontal scroll
   - Categories grid: 9 category cards with icons
   - How It Works: 3 steps — Post Book, Send Request, Exchange
   - Call to action: Join + Browse buttons

PROMPT 8.7 — Real-time Chat UI

Where to use: frontend-react/src/pages/chat/ and src/context/
Open file context: chatApi.js, AuthContext

Create the real-time chat interface for the ReBook React frontend.

1. src/context/WebSocketContext.jsx:
   - createContext
   - On mount (if user is logged in): connect to SockJS/STOMP
   
   Connection:
   const socket = new SockJS(import.meta.env.VITE_WS_URL)
   const client = new Client({ webSocketFactory: () => socket })
   client.connectHeaders = { Authorization: "Bearer " + localStorage.getItem('accessToken') }
   
   On connect:
   - Subscribe to /user/queue/messages → receive real-time messages
   - setConnected(true)
   
   Methods:
   - sendMessage(messageData): client.publish({ destination: '/app/chat.send', body: JSON.stringify(messageData) })
   - subscribe(requestId, callback): subscribe to /topic/requests/{requestId}
   - unsubscribe(requestId)
   
   Cleanup on logout: client.deactivate()
   
   Provide: { connected, sendMessage, subscribe, unsubscribe }

2. src/pages/chat/ChatPage.jsx:
   - Split layout: left = inbox list, right = chat window
   - On mobile: inbox list first, tap to open chat
   
   Left panel — InboxList:
   - useQuery: chatApi.getInbox() — refresh every 15 seconds
   - Each inbox item: other user name, last message preview, unread count badge, time
   - Selected conversation highlighted
   - Click → navigate to /chat/{requestId} or set active requestId in state

3. src/pages/chat/ChatWindowPage.jsx:
   - useParams: requestId
   - useQuery: chatApi.getMessages(requestId) — initial load
   - Subscribe to WebSocket /topic/requests/{requestId} on mount
   - On new WebSocket message: append to messages list (update React Query cache)
   - Unsubscribe on unmount
   
   UI:
   - Message list (scrollable, auto-scroll to bottom on new message)
   - Each message: bubble (own messages right-aligned teal, other user left-aligned gray)
   - Timestamp below each message
   - "Read" tick for read messages
   - Bottom: textarea + send button
   - On send: call webSocketContext.sendMessage (if connected) else fall back to chatApi.sendMessage REST
   - Mark as read on open: chatApi.markAsRead(requestId)

4. src/components/chat/MessageBubble.jsx:
   - Props: message, isOwn (bool)
   - Own: right side, teal background, rounded-br-none
   - Other: left side, gray background, rounded-bl-none
   - Show: content, timestamp, read indicator

PROMPT 8.8 — Add Book Page and Admin Pages

Where to use: frontend-react/src/pages/books/ and src/pages/admin/
Open file context: bookApi.js, AuthContext

Create the Add Book page and Admin Dashboard for the ReBook React frontend.

1. src/pages/books/AddBookPage.jsx:
   - Multi-step form (Step 1: Book Details, Step 2: Images, Step 3: Availability & Location)
   
   Step 1 — Book Details:
   - Title* (required), Author* (required)
   - Publisher, ISBN
   - Keywords (tag input — press Enter to add)
   - Category dropdown, Condition dropdown
   
   Step 2 — Images:
   - Drag and drop image upload area
   - Preview thumbnails with remove button
   - Max 5 images, 5MB each
   - First image auto-set as cover
   - Reorder by drag-and-drop (optional)
   
   Step 3 — Availability:
   - "Available for Donation" toggle
   - "Available for Lending" toggle (at least one required)
   - City text input
   - "Use my location" button → fills latitude/longitude
   - Map preview showing pin at entered location (small Leaflet map)
   
   Submission:
   - Build FormData with book JSON + image files
   - useMutation(bookApi.createBook)
   - On success: navigate to /books/{newBookId} + success toast

2. src/pages/books/MyBooksPage.jsx:
   - Grid of user's own books
   - Each BookCard shows Edit and Delete buttons
   - Delete: confirm dialog → bookApi.deleteBook → invalidate query + toast
   - Edit: navigate to /books/edit/{id}

3. src/pages/admin/AdminDashboardPage.jsx:
   - Only accessible if user.role === 'ROLE_ADMIN' (ProtectedRoute with requireAdmin)
   - Stats cards: Total Users, Total Books, Active Requests, Books Borrowed
   - (Stats fetched from actuator or dedicated endpoints — add stub API calls)
   - Quick actions: View All Users, View All Books

4. src/pages/admin/AdminUsersPage.jsx:
   - Table of all users with columns: Name, Email, City, Role, Status (Active/Banned), Joined Date
   - Ban/Unban toggle button per row
   - Search users by name/email
   - Pagination
   - Call userApi.banUser(id) / userApi.unbanUser(id)
   - useMutation with optimistic updates

5. src/pages/profile/ProfilePage.jsx:
   - Show logged in user's info
   - Edit form with UpdateProfileRequest fields
   - Location update with map picker
   - Display rating (stars) and review count
   - List of recent reviews received