// Synthetic rent history. Every block's rents in the data file are for the current year;
// earlier years scale them down along a shared curve, bent per block so some areas rose faster.
export const FIRST_YEAR = 2010
export const CURRENT_YEAR = 2026

// Share of current rent, by year. Invented for the prototype, not measured.
const CURVE = [
  [2010, 0.42],
  [2012, 0.46],
  [2014, 0.52],
  [2016, 0.62],
  [2018, 0.71],
  [2019, 0.75],
  [2020, 0.72],
  [2021, 0.7],
  [2022, 0.78],
  [2024, 0.9],
  [2026, 1],
]

function curveAt(year) {
  if (year <= CURVE[0][0]) return CURVE[0][1]
  for (let i = 1; i < CURVE.length; i++) {
    const [y1, v1] = CURVE[i]
    const [y0, v0] = CURVE[i - 1]
    if (year <= y1) return v0 + ((year - y0) / (y1 - y0)) * (v1 - v0)
  }
  return 1
}

// Between 0.7 and 1.5: above 1 means rents started lower and climbed faster
const growthOf = (block) => 0.7 + (((block.id * 2654435761) >>> 0) % 1000) / 1250

// Share of today's rent this block charged in `year`. Years can be fractional while animating.
export const rentScale = (block, year) => curveAt(year) ** growthOf(block)

export const rentIn = (block, year) => Math.round((block.monthlyRent * rentScale(block, year)) / 1000) * 1000

// The year this block's rent rose most, for the agent preview to point at
export function fastestRise(block) {
  let best = FIRST_YEAR + 1
  let most = 0
  for (let year = FIRST_YEAR + 1; year <= CURRENT_YEAR; year++) {
    const rise = rentIn(block, year) - rentIn(block, year - 1)
    if (rise > most) {
      most = rise
      best = year
    }
  }
  return best
}
