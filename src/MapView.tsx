import { useState } from 'react'
import { GeoJson, Map, Marker, Overlay } from 'pigeon-maps'
import { isTubeStop, type Stop } from './tfl'

const BUS_COLOR = '#2d6a4f'
const TUBE_COLOR = '#1d4ed8'
const ORIGIN_COLOR = '#c1121f'

type Props = {
  lat: number
  lon: number
  radius: number
  stops: Stop[]
  selectedId: string | null
  path: [number, number][] | null
  onMapClick: (lat: number, lon: number) => void
  onStopClick: (stop: Stop) => void
}

function radiusPx(lat: number, zoom: number, radiusM: number) {
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
  return radiusM / metersPerPx
}

export function MapView({
  lat,
  lon,
  radius,
  stops,
  selectedId,
  path,
  onMapClick,
  onStopClick,
}: Props) {
  const [center, setCenter] = useState<[number, number]>([lat, lon])
  const [zoom, setZoom] = useState(16)
  const [origin, setOrigin] = useState({ lat, lon })

  if (origin.lat !== lat || origin.lon !== lon) {
    setOrigin({ lat, lon })
    setCenter([lat, lon])
  }

  const r = radiusPx(lat, zoom, radius)

  return (
    <div className="map">
      <Map
        center={center}
        zoom={zoom}
        onBoundsChanged={({ center: nextCenter, zoom: nextZoom }) => {
          setCenter(nextCenter as [number, number])
          setZoom(nextZoom)
        }}
        onClick={({ latLng }) => {
          onMapClick(latLng[0], latLng[1])
        }}
      >
        <Overlay anchor={[lat, lon]} offset={[r, r]} style={{ pointerEvents: 'none' }}>
          <div className="radius" style={{ width: r * 2, height: r * 2 }} />
        </Overlay>
        {path && path.length > 1 && (
          <GeoJson
            data={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: path.map(([pathLat, pathLon]) => [pathLon, pathLat]),
                  },
                },
              ],
            }}
            style={{ pointerEvents: 'none' }}
            svgAttributes={{
              stroke: BUS_COLOR,
              strokeWidth: 3,
              fill: 'none',
              style: { pointerEvents: 'none' },
            }}
            styleCallback={() => ({
              stroke: BUS_COLOR,
              strokeWidth: 3,
              fill: 'none',
              style: { pointerEvents: 'none' },
            })}
          />
        )}
        <Marker
          width={28}
          anchor={[lat, lon]}
          color={ORIGIN_COLOR}
        />
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            width={selectedId === stop.id ? 36 : 28}
            anchor={[stop.lat, stop.lon]}
            color={isTubeStop(stop) ? TUBE_COLOR : BUS_COLOR}
            onClick={({ event }) => {
              event.stopPropagation()
              onStopClick(stop)
            }}
          />
        ))}
      </Map>
    </div>
  )
}
