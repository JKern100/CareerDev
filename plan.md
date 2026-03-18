# Instagram Share Feature — Implementation Plan

## Overview

Add an attractive "Share on Instagram" option that lets users share their career analysis highlights as a visually appealing Instagram Story or post image. Since Instagram doesn't support direct URL sharing via web (unlike Twitter/Facebook), the approach is to **generate a branded, shareable image** the user can download or share to their Instagram Story.

---

## Strategy

Instagram's API restrictions mean web apps cannot post directly to a user's feed. The practical approaches are:

1. **Generate a branded share card image** (canvas-based) summarizing the user's top career pathway results
2. **Provide a "Share to Instagram Story" deep link** on mobile devices (opens Instagram app)
3. **Provide a download button** so users can save the image and post manually

---

## Implementation Steps

### Step 1: Create the Share Card Component

**File**: `src/components/ShareCard.tsx`

- Build a visually attractive card component using HTML/CSS that displays:
  - CareerDev branding (logo, colors matching the dark theme `#0a0e1a` / `#2563eb`)
  - User's top 3 ranked career pathways with match scores
  - A motivational tagline (e.g., "My next career chapter starts here")
  - A subtle CTA: "Discover yours at careerdev.app"
- Design it as a fixed-size div (1080×1920 for Stories, 1080×1080 for posts)
- Use the existing design system CSS variables for brand consistency

### Step 2: Add Canvas-Based Image Generation

**File**: `src/utils/shareImage.ts`

- Use the **`html2canvas`** library to convert the ShareCard component into a PNG image
- Install dependency: `npm install html2canvas`
- Export a `generateShareImage()` function that:
  1. Renders the ShareCard off-screen
  2. Converts it to a canvas via `html2canvas`
  3. Returns a Blob/data URL for download or sharing

### Step 3: Create the Share Modal / Sheet

**File**: `src/components/InstagramShareModal.tsx`

- A modal overlay triggered from the Results page
- Shows a live preview of the share card
- Two action buttons:
  - **"Share to Instagram Story"** — uses `navigator.share()` Web Share API (mobile) or the Instagram Stories deep link (`instagram-stories://share`) with the image
  - **"Download Image"** — downloads the PNG so users can post it manually
- Includes a toggle to switch between Story format (9:16) and Post format (1:1)
- Styled consistently with the app's dark theme

### Step 4: Add Share Button to Results Page

**File**: `src/app/results/page.tsx` (modify existing)

- Add an Instagram share button (Instagram gradient icon + "Share on Instagram") in the results page header area, near the existing report content
- Button opens the InstagramShareModal
- Only visible after the analysis report has loaded
- Styled as a secondary action button with the Instagram gradient (`linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`)

### Step 5: Add the Instagram Icon

**File**: `src/components/InstagramIcon.tsx`

- Simple SVG component for the Instagram logo icon
- Supports size/color props for reuse

### Step 6: Mobile Deep Link Support

**In**: `src/utils/shareImage.ts`

- Detect mobile vs desktop via `navigator.userAgent` or `navigator.share` availability
- On mobile: attempt `navigator.share({ files: [imageFile] })` which lets users pick Instagram from the native share sheet
- On desktop: fall back to download-only with a tooltip ("Save the image and share it on Instagram")

---

## File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| **Install** | `package.json` | Add `html2canvas` dependency |
| **Create** | `src/components/ShareCard.tsx` | Branded image template component |
| **Create** | `src/components/InstagramShareModal.tsx` | Share preview modal with actions |
| **Create** | `src/components/InstagramIcon.tsx` | Instagram SVG icon |
| **Create** | `src/utils/shareImage.ts` | Image generation + share utilities |
| **Modify** | `src/app/results/page.tsx` | Add share button to results page |

---

## UX Flow

```
User views career results
        │
        ▼
Clicks "Share on Instagram" button (Instagram-gradient styled)
        │
        ▼
Modal opens with live preview of branded share card
  ┌─────────────────────────────────┐
  │  ┌───────────────────────────┐  │
  │  │   🎯 CareerDev            │  │
  │  │                           │  │
  │  │  My Top Career Matches:   │  │
  │  │  1. Project Mgmt — 92%    │  │
  │  │  2. Corporate L&D — 87%   │  │
  │  │  3. HR Business — 81%     │  │
  │  │                           │  │
  │  │  "My next career chapter  │  │
  │  │   starts here"            │  │
  │  │                           │  │
  │  │  careerdev.app            │  │
  │  └───────────────────────────┘  │
  │                                 │
  │  [Story 9:16] [Post 1:1]       │
  │                                 │
  │  [ Share to Instagram ]         │
  │  [ Download Image     ]         │
  └─────────────────────────────────┘
```

---

## Technical Notes

- **No backend changes required** — all image generation happens client-side
- **html2canvas** is a lightweight, well-maintained library (~40KB gzipped)
- **Web Share API** (`navigator.share`) is supported on iOS Safari, Android Chrome — the primary Instagram audience
- **Privacy-safe**: The share card only shows pathway names and scores, no PII
- The share card intentionally excludes the user's name/email for privacy
- Instagram gradient and icon usage follows Instagram's brand guidelines for third-party apps
