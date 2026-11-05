import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { AmbientLight, DirectionalLight, FlyToInterpolator, LightingEffect, MapView } from '@deck.gl/core'
import { PathLayer, PolygonLayer } from '@deck.gl/layers'
import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { CubeGeometry } from '@luma.gl/engine'
import AgentQuestions from './AgentQuestions.jsx'
import { blockGrid } from './geometry.js'
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
      const dt = Math.min(now - last, 60)
      last = now
      let moved = false
      for (const [id, stack] of stacks.current) {
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
    (block) => {
      const id = block?.id ?? null
      if (id === hoveredId.current) return
      const previous = stacks.current.get(hoveredId.current)
      if (previous) {
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
                    target[2] = Math.max(cubeHeight(cube, stack.clock), -3) + 0.5
                    return target
                  },
                  updateTriggers: { getPosition: stack.version },
                }),
            )
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
        }),
      ]
    : []

  return (
    <div className="map">
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
        getCursor={({ isDragging }) => (isDragging ? 'grabbing' : 'crosshair')}
      />

      {active && (
        <>
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
                    R{formatNumber(hovered.monthlyRent)}
                    <span className="marker marker--end" aria-hidden="true" />
                  </dd>
                </div>
              </dl>
              <p className="block-card__key">1 cube = R1 000 / month</p>
            </aside>
          )}

          <AgentQuestions />

          <p className="credit">
            Illustrative rents · Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
          </p>
        </>
      )}
    </div>
  )
}
