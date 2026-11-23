---
name: Botanical Roast
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f1eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#444842'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0e9'
  outline: '#747872'
  outline-variant: '#c4c8c0'
  surface-tint: '#536252'
  primary: '#182519'
  on-primary: '#ffffff'
  primary-container: '#2d3b2d'
  on-primary-container: '#95a593'
  inverse-primary: '#bbcbb8'
  secondary: '#7a582f'
  on-secondary: '#ffffff'
  secondary-container: '#fecf9d'
  on-secondary-container: '#79562e'
  tertiary: '#162517'
  on-tertiary: '#ffffff'
  tertiary-container: '#2b3b2c'
  on-tertiary-container: '#93a591'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e7d3'
  primary-fixed-dim: '#bbcbb8'
  on-primary-fixed: '#111f12'
  on-primary-fixed-variant: '#3c4a3c'
  secondary-fixed: '#ffddba'
  secondary-fixed-dim: '#ecbe8e'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#5f401a'
  tertiary-fixed: '#d4e8d2'
  tertiary-fixed-dim: '#b9ccb6'
  on-tertiary-fixed: '#101f11'
  on-tertiary-fixed-variant: '#3a4b3b'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
typography:
  headline-display:
    fontFamily: Playfair Display
    fontSize: 44px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1.25rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system embodies an organic, artisanal coffee culture rooted in natural botanicals, mindful craftsmanship, and calm hospitality. Designed for conscious consumers, specialty coffee enthusiasts, and cafe patrons seeking an unhurried, serene digital ordering experience, the UI cultivates feelings of tranquil luxury, organic purity, and grounded warmth.

The aesthetic fuses **Minimalism** with an **Editorial Earthy Palette**:
- Clean canvas layers washed in oat milk, linen, and warm alabaster stone.
- Contrast driven by deep roasted spruce and forest foliage tones rather than clinical black.
- Subtle botanical illustration accents and airy whitespace that allow food and beverage imagery to stand forward naturally.
- Tactile, gentle pill controls and softly curved surfaces inspired by hand-thrown ceramic ware.

## Colors

The palette draws directly from shade-grown coffee plants, natural wood surfaces, and steamed artisan milks.

- **Primary (`#2D3B2D`)**: Deep forest olive green. Anchors critical actions, hero headers, active tab pills, and prominent interactive triggers.
- **Secondary (`#C49A6C`)**: Warm toasted caramel / aged amber. Used for feature callouts, badges ("Best Seller"), specialty highlights, and secondary accents.
- **Tertiary (`#768875`)**: Muted sage leaf. Serves for subtle botanical motifs, inactive toggle states, and soft supporting cues.
- **Neutral Canvas (`#F4F1EA`)**: Warm linen cream. Forms the root surface, creating a welcoming, non-glare foundation. Secondary surface tiers use `#ECE7DD` and crisp card surfaces utilize `#FAF8F5`.
- **Text & Borders**: High-emphasis type renders in `#1B241B` (roasted woodland ink), medium-emphasis in `#5C6659`, and muted hairline dividers in `#E2DDD2`.

## Typography

The typography pairing reflects an editorial cafe publication:

- **Playfair Display**: Applied to high-prominence headers, section titles ("Our Menu", "Checkout", "Good Coffee, Better Mood"), and item titles. Its transitional serifs bring warmth, authority, and artisanal heritage.
- **Plus Jakarta Sans**: Applied to body copy, UI controls, navigation labels, prices, and forms. Its clean, humanist geometry provides effortless legibility across small digital viewports without detracting from the serif character.
- **Hierarchy Rules**: Editorial titles maintain generous line heights to preserve a spacious, breathing presence. Numeric currencies (`Rp 32.000`) always use `Plus Jakarta Sans` in semibold or bold weight to ensure immediate scannability.

## Layout & Spacing

This design system employs a refined fluid grid with deliberate breathing room to mirror the slow, intentional cafe ambiance:

- **Mobile (< 768px)**: 4-column fluid layout with `1.25rem` outer canvas margin and `1rem` gutters. Product cards appear either as single-column featured hero cards or standard 2-column browse grids.
- **Tablet (768px - 1024px)**: 8-column layout with `2rem` margins and `1.5rem` gutters. Cart and order summaries transition to side-by-side or modal split configurations.
- **Desktop (> 1024px)**: 12-column layout capped at `1200px` max-width with `3rem` margins. The ordering funnel adopts a dual-column arrangement (menu on the left 8 columns, real-time ticket/tray on the right 4 columns).
- **Rhythm & Padding**: Elements prioritize generous vertical gaps (`space-lg` and `space-xl`) between sections, preventing visual congestion and preserving an airy, serene feel.

## Elevation & Depth

Visual hierarchy favors tonal layering, warm ambient under-glows, and crisp ghost borders over harsh dropshadows:

- **Surface Tiers**: Base view canvas is `#F4F1EA`. Contained panels and cards sit on `#FAF8F5` or `#ECE7DD`, creating organic separation through subtle pigment shifts.
- **Ambient Diffusion**: Floating action buttons, active navigation bars, and sticky checkout summaries utilize gentle, tinted ambient shadows: `0 8px 24px -4px rgba(45, 59, 45, 0.08)`.
- **Delicate Outlines**: Form fields, quantity steppers, and resting cards incorporate hairline borders (`1px solid #E2DDD2` or `#D7D1C4`), maintaining definition without imposing rigid heavy frames.
- **Full Bleed Organic Cutouts**: Imagery embraces graceful arched tops or soft asymmetrical curves that interact smoothly with the underlying canvas.

## Shapes

The shape vocabulary evokes smooth ceramic mugs, polished river stones, and organic leaves:

- **Default Radius (`rounded`, 0.5rem / 8px)**: Input inputs, payment option selection tiles, and micro-steppers.
- **Card & Sheet Radius (`rounded-lg`, 1rem / 16px to 1.5rem / 24px)**: Product cards, modal bottom sheets, floating notification banners, and item image containers.
- **Full Pill (`rounded-full`)**: Primary action buttons ("Add to Cart", "Checkout"), category filter chips ("All", "Coffee", "Non-Coffee"), and floating counter badges.

## Components

### Buttons
- **Primary Buttons**: Full pill shape, filled `#2D3B2D` background, `#FFFFFF` or `#F4F1EA` typography, `1rem` vertical padding. Interactive states darken gently to `#243324`.
- **Secondary Buttons**: Ghost pill with `1.5px solid #2D3B2D` outline, `#2D3B2D` label, and transparent interior. Hover fills with `rgba(45, 59, 45, 0.05)`.
- **Icon Actions**: Circular buttons (`40px x 40px` or `32px x 32px`) in deep forest green or neutral cream, used for quantity modifiers (`+` / `-`) and favorite toggles.

### Filter & Category Chips
- Pill silhouette (`rounded-full`) with `0.5rem` vertical and `1.25rem` horizontal padding.
- **Active State**: Solid `#2D3B2D` background with crisp white typography.
- **Inactive State**: Subtle off-cream fill (`#ECE7DD`), transparent border, muted forest text (`#5C6659`).

### Product Cards
- Contained within `#FAF8F5` surfaces with rounded corners (`1.25rem`).
- Elevated with seamless edge-to-edge photography, featuring warm natural lighting and botanical props.
- Bottom details provide an editorial serif title, concise ingredients or tasting notes in muted sans-serif, currency in bold sans-serif, and an anchored circular add button (`+`).
- Special tags ("Best Seller") use soft golden amber pills (`#C49A6C`) placed over the top left of images.

### Quantity Steppers
- Compact pill capsule bordered by `1px solid #E2DDD2`.
- Features circular touch points for minus (`-`) and plus (`+`), flanking a central bold counter value.

### Form Inputs & Selectors
- Background filled with `#FAF8F5` or pure white with a delicate `1px solid #D7D1C4` border.
- Focus states apply a primary green outline (`#2D3B2D`) with zero loud glow.
- Payment selection cards present full-width horizontal rows featuring custom radio tokens, company icon, label, and light selected tinting.

### Badges & Feature Cards
- Square or soft-rounded benefit tiles (e.g., "100% Organic", "Kitchen Active", "Good Vibes") featuring delicate single-weight line icons, centered alignment, and muted earth-tone backgrounds.