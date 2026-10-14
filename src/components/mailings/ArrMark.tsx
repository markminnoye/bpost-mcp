import { arrTone } from './labels'

/** The five-pointed star of the extra discount, on a 24-unit grid. */
export const STAR_PATH = 'M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L2.9 9.4l6.3-.9z'

/**
 * The mark before an ARR in a pill (design 13/10, decision 20): an orange dot under 96 %, a green dot
 * from 96 %, a gold star from 98 % (the extra discount for data quality).
 * @param props The ARR in percent, and the size of the star in pixels.
 */
export function ArrMark({ arr, size = 13 }: { arr: number; size?: number }) {
  const tone = arrTone(arr)
  if (tone === 'bonus') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" data-star="">
        <path d={STAR_PATH} fill="var(--gold)" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill={tone === 'low' ? 'var(--orange)' : 'var(--green)'} />
    </svg>
  )
}
