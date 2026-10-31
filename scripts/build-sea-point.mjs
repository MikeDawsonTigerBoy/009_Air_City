// Turns OpenStreetMap ways into the prototype's data file: land, roads, city blocks and buildings.
// Geometry is real (OSM). Levels are sometimes estimated. All rent figures are invented.
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { polygonize } from '@turf/polygonize'
import { featureCollection, lineString, point, polygon } from '@turf/helpers'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import { area } from '@turf/area'
import { centroid } from '@turf/centroid'

const CACHE = 'scripts/.cache/osm.json'
const OUT = 'public/data/sea-point.json'
const QUERY = `[out:json][timeout:90];(way["building"](-33.930,18.370,-33.905,18.400);way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|trunk_link|primary_link|secondary_link|tertiary_link)$"](-33.930,18.370,-33.905,18.400);way["natural"="coastline"](-33.940,18.360,-33.895,18.410););out geom tags;`

if (!existsSync(CACHE)) {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: QUERY }),
  })
  mkdirSync('scripts/.cache', { recursive: true })
  writeFileSync(CACHE, await res.text())
}

const { elements } = JSON.parse(readFileSync(CACHE, 'utf8'))
const coords = (way) => way.geometry.map((p) => [round(p.lon), round(p.lat)])
const round = (n) => Math.round(n * 1e6) / 1e6

// Small repeatable random numbers, so the invented rents don't change between builds
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const roads = elements.filter((e) => e.tags?.highway)
const buildingWays = elements.filter((e) => e.tags?.building)
const coastWays = elements.filter((e) => e.tags?.natural === 'coastline')

// Split roads wherever they share a node, which polygonize needs in order to find blocks
const useCount = new Map()
for (const way of roads) {
  for (const c of coords(way)) useCount.set(c.join(), (useCount.get(c.join()) ?? 0) + 1)
}
const segments = []
for (const way of roads) {
  const line = coords(way)
  let current = [line[0]]
  for (let i = 1; i < line.length; i++) {
    current.push(line[i])
    if (useCount.get(line[i].join()) > 1 && i < line.length - 1) {
      segments.push(current)
      current = [line[i]]
    }
  }
  segments.push(current)
}
const noded = featureCollection(segments.filter((s) => s.length > 1).map((s) => lineString(s)))
const faces = polygonize(noded).features.filter((f) => area(f) > 300 && area(f) < 250000)

// Assign each building to the block its centre sits in
const blocks = faces.map((f, i) => ({ id: i, polygon: f.geometry.coordinates[0], feature: f, buildings: [] }))
const buildings = []
let knownLevels = 0
for (const way of buildingWays) {
  const ring = coords(way)
  if (ring.length < 4 || ring[0].join() !== ring.at(-1).join()) continue
  const shape = polygon([ring])
  const footprint = area(shape)
  if (footprint < 25) continue
  const block = blocks.find((b) => booleanPointInPolygon(centroid(shape), b.feature))
  if (!block) continue

  const random = seeded(way.id % 4294967296)
  const tagged = Number.parseFloat(way.tags['building:levels'])
  const fromHeight = Number.parseFloat(way.tags.height) / 3
  let levels = Number.isFinite(tagged) ? tagged : Number.isFinite(fromHeight) ? Math.round(fromHeight) : 0
  if (levels > 0) knownLevels++
  else levels = footprint > 500 ? 5 + Math.floor(random() * 8) : footprint > 180 ? 2 + Math.floor(random() * 3) : 1 + Math.floor(random() * 2)

  const floorArea = Math.round(footprint * levels)
  const apartments = Math.max(1, Math.round((floorArea * 0.8) / 70))
  const blockBase = seeded(block.id + 7)
  const base = 18 + blockBase() * 24
  const rents = Array.from({ length: apartments }, () => Math.max(6, Math.round(base * (0.75 + random() * 0.5))))

  const building = { id: way.id, ring, levels, footprint: Math.round(footprint), floorArea, rents }
  buildings.push(building)
  block.buildings.push(building)
}

const kept = blocks
  .filter((b) => b.buildings.length)
  .map((b) => ({
    id: b.id,
    polygon: b.polygon,
    buildings: b.buildings.map((x) => x.id),
    floorArea: b.buildings.reduce((sum, x) => sum + x.floorArea, 0),
    apartments: b.buildings.reduce((sum, x) => sum + x.rents.length, 0),
    monthlyRent: b.buildings.reduce((sum, x) => sum + x.rents.reduce((a, r) => a + r, 0), 0) * 1000,
  }))

// Land polygon: the longest joined coastline, closed around whichever side contains the suburb
const byStart = new Map(coastWays.map((w) => [coords(w)[0].join(), w]))
const hasPredecessor = new Set(coastWays.map((w) => coords(w).at(-1).join()))
const chains = coastWays
  .filter((w) => !hasPredecessor.has(coords(w)[0].join()))
  .map((start) => {
    const chain = [...coords(start)]
    let next = byStart.get(chain.at(-1).join())
    while (next) {
      chain.push(...coords(next).slice(1))
      next = byStart.get(chain.at(-1).join())
    }
    return chain
  })
const coast = chains.sort((a, b) => b.length - a.length)[0] ?? []
const onLand = point([18.385, -33.92])
const inSea = point([18.372, -33.908])
const closings = [
  [[18.5, -34.05], [18.5, -33.8]],
  [[18.5, -33.8], [18.5, -34.05]],
  [[18.25, -34.05], [18.25, -33.8]],
  [[18.25, -33.8], [18.25, -34.05]],
]
let land = null
for (const corners of closings) {
  const ring = [...coast, ...corners, coast[0]]
  const shape = polygon([ring])
  if (booleanPointInPolygon(onLand, shape) && !booleanPointInPolygon(inSea, shape)) {
    land = ring
    break
  }
}

const output = {
  center: [18.3855, -33.9185],
  note: 'Geometry (c) OpenStreetMap contributors, ODbL. Rents are illustrative, not measured.',
  land,
  roads: roads.map((r) => ({ path: coords(r), major: /trunk|primary|secondary/.test(r.tags.highway) })),
  blocks: kept,
  buildings,
}
mkdirSync('public/data', { recursive: true })
writeFileSync(OUT, JSON.stringify(output))

const totalCubes = buildings.reduce((sum, b) => sum + b.rents.reduce((a, r) => a + r, 0), 0)
const sorted = kept.map((b) => b.monthlyRent / 1000).sort((a, b) => a - b)
console.log({
  roads: roads.length,
  faces: faces.length,
  blocks: kept.length,
  buildingWays: buildingWays.length,
  buildingsInBlocks: buildings.length,
  knownLevels,
  coastChains: chains.length,
  coastPoints: coast.length,
  landFound: Boolean(land),
  totalCubes,
  medianCubesPerBlock: sorted[sorted.length >> 1],
  maxCubesPerBlock: sorted.at(-1),
  fileKB: Math.round(JSON.stringify(output).length / 1024),
})
