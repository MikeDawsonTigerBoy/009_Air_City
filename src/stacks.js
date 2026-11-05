import { placeColumns } from './geometry.js'

const RISE_MS = 2400
const SINK_MS = 2400
// How long a block waits after the pointer leaves before its cubes start to go under
const LINGER_MS = 300

const smooth = (t) => t * t * (3 - 2 * t)

// One block's cubes. `clock` runs 0 to 1 as they rise and back down as they sink.
export function createStack(block, buildingsById) {
  const [originLon, originLat] = block.polygon[0]
  const placed = block.buildings.flatMap((id) => placeColumns(buildingsById.get(id)))
  const distanceOf = (column) => Math.hypot(column.lon - originLon, column.lat - originLat)
  const farthest = Math.max(...placed.map(distanceOf))
  // Each column starts at its own moment and speed, which is what makes the growth feel organic.
  // Growth spreads across the block from one corner, with some randomness on top.
  const columns = placed.map((column) => ({
    ...column,
    delay: 0.3 * (distanceOf(column) / farthest) + Math.random() * 0.15,
    span: 0.4 + Math.random() * 0.15,
  }))

  const cubes = []
  for (const column of columns) {
    for (let level = 0; level < column.height; level++) cubes.push({ column, level })
  }

  return { block, cubes, clock: 0, rising: true, leftAt: 0, version: 0 }
}

// Advances a stack and reports whether it is still on the map
export function advance(stack, dt, now) {
  const lingering = now - stack.leftAt < LINGER_MS
  const previous = stack.clock
  stack.clock =
    stack.rising || lingering
      ? Math.min(1, stack.clock + dt / RISE_MS)
      : Math.max(0, stack.clock - dt / SINK_MS)
  if (stack.clock !== previous) stack.version++
  return stack.rising || lingering || stack.clock > 0
}

// A column pushes up out of the ground, so its lowest cubes arrive last and leave first.
// `scale` is the share of today's rent for the year on screen, so an earlier year sinks the column.
export function cubeHeight(cube, clock, scale) {
  const { column, level } = cube
  const progress = smooth(Math.min(1, Math.max(0, (clock - column.delay) / column.span)))
  return column.height * scale * progress - level - 1
}
