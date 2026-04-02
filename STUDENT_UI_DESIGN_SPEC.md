# Student UI Design Specification

> **Purpose:** This document fully describes the student-facing UI of the AGI Online Dashboard (elearning.globalagi.org). Use it to replicate the exact same student design in another React + Tailwind + shadcn/ui application.

---

## Table of Contents

1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Design Tokens & Theme](#2-design-tokens--theme)
3. [Typography](#3-typography)
4. [Spacing System](#4-spacing-system)
5. [Border Radius & Shadows](#5-border-radius--shadows)
6. [Color System](#6-color-system)
7. [Animations & Transitions](#7-animations--transitions)
8. [Layout Architecture](#8-layout-architecture)
9. [Student Sidebar](#9-student-sidebar)
10. [Header Component](#10-header-component)
11. [Student Routes](#11-student-routes)
12. [Page-by-Page Specs](#12-page-by-page-specs)
13. [Shared UI Components (shadcn/ui)](#13-shared-ui-components)
14. [Chart Components](#14-chart-components)
15. [Interactive Components](#15-interactive-components)
16. [Loading, Empty & Error States](#16-loading-empty--error-states)
17. [Forms & Validation](#17-forms--validation)
18. [Responsive Design Patterns](#18-responsive-design-patterns)
19. [Accessibility](#19-accessibility)
20. [Icons](#20-icons)
21. [Auth & Data Fetching](#21-auth--data-fetching)
22. [Custom Scrollbars](#22-custom-scrollbars)
23. [Z-Index Scale](#23-z-index-scale)

---

## 1. Tech Stack & Dependencies

| Category | Technology | Version/Notes |
|---|---|---|
| Framework | React 18+ | TypeScript, Vite bundler |
| Styling | Tailwind CSS 3 | Class-based dark mode (`darkMode: ["class"]`) |
| Component Library | shadcn/ui | Radix UI primitives + Tailwind + CVA (class-variance-authority) |
| Routing | wouter | Lightweight. Uses `<Switch>`, `<Route>`, `<Link>`, `useLocation()` |
| Server State | TanStack React Query v5 | `staleTime: Infinity`, `refetchOnWindowFocus: false`, `retry: false` |
| Forms | react-hook-form | With Zod validation schemas |
| Icons | lucide-react | All icons from this single library |
| Charts | Recharts + Apache ECharts | SVG-based custom charts + ECharts for radar/gauge |
| Animations | Framer Motion v11 + CSS keyframes | `useStaggeredAnimation`, `useReducedMotion` hooks |
| Theme | next-themes | `ThemeProvider` for dark/light toggle |
| Class Merging | `cn()` utility | `clsx` + `tailwind-merge` composition |
| Tailwind Plugins | `tailwindcss-animate`, `@tailwindcss/typography` | |

### Google Fonts Required

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Epilogue:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 2. Design Tokens & Theme

### CSS Variables (`:root` — Light Mode)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 20 14.3% 4.1%;
  --muted: 60 4.8% 95.9%;
  --muted-foreground: 25 5.3% 44.7%;
  --popover: 0 0% 100%;
  --popover-foreground: 20 14.3% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 20 14.3% 4.1%;
  --border: 20 5.9% 90%;
  --input: 20 5.9% 90%;
  --primary: 225 90.4% 48.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 60 4.8% 95.9%;
  --secondary-foreground: 24 9.8% 10%;
  --accent: 32 94% 44.1%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --success: 142 76.2% 36.3%;
  --success-foreground: 210 40% 98%;
  --ring: 20 14.3% 4.1%;
  --radius: 0.5rem;

  /* Chart colors */
  --chart-1: 225 90.4% 48.2%;   /* Blue */
  --chart-2: 32 94% 44.1%;      /* Orange */
  --chart-3: 142 76.2% 36.3%;   /* Green */
  --chart-4: 262 83.3% 57.8%;   /* Purple */
  --chart-5: 341 90% 51.8%;     /* Pink */

  /* Sidebar */
  --sidebar-background: 225 90.4% 48.2%;
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 0 0% 100%;
  --sidebar-primary-foreground: 225 90.4% 48.2%;
  --sidebar-accent: 24 10% 90%;
  --sidebar-accent-foreground: 225 40% 30%;
  --sidebar-border: 225 90.4% 38%;
  --sidebar-ring: 0 0% 100%;
}
```

### CSS Variables (`.dark` — Dark Mode)

```css
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --primary: 225 90.4% 48.2%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --accent: 32 94% 44.1%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --success: 142 76.2% 36.3%;
  --success-foreground: 0 0% 98%;
  --ring: 240 4.9% 83.9%;
  --sidebar-background: 225 40% 16%;
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 0 0% 100%;
  --sidebar-primary-foreground: 225 90.4% 48.2%;
  --sidebar-accent: 240 3.7% 15.9%;
  --sidebar-accent-foreground: 0 0% 100%;
  --sidebar-border: 240 3.7% 15.9%;
  --sidebar-ring: 240 4.9% 83.9%;
}
```

### Tailwind Config — Student Theme Colors

```ts
colors: {
  "student-primary": "#18548b",       // Deep navy — main brand
  "student-primary-light": "#e8f0f7", // Light blue tint
  "student-accent": "#FF7F11",        // Orange — active states, highlights
  "student-secondary": "#8BC34A",     // Green
  "student-bg": "#f6f7f8",            // Off-white page background
  "student-surface": "#ffffff",       // Card/surface white
  "student-text": "#121417",          // Near-black body text
  "student-muted": "#657686",         // Muted/secondary text
}
```

---

## 3. Typography

### Font Families

| Role | Font | Tailwind Class | Usage |
|---|---|---|---|
| Body/Display | Manrope | `font-display` | All body text, labels, descriptions |
| Headings | Epilogue | `font-heading` | h1, h2, h3, h4 elements |
| Mono | SF Mono, Consolas, Monaco | `font-mono` | Code blocks (rare in student UI) |

The student dashboard applies fonts via a wrapper class:

```css
.student-dashboard {
  font-family: 'Manrope', sans-serif;
}
.student-dashboard h1, h2, h3, h4 {
  font-family: 'Epilogue', sans-serif;
}
```

### Font Scale (Tailwind defaults)

| Class | Size | Common Usage |
|---|---|---|
| `text-xs` | 0.75rem (12px) | Badges, labels, timestamps |
| `text-sm` | 0.875rem (14px) | Body text, nav items, descriptions |
| `text-base` | 1rem (16px) | Standard body text |
| `text-lg` | 1.125rem (18px) | Card titles, section headers |
| `text-xl` | 1.25rem (20px) | Page sub-headings |
| `text-2xl` | 1.5rem (24px) | Card titles (shadcn default) |
| `text-3xl` | 1.875rem (30px) | Page headings |
| `text-4xl` | 2.25rem (36px) | Hero/large numbers |

### Font Weights

| Class | Weight | Usage |
|---|---|---|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Nav items, labels, buttons |
| `font-semibold` | 600 | Active nav, card titles, emphasis |
| `font-bold` | 700 | Page headings, strong emphasis |

---

## 4. Spacing System

Based on an 8px grid. These are Tailwind's default spacing scale values used throughout:

| Token | Value | Common Usage |
|---|---|---|
| `gap-1` / `p-1` | 0.25rem (4px) | Tight spacing between inline elements |
| `gap-2` / `p-2` | 0.5rem (8px) | Icon-to-text gaps, badge padding |
| `gap-3` / `p-3` | 0.75rem (12px) | Small card padding, compact items |
| `gap-4` / `p-4` | 1rem (16px) | Standard card padding, form gaps |
| `gap-6` / `p-6` | 1.5rem (24px) | shadcn Card header/content padding |
| `gap-8` / `p-8` | 2rem (32px) | Section spacing |

### Container

```ts
container: {
  center: true,
  padding: "1.5rem",  // 24px
  screens: { "2xl": "1440px" }
}
```

---

## 5. Border Radius & Shadows

### Border Radius

| Class | Value | Usage |
|---|---|---|
| `rounded-sm` | calc(0.5rem - 4px) = 0.25rem | Small elements |
| `rounded-md` | calc(0.5rem - 2px) = 0.375rem | Buttons, inputs |
| `rounded-lg` | 0.5rem (8px) | Cards (shadcn default) |
| `rounded-xl` | 0.75rem | Nav items, interactive cards |
| `rounded-2xl` | 1rem (16px) | Feature cards, dashboard cards |
| `rounded-3xl` | 1.25rem (20px) | Large decorative cards |
| `rounded-full` | 9999px | Avatars, badges, dots |

### Shadows

| Class | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 3px rgb(0 0 0/0.1), 0 1px 2px -1px rgb(0 0 0/0.1)` | Cards (default) |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0/0.1), 0 2px 4px -2px rgb(0 0 0/0.1)` | Dropdowns, hover cards |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0/0.1), 0 4px 6px -4px rgb(0 0 0/0.1)` | Active sidebar items, dialogs |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0/0.1), 0 8px 10px -6px rgb(0 0 0/0.1)` | Elevated modals |
| `shadow-2xl` | `0 25px 50px -12px rgb(0 0 0/0.25)` | Sidebar |

### Custom Shadows (Tailwind config)

```ts
boxShadow: {
  glow: "0 0 20px rgba(30, 140, 255, 0.3)",
  "glow-xl": "0 0 40px rgba(30, 140, 255, 0.4)",
  "glow-accent": "0 0 20px rgba(155, 92, 255, 0.3)",
  "glow-success": "0 0 20px rgba(24, 230, 201, 0.3)",
  glass: "0 8px 32px rgba(0, 0, 0, 0.12)",
  "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.16)",
}
```

---

## 6. Color System

### Student-Specific Color Palette

| Purpose | Hex | Where Used |
|---|---|---|
| Primary (deep navy) | `#18548b` | Header icons, hover states, links |
| Primary Light | `#e8f0f7` | Light backgrounds |
| Accent (orange) | `#FF7F11` | Active sidebar icon, active indicator dot, avatar gradient start |
| Accent Light (orange) | `#ff9a44` | Avatar gradient end |
| Secondary (green) | `#8BC34A` | Success states |
| Background | `#f6f7f8` | Page background |
| Surface | `#ffffff` | Cards |
| Text | `#121417` | Body text |
| Muted | `#657686` | Secondary text |

### Gradient Patterns Used in Dashboard Cards

| Name | Tailwind Classes | Usage |
|---|---|---|
| Blue | `from-blue-50 via-blue-50/80 to-indigo-50` | Continue Learning card |
| Green/Emerald | `from-emerald-50 via-green-50/80 to-teal-50` | Overall Progress card |
| Purple | `from-violet-50 via-purple-50/80 to-fuchsia-50` | Module Progress card |
| Cyan | `from-cyan-50 via-sky-50/80 to-blue-50` | Skill Mastery card |
| Amber | `from-amber-50 via-yellow-50/80 to-orange-50` | Final Exam card |
| Slate | `from-slate-50 via-gray-50/80 to-zinc-50` | Quick stats |

### Sidebar Gradient

```
bg-gradient-to-b from-[#1a1f2e] to-[#0f1318]
```
This is a dark navy-to-charcoal vertical gradient for the student sidebar.

---

## 7. Animations & Transitions

### Tailwind Keyframes (in `tailwind.config.ts`)

```ts
keyframes: {
  "accordion-down": {
    from: { height: "0" },
    to: { height: "var(--radix-accordion-content-height)" },
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to: { height: "0" },
  },
  "aurora-shift": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.6" },
    "33%": { transform: "translate(30px, -30px) scale(1.1)", opacity: "0.8" },
    "66%": { transform: "translate(-20px, 20px) scale(0.95)", opacity: "0.5" },
  },
  "float-gentle": {
    "0%, 100%": { transform: "translateY(0) translateX(0)" },
    "25%": { transform: "translateY(-10px) translateX(5px)" },
    "50%": { transform: "translateY(-5px) translateX(-5px)" },
    "75%": { transform: "translateY(-15px) translateX(3px)" },
  },
  "orb-pulse": {
    "0%, 100%": { transform: "scale(1)", opacity: "0.4" },
    "50%": { transform: "scale(1.2)", opacity: "0.6" },
  },
  "gradient-x": {
    "0%, 100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
  },
  shimmer: {
    "0%": { backgroundPosition: "-1000px 0" },
    "100%": { backgroundPosition: "1000px 0" },
  },
  "slide-up-fade": {
    "0%": { opacity: "0", transform: "translateY(20px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  "scale-in": {
    "0%": { opacity: "0", transform: "scale(0.95)" },
    "100%": { opacity: "1", transform: "scale(1)" },
  },
  "magnetic-hover": {
    "0%, 100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-2px)" },
  },
  "glow-pulse": {
    "0%, 100%": { boxShadow: "0 0 20px rgba(30, 140, 255, 0.3)" },
    "50%": { boxShadow: "0 0 30px rgba(30, 140, 255, 0.5)" },
  },
  "count-up": {
    "0%": { opacity: "0", transform: "translateY(10px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  "bar-grow": {
    "0%": { transform: "scaleX(0)", transformOrigin: "left" },
    "100%": { transform: "scaleX(1)", transformOrigin: "left" },
  },
  barLoader: {
    "0%, 100%": { transform: "scaleY(0.1)", opacity: "0.2" },
    "50%": { transform: "scaleY(1)", opacity: "1" },
  },
}
```

### Animation Classes

```ts
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
  "aurora-shift": "aurora-shift 18s ease-in-out infinite",
  "float-gentle": "float-gentle 6s ease-in-out infinite",
  "orb-pulse": "orb-pulse 8s ease-in-out infinite",
  "gradient-x": "gradient-x 12s ease infinite",
  shimmer: "shimmer 2s linear infinite",
  "slide-up-fade": "slide-up-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
  "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
  "magnetic-hover": "magnetic-hover 0.3s ease-out",
  "glow-pulse": "glow-pulse 2s ease-in-out infinite",
  "count-up": "count-up 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
  "bar-grow": "bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
  barLoader: "barLoader 1.2s ease-in-out infinite",
}
```

### CSS Keyframes (in `index.css`)

```css
@keyframes fadeOutLabel {
  0% { opacity: 1; transform: translateX(0) scale(1); }
  70% { opacity: 1; transform: translateX(0) scale(1); }
  100% { opacity: 0; transform: translateX(0.5rem) scale(0.95); }
}

@keyframes ripple {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}
```

### Design Token Keyframes (in `design-tokens.css`)

```css
@keyframes float {
  0%, 100% { transform: translateY(0) translateX(0); }
  33% { transform: translateY(-20px) translateX(10px); }
  66% { transform: translateY(10px) translateX(-10px); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--color-primary-500) / 0.4); }
  50% { box-shadow: 0 0 0 8px hsl(var(--color-primary-500) / 0); }
}
```

### Common Transition Patterns

| Pattern | Classes | Usage |
|---|---|---|
| General smooth | `transition-all duration-300` | Most interactive elements |
| Fast color change | `transition-colors duration-200` | Icon color on hover |
| Card hover lift | `hover:-translate-y-1 hover:shadow-lg transition-transform duration-200` | Dashboard cards |
| Sidebar collapse | `transition-all duration-300` | Desktop sidebar width change |
| Premium easing | `transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1)` | Tailwind class: `ease-premium` |

### Framer Motion Staggered Animation Hook

```tsx
function useStaggeredAnimation(index: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }
  };
}
```

---

## 8. Layout Architecture

### Overall Structure

```
<ThemeProvider>
  <AuthProvider>
    <PermissionsProvider>
      <QueryClientProvider>
        <TooltipProvider>
          <Switch> {/* wouter router */}
            <Route path="/student/:rest*">
              <DashboardLayout>
                <StudentSidebar />
                <Header />
                <main>{children}</main>
              </DashboardLayout>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </PermissionsProvider>
  </AuthProvider>
</ThemeProvider>
```

### DashboardLayout (Student variant)

```
┌────────────────────────────────────────────────────┐
│ [Sidebar w-64]  │  [Main Content Area]             │
│                 │  ┌──────────────────────────────┐ │
│  Logo (h-20)    │  │ Header (h-16, sticky top-0)  │ │
│                 │  ├──────────────────────────────┤ │
│  Nav Section    │  │                              │ │
│  "General"      │  │  Scrollable Content          │ │
│   - Dashboard   │  │  (overflow-y-auto)           │ │
│   - Courses     │  │                              │ │
│   - Grades      │  │  Page Component renders      │ │
│   - Certificates│  │  here with p-4 md:p-6        │ │
│                 │  │                              │ │
│  ─── divider    │  │                              │ │
│                 │  │                              │ │
│  "Tools"        │  │                              │ │
│   - Settings    │  │                              │ │
│   - Help Center │  │                              │ │
│   - Feedback    │  │                              │ │
│                 │  │                              │ │
│  ─── divider    │  │                              │ │
│  User Profile   │  │                              │ │
│  Logout Button  │  │                              │ │
└────────────────────────────────────────────────────┘
```

### Mobile Layout

On screens < 768px (`md` breakpoint):
- Sidebar is hidden by default
- A fixed overlay (`bg-black/50`) appears behind sidebar when open
- Sidebar slides in from left with `translate-x-0` (hidden: `-translate-x-full`)
- Header shows a hamburger/menu toggle button (visible only on mobile)
- Clicking any nav link auto-closes the mobile sidebar

### Desktop Sidebar Collapse

- Toggle button in header (hidden on mobile, shown on `md:`)
- Sidebar width transitions between `w-64` (expanded) and `w-0` (collapsed)
- `transition-all duration-300` on the sidebar container
- Main content area adjusts width automatically via flex

---

## 9. Student Sidebar

### Visual Design

```
Width: w-64 (256px)
Background: bg-gradient-to-b from-[#1a1f2e] to-[#0f1318]
Height: Full viewport (h-full)
Shadow: shadow-2xl
Z-index: z-20
```

### Logo Section

```
Height: h-20
Background: bg-white
Border: border-r border-slate-300
Content: Logo image (h-16 w-auto object-contain)
Hover: hover:opacity-95 transition-opacity
Link: Navigates to /student
```

### Navigation Section

```
Wrapper: ScrollArea (flex-1 py-6 px-3)
Inner: flex flex-col gap-1
```

#### Section Headers

```
Tag: <p>
Classes: px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3
```

#### Section Divider

```
<div className="my-5 border-t border-white/10" />
```

#### Nav Items — "General" Section

| Label | Icon | Route | Match |
|---|---|---|---|
| Dashboard | `LayoutDashboard` | `/student` | Exact match only |
| Courses | `BookOpen` | `/student/courses` | Prefix match |
| Grades | `GraduationCap` | `/student/final-examinations` | Prefix match |
| Certificates | `Award` | `/student/certificates` | Prefix match |

#### Nav Items — "Tools" Section

| Label | Icon | Route | Match |
|---|---|---|---|
| Settings | `Settings` | `/student/profile` | Prefix match |
| Help Center | `HelpCircle` | `/student/support` | Prefix match |
| Feedback | `MessageSquare` | `/student/feedback` | Prefix match |

#### Nav Item Styling

```
Container: w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left

Active state:
  Container: bg-white/10 text-white shadow-lg
  Icon: text-[#FF7F11] size-5
  Label: text-sm font-semibold
  Indicator: ml-auto w-1.5 h-1.5 rounded-full bg-[#FF7F11]  (small orange dot on right)

Inactive state:
  Container: text-white/60 hover:bg-white/5 hover:text-white
  Icon: text-white/50 group-hover:text-white/80 size-5
  Label: text-sm font-medium
```

### User Profile Card (Footer)

```
Wrapper: p-4 border-t border-white/10
Card: flex items-center gap-3 mb-3 p-3 rounded-xl bg-white/5

Avatar:
  size-10 rounded-full
  bg-gradient-to-br from-[#FF7F11] to-[#ff9a44]
  flex items-center justify-center
  text-white font-bold text-sm shadow-lg
  Content: First letter of student name

Name: text-sm font-semibold text-white truncate
Pathway: text-xs text-white/50 truncate

Logout Button:
  variant="ghost" size="sm"
  w-full justify-start text-white/50
  hover:bg-red-500/20 hover:text-red-400
  Icon: LogOut (mr-2 size-4)
  Label: "Log out" (text-sm font-medium)
```

---

## 10. Header Component

### Student Header Layout

```
Height: h-16 (64px)
Position: sticky top-0 z-30
Background: bg-white/80 backdrop-blur-md
Border: border-b border-slate-200/60
```

### Structure

```
┌──────────────────────────────────────────────────┐
│ [Menu Toggle (mobile)] [Sidebar Toggle (desktop)] │
│                          [Time] [Bell] [User ▼]  │
└──────────────────────────────────────────────────┘
```

### Elements

| Element | Visibility | Details |
|---|---|---|
| Mobile menu toggle | `md:hidden` | Menu icon, `text-slate-500 hover:text-[#18548b]` |
| Desktop sidebar toggle | `hidden md:flex` | PanelLeftClose/PanelLeftOpen icon, `text-[#18548b]` |
| Time display | `hidden sm:flex` | Format: "Wed, Jan 19, 2024, 14:32:45", `text-sm text-slate-500` |
| Notification bell | Always | Bell icon with orange dot badge (`bg-[#FF7F11]`, `w-2 h-2 rounded-full`) |
| User dropdown | Always | DropdownMenu with Profile, Support, Separator, Logout |

### User Dropdown Items

| Item | Icon | Action | Special Styling |
|---|---|---|---|
| Profile | `User` icon | Navigate to `/student/profile` | — |
| Support | `HelpCircle` icon | Navigate to `/student/support` | — |
| — Separator — | | | |
| Logout | `LogOut` icon | Calls `logout()` | `text-red-500` |

---

## 11. Student Routes

| Path | Page Component | Description |
|---|---|---|
| `/student` | Dashboard | Main overview with metrics, charts, progress |
| `/student/courses` | Courses List | Accordion list of enrolled courses |
| `/student/courses/:slug` | Course Detail | Video player, modules, quizzes, docs, flashcards |
| `/student/final-examinations` | Final Examinations | Table of exams with status, scores, actions |
| `/student/certificates` | Certificates | List of earned certificates |
| `/student/live-classes` | Live Classes | Upcoming/active live class sessions |
| `/student/recordings` | Recordings | Video recordings grouped by course |
| `/student/profile` | Profile | Personal info edit + password change |
| `/student/feedback` | Feedback | Course feedback forms with star ratings |
| `/student/support` | Support | Contact form + contact info |
| `/student/debug` | Debug | Auth/data debug panel (dev only) |

---

## 12. Page-by-Page Specs

### 12.1 Dashboard (`/student`)

**Layout:** 12-column bento grid on desktop

```
┌─────────────────────────────────────────────────────┐
│ Welcome, {name}! 👋  [Course selector horizontal]    │
├───────────┬──────────────┬──────────────────────────┤
│ Continue  │ Overall      │ Quick Stats (2x2 grid)   │
│ Learning  │ Progress     │  - Modules completed     │
│ (blue     │ (green       │  - Quizzes passed        │
│ gradient) │ gradient,    │  - Avg score             │
│           │ gauge chart) │  - Study streak          │
├───────────┼──────────────┤                          │
│ Module    │ Skill        ├──────────────────────────┤
│ Progress  │ Mastery      │ Learning Goals           │
│ (purple   │ (cyan        │                          │
│ gradient, │ gradient,    │                          │
│ bar chart)│ radar chart) │                          │
├───────────┴──────────────┼──────────────────────────┤
│ Performance Scorecard    │ Final Exam Status        │
│                          │ (amber gradient)         │
├──────────────────────────┼──────────────────────────┤
│ Weekly Comparison        │ Session Duration         │
│ (bar chart)              │                          │
└──────────────────────────┴──────────────────────────┘
```

**Card Pattern (repeated across dashboard):**

```tsx
<div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-{color}-50 via-{color}-50/80 to-{color2}-50 p-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2.5 rounded-xl bg-{color}-100">
      <Icon className="size-5 text-{color}-600" />
    </div>
    <div>
      <h3 className="font-heading font-semibold text-slate-800 text-lg">Title</h3>
      <p className="text-sm text-slate-500">Subtitle</p>
    </div>
  </div>
  {/* Card content: chart, progress bar, stats, etc. */}
</div>
```

**Course Selector (horizontal scroll):**

```
Container: flex gap-3 overflow-x-auto pb-2 scrollbar-hide
Each course pill:
  px-4 py-2 rounded-full text-sm font-medium transition-all
  Active: bg-[#18548b] text-white shadow-md
  Inactive: bg-white border border-slate-200 text-slate-600 hover:border-[#18548b]/30
```

**Loading State:** Full skeleton layout mimicking the bento grid with `animate-pulse` blocks

---

### 12.2 Courses List (`/student/courses`)

**Layout:** Single column, centered, max-width container

**Structure:**

```
┌──────────────────────────────────────┐
│ My Courses           (X courses)     │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ [Step Badge] Course Title    ▼   │ │
│ │              Type Badge          │ │
│ │              X/Y modules         │ │
│ ├──────────────────────────────────┤ │
│ │ (Expanded content)               │ │
│ │ Description (line-clamp-4)       │ │
│ │ ┌─────┬─────┬─────┬─────┐      │ │
│ │ │Enrol│Valid │Mods │Time │      │ │
│ │ │date │until │count│left │      │ │
│ │ └─────┴─────┴─────┴─────┘      │ │
│ │ ██████████░░░░ 65%               │ │
│ │ [Continue Learning]              │ │
│ └──────────────────────────────────┘ │
│                                      │
│ (more courses...)                    │
└──────────────────────────────────────┘
```

**Accordion Item Styling:**

```
Collapsed:
  rounded-2xl border border-slate-200 hover:border-slate-300
  transition-all duration-300

Expanded:
  border-2 border-blue-200 bg-blue-50/30

Step Badge:
  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
  Completed: bg-green-100 text-green-600 (with CheckCircle)
  In Progress: bg-blue-100 text-blue-600

Course Type Badge:
  Standalone: bg-blue-100 text-blue-700
  With MBA: bg-purple-100 text-purple-700

Stats Grid: grid grid-cols-2 md:grid-cols-4 gap-4

Progress Bar:
  Container: h-2 rounded-full bg-slate-200
  Fill: bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all

CTA Button:
  < 100%: "Continue Learning" (default variant, blue)
  = 100%: "Review Course" (outline variant)
```

**Empty State:**

```
<div className="text-center py-12">
  <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-4" />
  <h3 className="text-lg font-semibold text-slate-700">No courses found</h3>
  <p className="text-slate-500">You haven't been enrolled in any courses yet.</p>
</div>
```

---

### 12.3 Course Detail (`/student/courses/:slug`)

This is the most complex page. Multi-section layout:

**Desktop Layout:**

```
┌──────────────────────────────────────────────────────┐
│ ← Back to Courses    Course Title    Progress Ring   │
├──────────────────────┬───────────────────────────────┤
│ Module Sidebar       │ Video Player (ReactPlayer)     │
│ (ScrollArea)         │                               │
│                      ├───────────────────────────────┤
│ Module 1 (expanded)  │ Tab Navigation                │
│  ├ Video 1 ●         │ [Videos] [Documents] [Quizzes]│
│  ├ Video 2           │ [Flashcards]                  │
│  └ Video 3           │                               │
│                      │ Tab Content Area              │
│ Module 2 (collapsed) │ (varies by active tab)        │
│ Module 3 (collapsed) │                               │
│                      │                               │
└──────────────────────┴───────────────────────────────┘
```

**Module Sidebar:**

```
Each module: Accordion item
  Header: flex items-center gap-3
    Mini progress ring (SVG circle, 24x24)
    Module name (text-sm font-medium)
    Chevron (rotates on expand)

  Content: List of items
    Each item: flex items-center gap-2 py-2 px-3 rounded-lg
      Current: bg-blue-50 text-blue-700
      Completed: text-green-600 (CheckCircle icon)
      Locked: text-slate-400 opacity-50 (Lock icon)
```

**Content Tabs:**

```
Tab list: flex gap-2 border-b border-slate-200
Each tab: px-4 py-2 text-sm font-medium
  Active: border-b-2 border-[#18548b] text-[#18548b]
  Inactive: text-slate-500 hover:text-slate-700

Tabs: Videos, Documents, Quizzes, Flashcards
```

**Video Player:**

```
Wrapper: rounded-xl overflow-hidden bg-black aspect-video
Player: ReactPlayer (width: 100%, height: 100%)
Below: Video title, watch time display
```

**Document Viewer:**

```
Document type icons (color-coded):
  PDF: FileText text-red-500
  PPT/PPTX: Presentation text-orange-500
  XLS/XLSX/CSV: FileSpreadsheet text-green-500
  DOC/DOCX: File text-blue-500
  Images: FileImage text-purple-500

Viewer types:
  PDF: iframe embed
  CSV: Parsed into Table component
  Google Docs/Slides: Embedded viewer
  Images: <img> with object-contain
```

**Quiz Section:**

```
Quiz list: Grid of quiz cards
Each card:
  rounded-xl border p-4
  Quiz name, question count, status badge
  "Start Quiz" / "Retake" button

Quiz Form (when taking):
  Question display with 4 options (RadioGroup)
  Navigation: Previous / Next buttons
  Submit button with confirmation dialog
  Results: Color-coded answers (green=correct, red=wrong)
  Explanation text expandable
```

**Flashcard Section:**

```
Generation UI:
  Step progress indicator
  "Generate Flashcards" button

Viewer:
  Flip card (front/back with 3D transform)
  Confidence rating buttons
  Card counter (X/Y)
  Navigation arrows
```

**Voice Agent (floating button):**

```
Trigger: Fixed position button or icon in course detail
Opens: VoiceAgentModal (Dialog component)
  WebSocket connection to /ws/voice
  Message history (scrollable)
  Mic toggle, speaker toggle
  Text input fallback
  Agent states: idle, listening, thinking, speaking
```

---

### 12.4 Live Classes (`/student/live-classes`)

```
┌──────────────────────────────────────┐
│ Live Classes                         │
│ Join your scheduled live sessions    │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ 🎥 Class Title                   │ │
│ │    Course Name                   │ │
│ │ 📅 Jan 20, 2024 at 2:00 PM      │ │
│ │ ⏱ Duration: 60 min              │ │
│ │ "Starting soon" (badge, if <15m) │ │
│ │ Description text                 │ │
│ │ [Join Class] or [Disabled]       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ (more classes...)                    │
└──────────────────────────────────────┘
```

**Class Card:**

```
Card with border, rounded-lg
Left: Video icon (h-10 w-10 text-blue-500)
Right:
  Title: text-lg font-semibold
  Course: text-sm text-muted-foreground
  Time: CalendarClock icon + formatted date
  Duration badge: bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs
  "Starting soon" badge: bg-green-100 text-green-700 (shown if within 15 minutes)
  Join button:
    Can join: bg-green-600 hover:bg-green-700 text-white
    Cannot join: disabled, bg-slate-100 text-slate-400
    Ended: disabled, "Session ended"
```

---

### 12.5 Recordings (`/student/recordings`)

```
┌──────────────────────────────────────┐
│ Recordings                           │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ 🔍 Search    [Course ▼]         │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ▶ Video Player (selected)        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Course Name                          │
│   Module 1                           │
│   ┌────────┬────────┬────────┐      │
│   │ Rec 1  │ Rec 2  │ Rec 3  │      │
│   └────────┴────────┴────────┘      │
│                                      │
│ Course Name 2                        │
│   Module 1                           │
│   ┌────────┬────────┬────────┐      │
│   │ Rec 1  │ Rec 2  │ Rec 3  │      │
│   └────────┴────────┴────────┘      │
└──────────────────────────────────────┘
```

**Recording Card:**

```
rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow
Title: text-sm font-medium line-clamp-2
Description: text-xs text-muted-foreground line-clamp-2
Date: text-xs text-slate-400
Play button overlay or icon
Active/selected: ring-2 ring-blue-500
Grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
```

---

### 12.6 Final Examinations (`/student/final-examinations`)

```
┌──────────────────────────────────────────────────────┐
│ Final Examinations                  (X courses)      │
├──────────────────────────────────────────────────────┤
│ 🔍 Search exams...                                   │
├──────────────────────────────────────────────────────┤
│ Table:                                               │
│ Course | Exam | Status | Score | Attempts | Actions  │
│ ───────┼──────┼────────┼───────┼──────────┼────────  │
│ Math   │ Mid  │ Passed │ 85%   │ 1/3      │ [View]   │
│ CS101  │ Final│ Pending│ -     │ 0/3      │ [Take]   │
│ ...    │      │        │       │          │          │
└──────────────────────────────────────────────────────┘
```

**Status Badges:**

| Status | Badge Classes |
|---|---|
| Not Attempted | `bg-slate-100 text-slate-600` |
| Under Review | `bg-yellow-100 text-yellow-700` |
| Passed | `bg-green-100 text-green-700` |
| Failed | `bg-red-100 text-red-700` |
| Pending | `bg-blue-100 text-blue-700` |

**Exam Type Badges:**

| Type | Badge Classes |
|---|---|
| MCQ | `bg-blue-100 text-blue-700` |
| Essay | `bg-purple-100 text-purple-700` |
| Mixed | `bg-indigo-100 text-indigo-700` |

**Attempt Detail Modal (Dialog):**

```
DialogContent with max-w-2xl
  Attempt metadata grid (2-col):
    Score, Status, Submitted date, Graded date
  Teacher feedback card (if available):
    bg-amber-50 border border-amber-200 rounded-lg p-4
  Questions section:
    MCQ: Radio options with green (correct) / red (incorrect) highlighting
    Essay: Question document link + student answer text
```

**Exam Form (FinalExamForm):**

```
Full-page takeover or large card
Question navigation: Previous / Next with question counter
MCQ: RadioGroup with 4 options
Essay: Textarea + file upload (Cloudinary)
Confirmation dialog before submit
Timer display (if timed)
```

---

### 12.7 Certificates (`/student/certificates`)

```
┌──────────────────────────────────────┐
│ My Certificates                      │
├──────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┐  │
│ │ Total    │ Active   │ Avg      │  │
│ │ Earned   │          │ Score    │  │
│ │ 5 🏆     │ 4 🟢     │ 88% 📊   │  │
│ │ emerald  │ blue     │ amber    │  │
│ └──────────┴──────────┴──────────┘  │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🏆 Certificate #AGI-2024-001    │ │
│ │    Course: Mathematics 101       │ │
│ │    Status: Issued ✅              │ │
│ │ ┌──────┬────────┬───────┬─────┐ │ │
│ │ │Score │Issued  │Issuer │Att. │ │ │
│ │ │85%   │Jan 2024│Admin  │1    │ │ │
│ │ └──────┴────────┴───────┴─────┘ │ │
│ │ [View] [Download] [Verify]       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ (more certificates...)               │
└──────────────────────────────────────┘
```

**Summary Stat Cards:**

```
3-column grid (grid-cols-1 sm:grid-cols-3 gap-4)
Each: rounded-2xl p-6
  Emerald: bg-emerald-50 border-emerald-200
  Blue: bg-blue-50 border-blue-200
  Amber: bg-amber-50 border-amber-200
  Icon in matching color
  Number: text-3xl font-bold
  Label: text-sm text-muted-foreground
```

**Certificate Card:**

```
rounded-2xl border bg-white p-6
  Left: Trophy icon in colored circle
  Content: Certificate number, course name
  Status badge: Issued (green), Revoked (red), Expired (yellow)
  Stats: 4-column grid
  Actions: Button group (View, Download, Verify — each with icon)
```

---

### 12.8 Profile (`/student/profile`)

```
┌────────────────────┬────────────────────┐
│ Personal Info      │ Change Password    │
│                    │                    │
│ Name: John Doe     │ [Change Password]  │
│ Email: j@d.com     │                    │
│ Phone: +1234       │ (When toggled:)    │
│ Address: 123 St    │ Old Password       │
│ DOB: Jan 1, 1990   │ New Password       │
│ Pathway: MBA       │ Confirm Password   │
│                    │ [Eye toggle icons] │
│ [Edit Profile]     │ [Update] [Cancel]  │
│                    │                    │
│ (Edit mode:)       │                    │
│ Name [input]       │                    │
│ Phone [input]      │                    │
│ Address [input]    │                    │
│ [Save] [Cancel]    │                    │
└────────────────────┴────────────────────┘
```

**Layout:** `grid grid-cols-1 md:grid-cols-2 gap-6`

**Personal Info Card:**

```
Card with CardHeader + CardContent
Display mode: Label-value pairs
  Label: text-sm font-medium text-muted-foreground
  Value: text-base text-foreground
Edit mode: Form inputs
  Input components from shadcn/ui
  Save button (with Loader2 spinner when submitting)
  Cancel button (outline variant)
```

**Password Card:**

```
Toggle button to show/hide form
Form fields with Eye/EyeOff toggle for visibility
  Input type switches between "password" and "text"
Validation errors shown inline (text-sm text-destructive)
```

---

### 12.9 Feedback (`/student/feedback`)

**Two views:**

**View 1: Course List**

```
Header: Progress indicator (X/Y courses reviewed)
Warning alert (if pending feedback): AlertTriangle icon, amber border
Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

Course Card:
  rounded-xl border p-6
  Course title (font-semibold)
  Teacher count
  Completion badge:
    Done: bg-green-100 text-green-700 (CheckCircle icon)
    Pending: bg-yellow-100 text-yellow-700 (Clock icon)
  Teacher list: flex flex-wrap gap-2 of badges
  CTA: "Provide Feedback" or "View/Edit Feedback"

All complete: Success card with green background + message
```

**View 2: Feedback Form (CourseFeedbackForm)**

```
Back button: ← Back to courses
Student info display: Name, Email, Phone (read-only)

Star Rating Component:
  5 stars in a row
  Each star: cursor-pointer size-8
  Filled: text-yellow-400 fill-yellow-400
  Empty: text-slate-300
  Hover: Scale effect

Rating categories:
  - Overall Course Rating
  - Content Quality
  - Teaching Quality (per teacher)
  - Platform Experience

Feedback textarea:
  min 50 words
  Word count display below (text-xs text-muted-foreground)

Submit: Button with loading state
```

---

### 12.10 Support (`/student/support`)

```
┌──────────────────────────┬──────────────────┐
│ Contact Us               │ Contact Info      │
│                          │                  │
│ Support Type:            │ 📧 Email          │
│ ○ Technical              │ support@agi.org  │
│ ○ Course Content         │                  │
│ ○ Billing                │ 📞 Phone          │
│ ○ Other                  │ +1-234-567-890   │
│                          │                  │
│ Name: [input]            │ 📍 Address        │
│ Email: [input]           │ 123 Education St │
│ Message: [textarea]      │                  │
│                          │ 🎓 Campus         │
│ [Send Message]           │ Main Campus      │
└──────────────────────────┴──────────────────┘
```

**Layout:** `grid grid-cols-1 lg:grid-cols-3 gap-6` (form takes 2 cols, info takes 1)

**Support Type:** RadioGroup with RadioGroupItem

**Contact Info Card:**

```
Each item:
  Icon in colored circle (size-10 rounded-full bg-{color}-100)
  Label: text-sm font-medium text-muted-foreground
  Value: text-base font-medium
```

---

### 12.11 Debug (`/student/debug`)

Developer-only page. Two-column grid with:
- Action buttons (Fetch Dashboard Data, Fetch Courses Data)
- Error display card (red border)
- Auth data card (pre-formatted JSON)
- Dashboard/Courses data cards (pre-formatted JSON)

All JSON displayed in `<pre>` with `text-xs whitespace-pre-wrap`

---

## 13. Shared UI Components

All components follow the shadcn/ui pattern: Radix UI primitive + Tailwind classes + CVA variants.

### Button

```
Variants:
  default:  bg-primary text-primary-foreground hover:bg-primary/90
  destructive: bg-destructive text-destructive-foreground hover:bg-destructive/90
  outline: border border-input bg-background hover:bg-accent hover:text-accent-foreground
  secondary: bg-secondary text-secondary-foreground hover:bg-secondary/80
  ghost: hover:bg-accent hover:text-accent-foreground
  link: text-primary underline-offset-4 hover:underline

Sizes:
  default: h-10 px-4 py-2
  sm: h-9 rounded-md px-3
  lg: h-11 rounded-md px-8
  icon: h-10 w-10

All: inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
Focus: ring-2 ring-ring ring-offset-2
Disabled: disabled:pointer-events-none disabled:opacity-50
```

### Card

```
Card: rounded-lg border bg-card text-card-foreground shadow-sm
CardHeader: flex flex-col space-y-1.5 p-6
CardTitle: text-2xl font-semibold leading-none tracking-tight
CardDescription: text-sm text-muted-foreground
CardContent: p-6 pt-0
CardFooter: flex items-center p-6 pt-0
```

### Badge

```
Base: inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold

Variants:
  default: border-transparent bg-primary text-primary-foreground
  secondary: border-transparent bg-secondary text-secondary-foreground
  destructive: border-transparent bg-destructive text-destructive-foreground
  outline: text-foreground (border only)
```

### Input

```
h-10 w-full rounded-md border border-input bg-background px-3 py-2
text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium
placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```

### Textarea

```
min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2
text-sm placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```

### Select

```
Trigger: h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
  ChevronDown icon on right
Content: z-50 rounded-md border bg-popover shadow-md
  Animation: fade-in-0 fade-out-0 zoom-in-95 zoom-out-95
Item: px-2 py-1.5 text-sm cursor-pointer
  Selected: Checkmark icon on left
```

### Dialog

```
Overlay: fixed inset-0 z-50 bg-black/80
  Animation: fade-in-0 / fade-out-0
Content: fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]
  max-w-lg w-full p-6 rounded-lg border bg-background shadow-lg
  Animation: fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]
Close button: absolute right-4 top-4 (X icon)
```

### Table

```
Table: w-full caption-bottom text-sm
TableHeader: [&_tr]:border-b
TableHead: h-12 px-4 text-left align-middle font-medium text-muted-foreground
TableBody: [&_tr:last-child]:border-0
TableRow: border-b transition-colors hover:bg-muted/50
TableCell: p-4 align-middle
```

### Progress

```
Container: h-4 w-full overflow-hidden rounded-full bg-secondary
Indicator: h-full bg-primary transition-all
  Width set by style={{ transform: `translateX(-${100 - value}%)` }}
```

### Skeleton

```
animate-pulse rounded-md bg-muted
```

### Alert

```
Variants:
  default: bg-background text-foreground
  destructive: border-destructive/50 text-destructive

Base: relative w-full rounded-lg border p-4
AlertTitle: mb-1 font-medium leading-none tracking-tight
AlertDescription: text-sm [&_p]:leading-relaxed
```

### Accordion

```
AccordionItem: border-b
AccordionTrigger: flex flex-1 items-center justify-between py-4 font-medium
  ChevronDown icon rotates 180deg on open
  transition-all
AccordionContent: overflow-hidden text-sm
  animate-accordion-down (open) / animate-accordion-up (close)
```

### Tabs

```
TabsList: inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground
TabsTrigger: inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium
  Active: bg-background text-foreground shadow-sm
TabsContent: mt-2
```

### ScrollArea

```
Custom scrollbar styling, Radix ScrollArea primitive
Thumb: bg-border rounded-full
```

### Tooltip

```
TooltipContent: z-50 rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md
  Animation: fade-in-0 zoom-in-95
  sideOffset: 4px
```

### Form (react-hook-form integration)

```
FormItem: space-y-2
FormLabel: text-sm font-medium (error: text-destructive)
FormControl: wraps the input
FormDescription: text-sm text-muted-foreground
FormMessage: text-sm font-medium text-destructive
```

### Progress Ring (custom SVG)

```tsx
// SVG circular progress indicator
<svg width={size} height={size}>
  {/* Background circle */}
  <circle cx="50%" cy="50%" r={radius}
    fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
  {/* Progress circle */}
  <circle cx="50%" cy="50%" r={radius}
    fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
    strokeDasharray={circumference}
    strokeDashoffset={circumference - (value / 100) * circumference}
    strokeLinecap="round"
    transform={`rotate(-90 ${center} ${center})`}
    className="transition-all duration-700" />
  {/* Center text */}
  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
    {value}%
  </text>
</svg>
```

---

## 14. Chart Components

All charts live in the student components directory. They use a mix of Recharts and custom SVG.

### GaugeChart (Overall Progress)

```
SVG-based semicircular gauge
Background arc: stroke-slate-200
Progress arc: Gradient from blue to green based on percentage
Center: Large percentage number
Below: Label text
Animation: Smooth stroke-dashoffset transition on mount
```

### ModuleProgressChart (Bar Chart)

```
Horizontal bars showing each module's completion percentage
Each bar:
  Label on left: Module name (truncated)
  Bar: rounded-full, height ~8px
    Background: bg-slate-200
    Fill: bg-gradient-to-r from-blue-500 to-indigo-500
  Percentage on right
```

### SkillMasteryChart (Radar)

```
Uses ECharts radar component
Categories on each axis: Different skill areas
Fill: Semi-transparent blue
Border: Solid blue line
Points: Dots at each vertex
```

### WeeklyActivityChart (Bar Chart)

```
Recharts BarChart
7 bars for each day of the week
Fill: hsl(var(--chart-1))
Rounded bar tops
X-axis: Day labels
Y-axis: Minutes/hours
Tooltip on hover
```

### MiniAreaChart (Sparkline)

```
Small inline area chart (no axes)
Fill: Gradient from primary to transparent
Line: Primary color
Used inside stat cards for trends
```

### PerformanceScorecard

```
Multi-metric display card
Metrics in a row/grid:
  Each: Icon + label + value
  Values: Large number with unit
  Trend indicator: ArrowUp (green) or ArrowDown (red)
```

### LearningGoalsCard

```
List of goals with progress
Each goal:
  Title + target
  Progress bar with percentage
  Status indicator (on track / behind)
```

---

## 15. Interactive Components

### QuizForm

```
States: intro → taking → results

Intro:
  Quiz name, question count, instructions
  "Start Quiz" button

Taking:
  Question counter: "Question X of Y"
  Question text: text-lg font-medium
  Options: RadioGroup
    Each option: rounded-lg border p-4 cursor-pointer
      hover:bg-slate-50
      Selected: border-blue-500 bg-blue-50
  Navigation: flex justify-between
    Previous (outline) / Next (default)
  Submit: Confirmation dialog before final submit

Results:
  Score display: Large percentage + pass/fail badge
  Question review (paginated, 4 per page):
    Question text
    Options with color coding:
      Correct answer: bg-green-50 border-green-500
      Wrong selection: bg-red-50 border-red-500
      Unselected correct: bg-green-50 border-green-300 (dashed)
    Explanation: Expandable text below each question
  Pagination: Page numbers + prev/next
```

### FlashcardViewer

```
Card flip animation (CSS 3D transform):
  perspective: 1000px on container
  Card: transition-transform duration-500
  Front → Back: rotateY(180deg)
  backface-visibility: hidden on both sides

Front: Question text centered
Back: Answer text centered

Controls:
  ← Previous | Card X/Y | Next →
  Confidence buttons: "Again" (red), "Hard" (orange), "Good" (blue), "Easy" (green)
  
Filtering: By confidence level, by module
Sorting: Random, sequential, by confidence
```

### VoiceAgentModal

```
Dialog with ScrollArea
Header: "AI Voice Assistant" + connection status badge
  Connected: bg-green-100 text-green-700
  Connecting: bg-yellow-100 text-yellow-700
  Disconnected: bg-red-100 text-red-700

Message history:
  User messages: bg-blue-50 rounded-lg p-3, aligned right
  Assistant messages: bg-slate-50 rounded-lg p-3, aligned left
  System messages: text-xs text-center text-muted-foreground

Agent state indicator:
  idle: Nothing
  listening: Pulsing mic icon
  thinking: Animated dots
  speaking: Sound wave animation

Controls:
  Mic button: rounded-full size-12
    Active: bg-red-500 text-white (recording)
    Inactive: bg-slate-100 text-slate-600
  Speaker toggle: Mute/unmute
  Text input: Input + Send button (Send icon)

Auto-scroll: Scrolls to bottom on new message
```

### DocumentViewers

```
PDF: <iframe src={url} className="w-full h-[600px] rounded-lg border" />

CSV: Parsed and rendered as Table component
  Fixed header row
  Scrollable body
  Alternating row colors

Google Docs/Slides: <iframe src="https://docs.google.com/..." />

Image: <img className="max-w-full max-h-[600px] object-contain mx-auto rounded-lg" />

ExplanationPanel (AI-powered):
  Loading: Animated skeleton with shimmer
  Content: Rendered markdown/text
  Buttons: "Refresh Explanation" with RefreshCw icon
  Error: Alert with retry button
```

---

## 16. Loading, Empty & Error States

### Loading Patterns

**Full Page Loading:**
```tsx
<div className="flex items-center justify-center min-h-[400px]">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
```

**Skeleton Cards:**
```tsx
<div className="space-y-4">
  <Skeleton className="h-8 w-48" />       {/* Title */}
  <Skeleton className="h-4 w-full" />     {/* Text line */}
  <Skeleton className="h-4 w-3/4" />      {/* Shorter line */}
  <Skeleton className="h-32 w-full" />    {/* Content block */}
</div>
```

**BarLoader (custom):**
```
5 vertical bars with staggered barLoader animation
Each bar: w-1 bg-primary rounded-full
Delay offset: 0s, 0.1s, 0.2s, 0.3s, 0.4s
```

**Button Loading:**
```tsx
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Empty States

```
Consistent pattern across all pages:

<div className="text-center py-12">
  <{Icon} className="h-12 w-12 mx-auto text-slate-300 mb-4" />
  <h3 className="text-lg font-semibold text-slate-700 mb-1">{Title}</h3>
  <p className="text-sm text-slate-500">{Description}</p>
  {/* Optional action button */}
</div>

Examples:
  Courses: BookOpen icon, "No courses found"
  Live Classes: Video icon, "No live classes scheduled"
  Recordings: FileVideo icon, "No recordings available"
  Certificates: Award icon, "No certificates earned yet"
```

### Error States

**RetroTvError Component:**
```
Custom animated retro TV graphic
  Wood-colored TV body
  Screen with colorful test pattern bars
  Antenna with rotating dials
  CRT scanline effect overlay
  Large background error code
  Error message overlaid on screen
  Responsive scaling: scale(0.65) on mobile
Used for 404/not-found pages
```

**Inline Errors:**
```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>{error.message}</AlertDescription>
</Alert>
```

**Error with Retry:**
```tsx
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 mx-auto text-red-300 mb-4" />
  <h3 className="text-lg font-semibold text-slate-700 mb-2">Something went wrong</h3>
  <p className="text-sm text-slate-500 mb-4">{error.message}</p>
  <Button variant="outline" onClick={refetch}>
    <RefreshCw className="mr-2 h-4 w-4" />
    Try Again
  </Button>
</div>
```

---

## 17. Forms & Validation

### Pattern

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input placeholder="..." {...field} />
          </FormControl>
          <FormMessage />  {/* Auto-shows validation error */}
        </FormItem>
      )}
    />
    <Button type="submit" disabled={form.formState.isSubmitting}>
      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Submit
    </Button>
  </form>
</Form>
```

### Toast Notifications

```tsx
const { toast } = useToast();

// Success
toast({ title: "Success", description: "Your changes have been saved." });

// Error
toast({ title: "Error", description: message, variant: "destructive" });
```

Toast appears in bottom-right, auto-dismisses, one at a time.

---

## 18. Responsive Design Patterns

### Breakpoints

| Prefix | Width | Usage |
|---|---|---|
| (default) | 0px+ | Mobile-first base styles |
| `sm:` | 640px+ | Small devices |
| `md:` | 768px+ | Tablet, sidebar visible |
| `lg:` | 1024px+ | Desktop, wider grids |
| `xl:` | 1280px+ | Large desktop |
| `2xl:` | 1440px+ | Container max-width |

### Common Responsive Patterns

```css
/* Stack → Side by side */
flex flex-col md:flex-row

/* Full → Half width */
w-full md:w-1/2

/* Single → Multi column grid */
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

/* Dashboard bento: 12-col on desktop */
grid grid-cols-1 lg:grid-cols-12

/* Responsive padding */
p-4 md:p-6

/* Responsive text */
text-lg md:text-2xl

/* Hide/show at breakpoints */
hidden md:flex    (show on desktop)
md:hidden         (show on mobile only)
```

### Mobile-Specific Behaviors

1. **Sidebar:** Hidden, slides in as overlay from left
2. **Header:** Shows hamburger menu, hides time display
3. **Grids:** Collapse to single column
4. **Tables:** Horizontal scroll wrapper
5. **Cards:** Full width, reduced padding
6. **Modals:** Full-screen on mobile (DialogContent responsive)

---

## 19. Accessibility

### Focus Management

```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

Custom focus ring:
```css
*:focus-visible {
  outline: 3px solid hsl(var(--color-accent-500) / 0.5);
  outline-offset: 2px;
}
```

### ARIA

- All form fields use proper `<label>` associations via FormLabel
- Alerts use `role="alert"`
- Disabled states: `aria-disabled`, `disabled` attribute
- Interactive elements: proper `button`, `link` roles via semantic HTML
- Radix UI components provide built-in ARIA support

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### GPU Acceleration

```css
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}
.quiz-container { transform: translateZ(0); /* GPU acceleration */ }
.quiz-container input[type="radio"] { transform: translateZ(0); transition-all 200ms; }
```

---

## 20. Icons

All icons from **lucide-react**. Standard sizing:

| Context | Size Class | Pixels |
|---|---|---|
| Nav items | `size-5` | 20x20 |
| Small inline | `size-4` or `h-4 w-4` | 16x16 |
| Card header icons | `size-5` | 20x20 |
| Empty state icons | `h-12 w-12` | 48x48 |
| Large decorative | `h-16 w-16` | 64x64 |

### Icon Inventory by Category

**Navigation:**
`LayoutDashboard`, `BookOpen`, `GraduationCap`, `Award`, `Settings`, `HelpCircle`, `MessageSquare`

**Status:**
`CheckCircle`, `XCircle`, `Clock`, `AlertCircle`, `AlertTriangle`

**Media:**
`Play`, `PlayCircle`, `Video`, `Film`, `FileVideo`, `Monitor`

**Documents:**
`FileText`, `Presentation`, `FileSpreadsheet`, `FileImage`, `File`

**Actions:**
`ChevronRight`, `ChevronDown`, `ChevronLeft`, `ArrowLeft`, `ArrowUp`, `ArrowDown`, `Eye`, `EyeOff`, `Download`, `ExternalLink`, `RefreshCw`, `Send`, `Filter`, `Search`, `X`

**Learning:**
`Trophy`, `Target`, `Sparkles`, `Zap`, `Brain`, `Lightbulb`, `Cpu`

**Communication:**
`Phone`, `Mic`, `MicOff`, `Mail`, `Volume2`, `VolumeX`

**Time:**
`Clock`, `CalendarClock`, `Calendar`, `CalendarDays`

**User:**
`User`, `LogOut`, `PanelLeftClose`, `PanelLeftOpen`, `Menu`, `Bell`

**Misc:**
`Loader2` (spinner), `Star` (ratings), `MapPin` (location)

---

## 21. Auth & Data Fetching

### Authentication Context

```typescript
interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; username: string; email: string; role: string } | null;
  student: { id: string; name: string; pathway: string } | null;
  userRole: 'admin' | 'student' | 'superadmin' | 'teacher';
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

- JWT stored in `localStorage`
- Validated on mount via `GET /api/auth/me`
- Token injected as `Authorization: Bearer {token}` on all API requests

### Permissions Context

```typescript
interface PermissionsContext {
  canEdit: boolean;        // admin only
  canCreate: boolean;      // admin only
  canDelete: boolean;      // admin only
  canGradeExams: boolean;  // teacher + admin
  canScheduleLiveClasses: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isViewOnly: boolean;     // superadmin
}
```

Students have: all permissions `false`, `isViewOnly: false`

### React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: { retry: false },
  },
});
```

### API Request Helper

```typescript
// Automatic auth token injection
async function apiRequest(url: string, options?: RequestInit) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  if (!response.ok) throw new Error(await response.text());
  return response;
}
```

### Data Fetching Pattern

```typescript
// In components:
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/student/dashboard'],
  queryFn: getQueryFn({ on401: 'returnNull' }),
});
```

---

## 22. Custom Scrollbars

### Student Dashboard Scrollbar

```css
.student-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.student-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.student-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;  /* slate-300 */
  border-radius: 3px;
}
.student-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;  /* slate-400 */
}
```

### Hidden Scrollbar

```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

---

## 23. Z-Index Scale

```css
--z-base: 0;
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
```

**Component Z-Index in Practice:**

| Element | Z-Index |
|---|---|
| Sidebar | `z-20` |
| Header | `z-30` |
| Mobile overlay | `z-40` |
| Mobile sidebar | `z-50` |
| Dialog overlay | `z-50` |
| Dialog content | `z-50` |
| Dropdown/Select | `z-50` |
| Tooltip | `z-50` |
| Toast | `z-[100]` |

---

## Utility Functions

```typescript
// Class name composition (clsx + tailwind-merge)
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Text truncation
function truncateText(text: string, maxLength: number): string;

// Name initials
function getInitials(name: string): string;

// Date formatting
function formatDate(date: Date | string): string;       // "January 15, 2024"
function formatTime(date: Date | string): string;       // "2:30 PM"
function formatDateTime(date: Date | string): string;   // Combined
function formatTimeRemaining(endDate: Date): string;    // "3 months"
function getDaysRemaining(endDate: Date): number;

// Watch time
function formatWatchTime(seconds: number): string;      // "2h 15m"

// Progress
function calculateProgress(completed: number, total: number): number; // 0-100

// Course type
function formatCourseType(type: string): string;        // 'standalone' → 'Standalone'
```

---

## Base Layer Styles

```css
@layer base {
  * { @apply border-border; }
  body { @apply font-sans antialiased bg-background text-foreground; }

  .dashboard-card {
    @apply transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg;
  }

  .sidebar-item.active {
    @apply bg-accent/10 border-l-2 border-primary;
  }
}
```

---

## Implementation Notes

1. **All CSS variables use HSL values without `hsl()` wrapper** — they're consumed as `hsl(var(--variable))` in Tailwind config.

2. **shadcn/ui components are copied into the project** (not installed as a package). Each lives in `components/ui/` and can be customized.

3. **The `cn()` utility is essential** — it merges Tailwind classes properly, resolving conflicts. Import from your utils file.

4. **Dark mode is class-based** — toggle `.dark` on the root element. `next-themes` handles this via `ThemeProvider`.

5. **Tailwind plugins required:** `tailwindcss-animate` (for data-state animations) and `@tailwindcss/typography` (for prose content).

6. **Chart libraries:** Recharts for standard charts (bar, area, line), Apache ECharts for radar/gauge. Both are theme-aware.

7. **Framer Motion** is used for staggered card entrance animations and some micro-interactions, but most animations are pure CSS/Tailwind.

8. **All API endpoints follow the pattern** `GET/POST/PUT/DELETE /api/{resource}` with Bearer token auth.

9. **The student sidebar uses a completely custom dark gradient design** — it does NOT use the shadcn/ui Sidebar component or CSS variables. It's a standalone component with hardcoded dark colors.

10. **Toast uses a custom hook** (`useToast`) — not react-hot-toast. It's based on the Radix Toast primitive.
