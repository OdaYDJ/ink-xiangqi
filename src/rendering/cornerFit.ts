/**
 * Sizes a decoration anchored in the top-right corner so it scales with the
 * window yet stays clear of the content. Pure: give it the viewport, the
 * decoration's aspect ratio and the rectangles to avoid.
 */
export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface CornerFitInput {
  viewportWidth: number
  viewportHeight: number
  /** width ÷ height of the decoration. */
  aspect: number
  /** Content the decoration must not cover. */
  avoid: Box[]
  /** Breathing room kept between decoration and content. */
  gap?: number
  /** Smallest useful width; below this the decoration would read as a smudge. */
  minWidth?: number
  maxWidth?: number
}

export interface CornerFit {
  width: number
  height: number
  /** True when even the minimum size touches content: draw it as a faint whisper. */
  crowded: boolean
}

export function fitCorner({
  viewportWidth: vw, viewportHeight: vh, aspect, avoid, gap = 24, minWidth = 120, maxWidth = 480,
}: CornerFitInput): CornerFit {
  // Ideal size follows the smaller viewport dimension, so wide-short and tall-narrow screens both look balanced.
  const ideal = Math.min(maxWidth, vw * 0.3, vh * 0.46 * aspect)

  // Each rectangle allows the decoration to sit either entirely to its right or entirely above it.
  let limit = Infinity
  for (const r of avoid) {
    if (r.right <= r.left || r.bottom <= r.top) continue
    const besideWidth = vw - r.right - gap
    const aboveWidth = (r.top - gap) * aspect
    limit = Math.min(limit, Math.max(besideWidth, aboveWidth))
  }

  const target = Math.min(ideal, limit)
  const width = Math.max(minWidth, Math.min(target, maxWidth))
  return { width, height: width / aspect, crowded: target < minWidth }
}
