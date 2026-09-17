import { useEffect, useState } from 'react'
import './App.css'
import { MapView } from './MapView'
import { StopPanel } from './StopPanel'
import {
  SEARCH_RADIUS_M,
  fetchArrivals,
  fetchCrowding,
  fetchLineRoute,
  fetchNearbyStops,
  isTubeStop,
  routeKey,
  type Arrival,
  type Stop,
} from './tfl'

const FALLBACK = { lat: 51.553694, lon: -0.1445706 }
const POLL_MS = 30_000

function App() {
  const [lat, setLat] = useState(FALLBACK.lat)
  const [lon, setLon] = useState(FALLBACK.lon)
  const [stops, setStops] = useState<Stop[]>([])
  const [stopsError, setStopsError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Stop | null>(null)
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [arrivalsLoading, setArrivalsLoading] = useState(false)
  const [arrivalsError, setArrivalsError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null)
  const [crowding, setCrowding] = useState<number | null>(null)

  function clearRoute() {
    setSelectedRoute(null)
    setRoutePath(null)
  }

  function setLocation(nextLat: number, nextLon: number) {
    setLat(nextLat)
    setLon(nextLon)
    setSelected(null)
    setArrivals([])
    setPanelOpen(false)
    setStopsError(null)
    clearRoute()
    setCrowding(null)
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Keep Softwire Highgate fallback if permission is denied.
      },
    )
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchNearbyStops(lat, lon)
      .then((next) => {
        if (!cancelled) setStops(next)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStops([])
        setStopsError(err instanceof Error ? err.message : 'Could not load stops')
      })

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  useEffect(() => {
    if (!selected) return
    const stopId = selected.id
    let cancelled = false

    function load(initial: boolean) {
      fetchArrivals(stopId)
        .then((next) => {
          if (cancelled) return
          setArrivals(next)
          setArrivalsLoading(false)
          setArrivalsError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if (initial) {
            setArrivals([])
            setArrivalsLoading(false)
          }
          setArrivalsError(err instanceof Error ? err.message : 'Could not load arrivals')
        })
    }

    load(true)
    const timer = window.setInterval(() => load(false), POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [selected])

  useEffect(() => {
    if (!selected || !isTubeStop(selected)) return
    const stopId = selected.id
    let cancelled = false

    fetchCrowding(stopId)
      .then((level) => {
        if (!cancelled) setCrowding(level)
      })
      .catch(() => {
        if (!cancelled) setCrowding(null)
      })

    return () => {
      cancelled = true
    }
  }, [selected])

  function handleStopClick(stop: Stop) {
    setSelected(stop)
    setPanelOpen(true)
    setArrivals([])
    setArrivalsLoading(true)
    setArrivalsError(null)
    setCrowding(null)
    clearRoute()
  }

  function handleRefresh() {
    if (!selected) return
    fetchArrivals(selected.id)
      .then((next) => {
        setArrivals(next)
        setArrivalsError(null)
      })
      .catch((err: unknown) => {
        setArrivalsError(err instanceof Error ? err.message : 'Could not load arrivals')
      })
  }

  function handleArrivalClick(item: Arrival) {
    const key = routeKey(item)
    if (selectedRoute === key) {
      clearRoute()
      return
    }
    setSelectedRoute(key)
    fetchLineRoute(item.lineId, item.direction)
      .then((points) => {
        setRoutePath(points)
      })
      .catch(() => {
        setRoutePath(null)
      })
  }

  return (
    <div className="app">
      <header className="top">
        <h1>BusBoard</h1>
        <p>
          {stopsError ??
            'Click the map to set location. Click a stop for arrivals.'}
          <span className="legend">
            <span className="dot you" /> you
            <span className="dot bus" /> bus
            <span className="dot tube" /> tube
          </span>
        </p>
      </header>
      <MapView
        lat={lat}
        lon={lon}
        radius={SEARCH_RADIUS_M}
        stops={stops}
        selectedId={selected?.id ?? null}
        path={routePath}
        onMapClick={setLocation}
        onStopClick={handleStopClick}
      />
      <StopPanel
        stop={selected}
        arrivals={arrivals}
        loading={arrivalsLoading}
        error={arrivalsError}
        open={panelOpen}
        selectedRoute={selectedRoute}
        crowding={crowding}
        onToggle={() => setPanelOpen((value) => !value)}
        onRefresh={handleRefresh}
        onArrivalClick={handleArrivalClick}
      />
    </div>
  )
}

export default App
