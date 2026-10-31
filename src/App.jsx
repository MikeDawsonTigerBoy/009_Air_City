import { useCallback, useState } from 'react'
import Globe from './Globe.jsx'
import CityMap from './CityMap.jsx'

export default function App() {
  const [arrived, setArrived] = useState(false)
  const [globeGone, setGlobeGone] = useState(false)
  const arrive = useCallback(() => setArrived(true), [])
  const leave = useCallback(() => setGlobeGone(true), [])

  return (
    <main className="app">
      <CityMap active={arrived} />
      {!globeGone && <Globe onArrive={arrive} onGone={leave} />}
    </main>
  )
}
