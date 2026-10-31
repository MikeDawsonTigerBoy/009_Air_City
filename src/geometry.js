// Small helpers for working in metres around a point on the map
const M_PER_DEG_LAT = 110574

const metresPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180)

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// One column of cubes per apartment, spread on a grid inside the building's footprint
export function placeColumns(building) {
  const { ring, rents, footprint } = building
  const lat0 = ring[0][1]
  const lonScale = metresPerDegLon(lat0)
  const spacing = Math.max(1.5, Math.sqrt(footprint / rents.length))
  const lons = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  const west = Math.min(...lons)
  const east = Math.max(...lons)
  const south = Math.min(...lats)
  const north = Math.max(...lats)

  const spots = []
  for (let lat = south + spacing / 2 / M_PER_DEG_LAT; lat < north; lat += spacing / M_PER_DEG_LAT) {
    for (let lon = west + spacing / 2 / lonScale; lon < east; lon += spacing / lonScale) {
      if (pointInRing(lon, lat, ring)) spots.push([lon, lat])
    }
  }
  if (!spots.length) spots.push([(west + east) / 2, (south + north) / 2])

  // A very narrow building may have fewer spots than apartments. The extra rent still gets
  // stacked, on a shared column, so the total number of cubes always equals total rent.
  const heights = new Array(spots.length).fill(0)
  rents.forEach((rent, i) => {
    heights[i % spots.length] += rent
  })
  return spots.map(([lon, lat], i) => ({ lon, lat, height: heights[i] })).filter((c) => c.height > 0)
}

// Grid lines clipped to a block and turned to follow its longest side
export function blockGrid(polygon, cellMetres) {
  const lat0 = polygon[0][1]
  const lon0 = polygon[0][0]
  const lonScale = metresPerDegLon(lat0)
  const flat = polygon.map(([lon, lat]) => [(lon - lon0) * lonScale, (lat - lat0) * M_PER_DEG_LAT])

  let angle = 0
  let longest = 0
  for (let i = 1; i < flat.length; i++) {
    const dx = flat[i][0] - flat[i - 1][0]
    const dy = flat[i][1] - flat[i - 1][1]
    const length = Math.hypot(dx, dy)
    if (length > longest) {
      longest = length
      angle = Math.atan2(dy, dx)
    }
  }
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const turned = flat.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos])
  const toLngLat = (u, v) => [
    lon0 + (u * cos - v * sin) / lonScale,
    lat0 + (u * sin + v * cos) / M_PER_DEG_LAT,
  ]

  const lines = []
  const scan = (axis) => {
    const values = turned.map((p) => p[axis])
    const start = Math.ceil(Math.min(...values) / cellMetres) * cellMetres
    for (let at = start; at < Math.max(...values); at += cellMetres) {
      const hits = []
      for (let i = 1; i < turned.length; i++) {
        const a = turned[i - 1]
        const b = turned[i]
        if (a[axis] <= at !== b[axis] <= at) {
          const t = (at - a[axis]) / (b[axis] - a[axis])
          hits.push(a[1 - axis] + t * (b[1 - axis] - a[1 - axis]))
        }
      }
      hits.sort((p, q) => p - q)
      for (let i = 0; i + 1 < hits.length; i += 2) {
        lines.push(
          axis === 0
            ? [toLngLat(at, hits[i]), toLngLat(at, hits[i + 1])]
            : [toLngLat(hits[i], at), toLngLat(hits[i + 1], at)],
        )
      }
    }
  }
  scan(0)
  scan(1)
  return lines
}
