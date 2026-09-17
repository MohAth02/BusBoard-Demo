import type { Arrival, Stop } from './tfl'
import { crowdingLabel, formatWait, isTubeStop, routeKey } from './tfl'

type Props = {
  stop: Stop | null
  arrivals: Arrival[]
  loading: boolean
  error: string | null
  open: boolean
  selectedRoute: string | null
  crowding: number | null
  onToggle: () => void
  onRefresh: () => void
  onArrivalClick: (item: Arrival) => void
}

export function StopPanel({
  stop,
  arrivals,
  loading,
  error,
  open,
  selectedRoute,
  crowding,
  onToggle,
  onRefresh,
  onArrivalClick,
}: Props) {
  const title = stop?.name ?? 'Select a stop'
  const modes = stop?.modes.join(', ') ?? ''

  return (
    <aside className="panel">
      <div className="panel-header">
        <button className="panel-toggle" type="button" onClick={onToggle}>
          <h2>{title}</h2>
          <span>{open ? 'Hide' : 'Show'}</span>
        </button>
        {stop && (
          <button className="refresh" type="button" onClick={onRefresh}>
            Refresh
          </button>
        )}
      </div>
      {open && (
        <div className="panel-body">
          {!stop && <p className="status">Click a stop on the map.</p>}
          {stop && modes && <p className="meta">{modes}</p>}
          {stop && isTubeStop(stop) && crowding != null && (
            <div className="crowding">
              <p className="meta">{crowdingLabel(crowding)}</p>
              <div className="crowding-track">
                <div className="crowding-fill" style={{ width: `${crowding * 100}%` }} />
              </div>
            </div>
          )}
          {stop && loading && <p className="status">Loading arrivals…</p>}
          {stop && error && <p className="status">{error}</p>}
          {stop && !loading && !error && arrivals.length === 0 && (
            <p className="status">No upcoming arrivals.</p>
          )}
          {stop && arrivals.length > 0 && (
            <>
              <ul className="arrivals">
                {arrivals.map((item) => {
                  const key = routeKey(item)
                  const active = selectedRoute === key
                  return (
                    <li key={item.id}>
                      <button
                        className={active ? 'arrival active' : 'arrival'}
                        type="button"
                        onClick={() => onArrivalClick(item)}
                        disabled={!item.lineId}
                      >
                        <span>
                          <span className="line">{item.lineName}</span>
                          <span className="dest">{item.destinationName}</span>
                        </span>
                        <span className="mins">{formatWait(item.timeToStation)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="hint-inline">Click a line to show its route.</p>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
