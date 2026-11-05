import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { AmbientLight, DirectionalLight, FlyToInterpolator, LightingEffect, MapView } from '@deck.gl/core'
import { PathLayer, PolygonLayer } from '@deck.gl/layers'
import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { CubeGeometry } from '@luma.gl/engine'
import AgentQuestions from './AgentQuestions.jsx'
import { blockGrid, placeColumns } from './geometry.js'
import { CURRENT_YEAR, EVENTS, FIRST_YEAR, eventBy, fastestRise, rentIn, rentScale } from './history.js'
import { advance, createStack, cubeHeight } from './stacks.js'

// Colours match the portfolio's Product cards: --product-orange and its 30% white grid
const ORANGE = [228, 56, 4]
const GRID_WHITE = [255, 255, 255, 77]
const LAND = [235, 235, 233]
const ROAD = [255, 255, 255]
const FOOTPRINT = [220, 220, 218]
const BUILDING = [242, 242, 240, 128]
const GRID_CELL_METRES = 10
const STOREY_METRES = 3

const CUBE = new CubeGeometry()
const VIEW = new MapView({ repeat: false })
const LIGHTING = new LightingEffect({
  ambient: new AmbientLight({ color: [255, 255, 255], intensity: 1.5 }),
  sun: new DirectionalLight({ color: [255, 255, 255], intensity: 1.6, direction: [-1, 2, -2] }),
})

const START = { longitude: 18.3855, latitude: -33.9185, zoom: 12, pitch: 0, bearing: 0 }
const ARRIVAL = { longitude: 18.3855, latitude: -33.9185, zoom: 16.8, pitch: 58, bearing: -38 }
const LIMITS = { west: 18.365, east: 18.405, south: -33.935, north: -33.9 }
// The block the agent preview briefs on when nothing is hovered
const DEMO_BLOCK_ID = 127

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// How long the whole city stays up after the timeline is let go
const SCRUB_LINGER_MS = 900
const CITY_RISE_MS = 1200
const easeInOut = (t) => t * t * (3 - 2 * t)

const formatNumber = (n) => Math.round(n).toLocaleString('en-ZA').replace(/[, ]/g, ' ')

export default function CityMap({ active }) {
  const [data, setData] = useState(null)
  const [initialViewState, setInitialViewState] = useState({ ...START, maxPitch: 85, minZoom: 12, maxZoom: 20 })
  const [is3D, setIs3D] = useState(true)
  const [hovered, setHovered] = useState(null)
  const [, setFrame] = useState(0)
  const camera = useRef(START)
  const stacks = useRef(new Map())
  const hoveredId = useRef(null)
  // The year picked, and the year on screen, which glides towards it so the cubes move smoothly
  const [year, setYear] = useState(CURRENT_YEAR)
  const yearShown = useRef(CURRENT_YEAR)
  const targetYear = useRef(CURRENT_YEAR)
  // While the agent preview runs, the pointer can't change the block it's briefing on
  const agentHasControl = useRef(false)
  const [agentSteps, setAgentSteps] = useState([])
  const [agentRunning, setAgentRunning] = useState(false)
  // The clicked block keeps its cubes up after the pointer and the timeline move on
  const selectedId = useRef(null)
  // Scrubbing the timeline raises every block; `cityClock` runs 0 to 1 as they come up
  const scrubHeld = useRef(false)
  const lastScrub = useRef(-Infinity)
  const cityClock = useRef(0)
  const [cityVersion, setCityVersion] = useState(0)

  const chooseYear = useCallback((next) => {
    targetYear.current = next
    setYear(next)
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sea-point.json`)
      .then((res) => res.json())
      .then((json) => {
        const buildingsById = new Map(json.buildings.map((b) => [b.id, b]))
        const blockOf = new Map()
        for (const block of json.blocks) for (const id of block.buildings) blockOf.set(id, block)
        setData({ ...json, buildingsById, blockOf })
      })
  }, [])

  useEffect(() => {
    if (!active) return
    setInitialViewState((view) => ({
      ...view,
      ...ARRIVAL,
      transitionDuration: 3400,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.1 }),
    }))
  }, [active])

  // The animation clock. It only asks React to redraw while something is actually moving.
  useEffect(() => {
    let last = performance.now()
    let handle
    const tick = (now) => {
      // Capped so a tab coming back from the background does not jump, but slow frames still keep real time
      const dt = Math.min(now - last, 250)
      last = now
      let moved = false
      const gap = targetYear.current - yearShown.current
      if (gap !== 0) {
        yearShown.current = Math.abs(gap) < 0.01 ? targetYear.current : yearShown.current + gap * Math.min(1, dt / 220)
        for (const stack of stacks.current.values()) stack.version++
        moved = true
      }
      const cityUp = scrubHeld.current || now - lastScrub.current < SCRUB_LINGER_MS
      const cityBefore = cityClock.current
      cityClock.current = Math.min(1, Math.max(0, cityClock.current + (cityUp ? dt : -dt) / CITY_RISE_MS))
      if (cityClock.current !== cityBefore || (gap !== 0 && cityClock.current > 0)) {
        setCityVersion((n) => n + 1)
        moved = true
      }
      for (const [id, stack] of stacks.current) {
        // Only the hovered and the selected block stay up; anything else goes back under,
        // however it got left behind (pointer onto a panel, agent taking over the selection)
        const wanted = id === hoveredId.current || id === selectedId.current
        if (stack.rising && !wanted) {
          stack.rising = false
          stack.leftAt = now
        } else if (!stack.rising && wanted) {
          stack.rising = true
        }
        const before = stack.version
        if (!advance(stack, dt, now)) {
          stacks.current.delete(id)
          moved = true
        } else if (stack.version !== before) {
          moved = true
        }
      }
      if (moved) setFrame((n) => n + 1)
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [])

  const hoverBlock = useCallback(
    (block, { byAgent = false } = {}) => {
      if (agentHasControl.current && !byAgent) return
      const id = block?.id ?? null
      if (id === hoveredId.current) return
      const previous = stacks.current.get(hoveredId.current)
      if (previous && hoveredId.current !== selectedId.current) {
        previous.rising = false
        previous.leftAt = performance.now()
      }
      hoveredId.current = id
      if (block) {
        let stack = stacks.current.get(id)
        if (!stack) {
          stack = createStack(block, data.buildingsById)
          stacks.current.set(id, stack)
        }
        stack.rising = true
        setHovered(block)
      }
      setFrame((n) => n + 1)
    },
    [data],
  )

  const selectBlock = useCallback(
    (block) => {
      if (agentHasControl.current) return
      const old = stacks.current.get(selectedId.current)
      if (!block) {
        if (old && selectedId.current !== hoveredId.current) {
          old.rising = false
          old.leftAt = performance.now()
        }
        selectedId.current = null
        setFrame((n) => n + 1)
        return
      }
      if (old && selectedId.current !== block.id && selectedId.current !== hoveredId.current) {
        old.rising = false
        old.leftAt = performance.now()
      }
      selectedId.current = block.id
      let stack = stacks.current.get(block.id)
      if (!stack) {
        stack = createStack(block, data.buildingsById)
        stacks.current.set(block.id, stack)
      }
      stack.rising = true
      setHovered(block)
      setFrame((n) => n + 1)
    },
    [data],
  )

  // Every apartment column in Sea Point, for the city-wide view while scrubbing
  const cityColumns = useMemo(() => {
    if (!data) return []
    return data.blocks.flatMap((block) =>
      block.buildings.flatMap((id) =>
        placeColumns(data.buildingsById.get(id)).map((column) => ({ ...column, block, delay: Math.random() * 0.45 })),
      ),
    )
  }, [data])

  // A scripted preview of the briefing agent: the steps it will take, played out on the map.
  // The real agent will choose these itself with the Claude Agent SDK.
  const runAgent = async () => {
    if (!data || agentRunning) return
    const block = hovered ?? data.blocks.find((b) => b.id === DEMO_BLOCK_ID) ?? data.blocks[0]
    const peak = fastestRise(block)
    const name = `Block ${String(block.id).padStart(3, '0')}`
    const rand = (y) => `R${formatNumber(rentIn(block, y))}`
    const steps = []
    const step = async (tool, result, action, pause = 1700) => {
      steps.push({ tool, result })
      setAgentSteps([...steps])
      action?.()
      await wait(pause)
    }

    selectBlock(null)
    agentHasControl.current = true
    setAgentRunning(true)
    setAgentSteps([])
    const [lon, lat] = block.polygon
      .reduce((sum, [x, y]) => [sum[0] + x, sum[1] + y], [0, 0])
      .map((v) => v / block.polygon.length)

    await step('find_block', name, () => {
      hoverBlock(block, { byAgent: true })
      selectedId.current = block.id
      setInitialViewState((view) => ({
        ...view,
        ...camera.current,
        longitude: lon,
        latitude: lat,
        zoom: 17.2,
        pitch: is3D ? 58 : 0,
        transitionDuration: 1400,
        transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
      }))
    }, 2600)
    await step('get_series', `${FIRST_YEAR}–${CURRENT_YEAR}, ${CURRENT_YEAR - FIRST_YEAR + 1} years`)
    // Sweep the timeline left to right, pausing on each event
    for (let y = FIRST_YEAR; y <= CURRENT_YEAR; y++) {
      chooseYear(y)
      const event = EVENTS.find((e) => e.year === y)
      if (event) await step('set_view', `${y} · ${event.label} · ${rand(y)} / month`, null, 2200)
      else await wait(500)
    }
    await wait(800)
    const rise = Math.round((rentIn(block, CURRENT_YEAR) / rentIn(block, FIRST_YEAR) - 1) * 100)
    await step('write_brief', `Rent up ${rise}% since ${FIRST_YEAR}, fastest in ${peak} (illustrative)`, null, 0)

    agentHasControl.current = false
    setAgentRunning(false)
  }

  const switchView = (next) => {
    setIs3D(next)
    setInitialViewState({
      ...initialViewState,
      ...camera.current,
      pitch: next ? 58 : 0,
      bearing: next ? -38 : 0,
      transitionDuration: 1100,
      transitionInterpolator: new FlyToInterpolator({ speed: 3 }),
    })
  }

  const liveStacks = [...stacks.current.values()]
  const activeIds = liveStacks.map((s) => s.block.id).join()
  // Worked out once per frame per block, not once per cube
  const scales = new Map(liveStacks.map((s) => [s, rentScale(s.block, yearShown.current)]))
  const blockScales = cityClock.current > 0 && data ? new Map(data.blocks.map((b) => [b.id, rentScale(b, yearShown.current)])) : null
  // Height of one city-wide bar right now; blocks with their own cubes up skip theirs
  const cityBarHeight = (column) => {
    if (stacks.current.has(column.block.id)) return 0
    const progress = easeInOut(Math.min(1, Math.max(0, (cityClock.current - column.delay) / 0.55)))
    return column.height * blockScales.get(column.block.id) * progress
  }

  const gridLines = useMemo(
    () => [...stacks.current.values()].flatMap((s) => blockGrid(s.block.polygon, GRID_CELL_METRES)),
    // Only worth recalculating when the set of orange blocks changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIds],
  )

  const layers = data
    ? [
        new PolygonLayer({
          id: 'land',
          data: [{ polygon: data.land }],
          getPolygon: (d) => d.polygon,
          getFillColor: LAND,
          stroked: false,
        }),
        new PathLayer({
          id: 'roads',
          data: data.roads,
          getPath: (d) => d.path,
          getColor: ROAD,
          getWidth: (d) => (d.major ? 14 : 8),
          widthUnits: 'meters',
          widthMinPixels: 1,
          capRounded: true,
          jointRounded: true,
        }),
        new PolygonLayer({
          id: 'blocks',
          data: data.blocks,
          pickable: true,
          stroked: false,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => (stacks.current.has(d.id) ? [...ORANGE, 255] : [...ORANGE, 0]),
          updateTriggers: { getFillColor: activeIds },
          transitions: { getFillColor: 220 },
          onHover: ({ object }) => hoverBlock(object ?? null),
          onClick: ({ object }) => selectBlock(object),
        }),
        new PolygonLayer({
          id: 'footprints',
          data: is3D ? [] : data.buildings,
          stroked: false,
          getPolygon: (d) => d.ring,
          getFillColor: (d) => (stacks.current.has(data.blockOf.get(d.id)?.id) ? [...ORANGE, 0] : FOOTPRINT),
          updateTriggers: { getFillColor: activeIds },
        }),
        new PathLayer({
          id: 'block-grid',
          data: gridLines,
          getPath: (d) => d,
          getColor: GRID_WHITE,
          getWidth: 1,
          widthUnits: 'pixels',
        }),
        ...(is3D
          ? liveStacks.map(
              (stack) =>
                new SimpleMeshLayer({
                  id: `cubes-${stack.block.id}`,
                  data: stack.cubes,
                  mesh: CUBE,
                  // The geometry spans -1 to 1; 0.46 gives a 0.92 m cube, leaving a hairline between them
                  sizeScale: 0.46,
                  getColor: ORANGE,
                  material: { ambient: 0.55, diffuse: 0.7, shininess: 0, specularColor: [0, 0, 0] },
                  getPosition: (cube, { target }) => {
                    target[0] = cube.column.lon
                    target[1] = cube.column.lat
                    // Anything still underground is parked below the ground plane, out of sight
                    target[2] = Math.max(cubeHeight(cube, stack.clock, scales.get(stack)), -3) + 0.5
                    return target
                  },
                  updateTriggers: { getPosition: stack.version },
                }),
            )
          : []),
        ...(is3D && blockScales
          ? [
              // Solid bars, one per apartment: 760 000 separate cubes would be too slow to animate
              new SimpleMeshLayer({
                id: 'city-bars',
                data: cityColumns,
                mesh: CUBE,
                getColor: ORANGE,
                material: { ambient: 0.55, diffuse: 0.7, shininess: 0, specularColor: [0, 0, 0] },
                getPosition: (column, { target }) => {
                  target[0] = column.lon
                  target[1] = column.lat
                  target[2] = cityBarHeight(column) / 2
                  return target
                },
                getScale: (column, { target }) => {
                  const height = cityBarHeight(column)
                  target[0] = height > 0 ? 0.46 : 0
                  target[1] = height > 0 ? 0.46 : 0
                  target[2] = height / 2
                  return target
                },
                updateTriggers: { getPosition: [cityVersion, activeIds], getScale: [cityVersion, activeIds] },
              }),
            ]
          : []),
        new PolygonLayer({
          id: 'buildings',
          data: is3D ? data.buildings : [],
          pickable: true,
          extruded: true,
          stroked: false,
          wireframe: false,
          getPolygon: (d) => d.ring,
          getElevation: (d) => d.levels * STOREY_METRES,
          getFillColor: BUILDING,
          // Flat colour: lit walls turned dark grey. Overlapping translucent faces still show the form.
          material: false,
          // Translucent: must not hide the cubes standing inside it
          parameters: { depthWriteEnabled: false },
          onHover: ({ object }) => hoverBlock(object ? data.blockOf.get(object.id) : null),
          onClick: ({ object }) => selectBlock(object ? data.blockOf.get(object.id) : null),
        }),
      ]
    : []

  return (
    <div
      className="map"
      onPointerOver={(e) => {
        if (e.target.tagName !== 'CANVAS') hoverBlock(null)
      }}
    >
      <DeckGL
        views={VIEW}
        initialViewState={initialViewState}
        controller={{ dragRotate: true, touchRotate: true, keyboard: true }}
        effects={[LIGHTING]}
        layers={layers}
        onViewStateChange={({ viewState }) => {
          const clamped = {
            ...viewState,
            longitude: Math.min(LIMITS.east, Math.max(LIMITS.west, viewState.longitude)),
            latitude: Math.min(LIMITS.north, Math.max(LIMITS.south, viewState.latitude)),
          }
          camera.current = {
            longitude: clamped.longitude,
            latitude: clamped.latitude,
            zoom: clamped.zoom,
            pitch: clamped.pitch,
            bearing: clamped.bearing,
          }
          return clamped
        }}
        onHover={({ object }) => {
          if (!object) hoverBlock(null)
        }}
        onClick={({ object }) => {
          if (!object) selectBlock(null)
        }}
        getCursor={({ isDragging }) => (isDragging ? 'grabbing' : 'crosshair')}
      />

      {active && (
        <>
          <div className="year">
            <output className="year__value" htmlFor="year-slider" aria-live="polite">
              {Math.round(yearShown.current)}
            </output>
            <div className="year__track">
            <input
              id="year-slider"
              className="year__slider"
              type="range"
              min={FIRST_YEAR}
              max={CURRENT_YEAR}
              step={1}
              value={year}
              disabled={agentRunning}
              aria-label="Year"
              onPointerDown={() => {
                scrubHeld.current = true
              }}
              onPointerUp={() => {
                scrubHeld.current = false
                lastScrub.current = performance.now()
              }}
              onChange={(e) => {
                lastScrub.current = performance.now()
                chooseYear(Number(e.target.value))
              }}
            />
            {EVENTS.map((event) => (
              <span
                key={event.year}
                className={`year__event${event.year <= Math.round(yearShown.current) ? ' is-past' : ''}`}
                style={{ left: `${((event.year - FIRST_YEAR) / (CURRENT_YEAR - FIRST_YEAR)) * 100}%` }}
                title={`${event.year}: ${event.label}`}
                aria-hidden="true"
              />
            ))}
            </div>
            <p className="year__caption" aria-live="polite">
              {eventBy(yearShown.current) ? (
                <>
                  <span>{eventBy(yearShown.current).year}</span> {eventBy(yearShown.current).label}
                </>
              ) : null}
            </p>
          </div>

          <div className="view-switch" role="group" aria-label="Map view">
            <button aria-pressed={!is3D} onClick={() => switchView(false)}>2D</button>
            <button aria-pressed={is3D} onClick={() => switchView(true)}>3D</button>
          </div>

          {hovered && (
            <aside className="block-card" aria-live="polite">
              <p className="block-card__eyebrow">Block {String(hovered.id).padStart(3, '0')}</p>
              <dl>
                <div>
                  <dt>Floor area</dt>
                  <dd>{formatNumber(hovered.floorArea)} m²</dd>
                </div>
                <div>
                  <dt>Rental income / month</dt>
                  <dd>
                    R{formatNumber(rentIn(hovered, yearShown.current))}
                    <span className="marker marker--end" aria-hidden="true" />
                  </dd>
                </div>
              </dl>
              <p className="block-card__key">1 cube = R1 000 / month</p>
            </aside>
          )}

          <AgentQuestions steps={agentSteps} running={agentRunning} onRun={runAgent} />

          <p className="credit">
            Illustrative rents · Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
          </p>
        </>
      )}
    </div>
  )
}
