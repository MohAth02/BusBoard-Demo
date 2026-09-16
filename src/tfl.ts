const BASE = 'https://api.tfl.gov.uk'
export const SEARCH_RADIUS_M = 500

export type Stop = {
  id: string
  name: string
  lat: number
  lon: number
  modes: string[]
  stopType: string
}

export function isTubeStop(stop: Stop): boolean {
  return stop.modes.includes('tube') || stop.stopType === 'NaptanMetroStation'
}

export type Arrival = {
  id: string
  lineId: string
  lineName: string
  destinationName: string
  direction: string
  timeToStation: number
}

type StopPointJson = {
  naptanId?: string
  id?: string
  commonName?: string
  lat?: number
  lon?: number
  modes?: string[]
  stopType?: string
}

type NearbyJson = {
  stopPoints?: StopPointJson[]
}

type ArrivalJson = {
  id?: string
  lineId?: string
  lineName?: string
  destinationName?: string
  direction?: string
  timeToStation?: number
}

type SequenceStopJson = {
  lat?: number
  lon?: number
}

type SequenceJson = {
  lineStrings?: string[]
  stopPointSequences?: { stopPoint?: SequenceStopJson[] }[]
}

function withKey(url: URL) {
  const key = import.meta.env.VITE_TFL_APP_KEY
  if (typeof key === 'string' && key.length > 0) {
    url.searchParams.set('app_key', key)
  }
  return url
}

async function getJson<T>(url: URL): Promise<T> {
  const res = await fetch(withKey(url))
  if (!res.ok) {
    throw new Error(`TfL request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchNearbyStops(lat: number, lon: number): Promise<Stop[]> {
  const url = new URL('/StopPoint', BASE)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('radius', String(SEARCH_RADIUS_M))
  url.searchParams.set('stopTypes', 'NaptanPublicBusCoachTram,NaptanMetroStation')
  url.searchParams.set('modes', 'bus,tube')

  const data = await getJson<NearbyJson>(url)
  const stops: Stop[] = []

  for (const point of data.stopPoints ?? []) {
    const id = point.naptanId ?? point.id
    if (!id || point.lat == null || point.lon == null) continue
    stops.push({
      id,
      name: point.commonName ?? 'Stop',
      lat: point.lat,
      lon: point.lon,
      modes: point.modes ?? [],
      stopType: point.stopType ?? '',
    })
  }

  return stops
}

export async function fetchArrivals(stopId: string): Promise<Arrival[]> {
  const url = new URL(`/StopPoint/${encodeURIComponent(stopId)}/Arrivals`, BASE)
  const data = await getJson<ArrivalJson[]>(url)

  return data
    .filter((item) => item.timeToStation != null)
    .map((item) => ({
      id: item.id ?? `${item.lineName}-${item.timeToStation}`,
      lineId: item.lineId ?? '',
      lineName: item.lineName ?? '—',
      destinationName: item.destinationName ?? 'Unknown',
      direction: item.direction === 'inbound' ? 'inbound' : 'outbound',
      timeToStation: item.timeToStation ?? 0,
    }))
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, 8)
}

export function formatWait(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins <= 0) return 'due'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

function firstLineCoords(value: unknown): [number, number][] {
  if (!Array.isArray(value) || value.length === 0) return []
  const first = value[0]
  if (typeof first === 'number') return []
  if (Array.isArray(first) && typeof first[0] === 'number' && typeof first[1] === 'number') {
    const points: [number, number][] = []
    for (const pair of value) {
      if (!Array.isArray(pair) || typeof pair[0] !== 'number' || typeof pair[1] !== 'number') continue
      points.push([pair[1], pair[0]])
    }
    return points
  }
  for (const nested of value) {
    const found = firstLineCoords(nested)
    if (found.length > 1) return found
  }
  return []
}

export function routeKey(item: Arrival): string {
  return `${item.lineId}:${item.direction}`
}

export async function fetchLineRoute(lineId: string, direction: string): Promise<[number, number][]> {
  const dir = direction === 'inbound' ? 'inbound' : 'outbound'
  const url = new URL(`/Line/${encodeURIComponent(lineId)}/Route/Sequence/${dir}`, BASE)
  const data = await getJson<SequenceJson>(url)

  for (const raw of data.lineStrings ?? []) {
    try {
      const points = firstLineCoords(JSON.parse(raw) as unknown)
      if (points.length > 1) return points
    } catch {
      // try the next string
    }
  }

  const stops = data.stopPointSequences?.[0]?.stopPoint ?? []
  const fromStops: [number, number][] = []
  for (const stop of stops) {
    if (stop.lat == null || stop.lon == null) continue
    fromStops.push([stop.lat, stop.lon])
  }
  return fromStops
}
