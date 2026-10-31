import { useEffect, useRef, useState } from 'react'
import { geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import land from 'world-atlas/land-50m.json'

const LAND = feature(land, land.objects.land)
const SEA_POINT = [18.3855, -33.9185]
const KNOWN_PLACE = /sea\s*point|cape\s*town/i

// Radius in pixels at which the globe lines up with the map's opening zoom
const END_SCALE = (512 * 2 ** 12) / (2 * Math.PI * Math.cos((SEA_POINT[1] * Math.PI) / 180))
const FLY_MS = 2600
const FADE_MS = 900
const REST_TILT = 18

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export default function Globe({ onArrive, onGone }) {
  const canvasRef = useRef(null)
  const flight = useRef(null)
  const longitude = useRef(-SEA_POINT[0] - 70)
  const [query, setQuery] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [flying, setFlying] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const projection = geoOrthographic().clipAngle(90).precision(0.5)
    const path = geoPath(projection, context)
    let last = performance.now()
    let handle

    const draw = (now) => {
      const dt = now - last
      last = now
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== width * dpr) canvas.width = width * dpr
      if (canvas.height !== height * dpr) canvas.height = height * dpr
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const restScale = Math.min(width, height) * 0.36
      let rotation = [longitude.current, REST_TILT]
      let scale = restScale
      let centreY = height * 0.42

      if (flight.current) {
        const t = Math.min(1, (now - flight.current.start) / FLY_MS)
        const eased = easeInOut(t)
        rotation = [
          longitude.current + (-SEA_POINT[0] - longitude.current) * eased,
          REST_TILT + (-SEA_POINT[1] - REST_TILT) * eased,
        ]
        scale = Math.exp(Math.log(restScale) + (Math.log(END_SCALE) - Math.log(restScale)) * eased ** 2)
        centreY = height * (0.42 + 0.08 * eased)
        if (t === 1 && !flight.current.arrived) {
          flight.current.arrived = true
          onArrive()
          setLeaving(true)
          setTimeout(onGone, FADE_MS)
        }
      } else if (!still) {
        longitude.current += dt * 0.006
      }

      projection.rotate(rotation).scale(scale).translate([width / 2, centreY])
      context.clearRect(0, 0, width, height)
      context.beginPath()
      path({ type: 'Sphere' })
      context.fillStyle = '#d8d8d6'
      context.fill()
      context.beginPath()
      path(LAND)
      context.fillStyle = '#f2f2f0'
      context.fill()

      handle = requestAnimationFrame(draw)
    }
    handle = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(handle)
  }, [onArrive, onGone])

  const submit = (event) => {
    event.preventDefault()
    if (!KNOWN_PLACE.test(query)) {
      setNotFound(true)
      return
    }
    setNotFound(false)
    setFlying(true)
    flight.current = { start: performance.now() }
  }

  return (
    <section className={`globe${leaving ? ' globe--leaving' : ''}`}>
      <canvas ref={canvasRef} className="globe__canvas" aria-hidden="true" />
      <form className={`search${flying ? ' search--hidden' : ''}`} onSubmit={submit}>
        <label htmlFor="place" className="search__label">
          Where do you live?
        </label>
        <div className="search__row">
          <span className="marker marker--start" aria-hidden="true" />
          <input
            id="place"
            className="search__input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setNotFound(false)
            }}
            placeholder="Sea Point, Cape Town, South Africa"
            autoComplete="off"
            autoFocus
          />
          <button className="search__go" type="submit" aria-label="Go">
            <span className="marker marker--next" aria-hidden="true" />
          </button>
        </div>
        <p className="search__note" role="status">
          {notFound ? 'Only Sea Point, Cape Town is mapped so far.' : ' '}
        </p>
      </form>
    </section>
  )
}
