// Line-drawn faces from the design, one per mood. White strokes on the mood
// colour; decorative only (the label always names the mood alongside).

import type { ReactNode } from 'react'
import type { MoodKey } from '../lib/moods'

const EYE_R = 6.5

const closedEyesDown = (
  <>
    <path d="M10 14 Q23 28 36 14" />
    <path d="M64 14 Q77 28 90 14" />
  </>
)
const dotEyes = (y: number) => (
  <>
    <circle cx="30" cy={y} r={EYE_R} className="face-fill" />
    <circle cx="70" cy={y} r={EYE_R} className="face-fill" />
  </>
)
const worriedBrows = (
  <>
    <path d="M14 20 Q24 8 36 6" />
    <path d="M86 20 Q76 8 64 6" />
  </>
)
const frown = <path d="M31 74 Q50 52 69 74" />

const FACES: Record<MoodKey, ReactNode> = {
  depressed: (
    <>
      {closedEyesDown}
      <path d="M28 70 Q50 44 72 70" />
    </>
  ),
  sad: (
    <>
      {worriedBrows}
      {dotEyes(34)}
      {frown}
    </>
  ),
  happy: (
    <>
      <path d="M10 26 Q23 6 36 26" />
      <path d="M64 26 Q77 6 90 26" />
      <path d="M30 44 H70 Q70 74 50 74 Q30 74 30 44 Z" />
    </>
  ),
  neutral: (
    <>
      {dotEyes(18)}
      <path d="M22 66 H78" />
    </>
  ),
  anxious: (
    <>
      {worriedBrows}
      {dotEyes(34)}
      <path d="M24 70 Q30 76 37 69 Q50 54 63 69 Q70 76 76 70" />
    </>
  ),
  overwhelmed: (
    <>
      {/* Straining: eyes squeezed shut (> <), gritted teeth, sweat drops. */}
      <path d="M17 10 L35 20 L17 30" />
      <path d="M83 10 L65 20 L83 30" />
      <rect x="24" y="48" width="52" height="26" rx="9" />
      <path d="M26 61 H74 M37.5 50 V72 M50 50 V72 M62.5 50 V72" strokeWidth="3.5" />
      <path d="M101 -6 Q111 10 101 16 Q91 10 101 -6 Z" className="face-fill" />
      <path d="M-1 22 Q8 36 -1 42 Q-10 36 -1 22 Z" className="face-fill" />
    </>
  ),
  angry: (
    <>
      <path d="M14 6 L36 18" />
      <path d="M86 6 L64 18" />
      {dotEyes(36)}
      {frown}
    </>
  ),
}

export function Face({ mood, size = 56 }: { mood: MoodKey; size?: number }) {
  return (
    <svg
      className="face"
      viewBox="0 0 100 80"
      width={size}
      height={(size * 80) / 100}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {FACES[mood]}
      </g>
    </svg>
  )
}
