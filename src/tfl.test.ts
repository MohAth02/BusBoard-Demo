import { describe, expect, it, vi } from 'vitest'
import {
  fetchArrivals,
  formatWait,
  isTubeStop,
  routeKey,
  type Arrival,
  type Stop,
} from './tfl'

function stop(partial: Partial<Stop>): Stop {
  return {
    id: '1',
    name: 'Stop',
    lat: 51.55,
    lon: -0.14,
    modes: [],
    stopType: '',
    ...partial,
  }
}

function arrival(partial: Partial<Arrival>): Arrival {
  return {
    id: 'a',
    lineId: 'northern',
    lineName: 'Northern',
    destinationName: 'Morden',
    direction: 'outbound',
    timeToStation: 60,
    ...partial,
  }
}

describe('formatWait', () => {
  it('shows due for under half a minute', () => {
    expect(formatWait(0)).toBe('due')
    expect(formatWait(20)).toBe('due')
  })

  it('shows minutes for later arrivals', () => {
    expect(formatWait(60)).toBe('1 min')
    expect(formatWait(180)).toBe('3 min')
  })
})

describe('isTubeStop', () => {
  it('treats tube mode or metro stop type as tube', () => {
    expect(isTubeStop(stop({ modes: ['tube'] }))).toBe(true)
    expect(isTubeStop(stop({ stopType: 'NaptanMetroStation' }))).toBe(true)
    expect(isTubeStop(stop({ modes: ['bus'] }))).toBe(false)
  })
})

describe('routeKey', () => {
  it('joins line and direction', () => {
    expect(routeKey(arrival({ lineId: '24', direction: 'inbound' }))).toBe('24:inbound')
  })
})

describe('fetchArrivals', () => {
  it('sorts, keeps eight, and maps TfL fields', async () => {
    const payload = [
      { id: 'late', lineId: '24', lineName: '24', destinationName: 'Pimlico', direction: 'outbound', timeToStation: 400 },
      { id: 'soon', lineId: 'northern', lineName: 'Northern', destinationName: 'Morden', direction: 'inbound', timeToStation: 40 },
      { lineName: 'skip-me' },
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `n${i}`,
        lineId: 'n',
        lineName: 'N',
        destinationName: 'x',
        direction: 'outbound',
        timeToStation: 50 + i,
      })),
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    )

    const list = await fetchArrivals('940GZZLUKTN')
    expect(list[0]?.id).toBe('soon')
    expect(list[0]?.direction).toBe('inbound')
    expect(list).toHaveLength(8)
    expect(list.some((item) => item.lineName === 'skip-me')).toBe(false)

    vi.unstubAllGlobals()
  })
})
