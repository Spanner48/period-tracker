import { useMemo, useState } from "react";
import "./App.css";

const WEEK_START = 1; // 0 = Sunday, 1 = Monday

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function App() {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
        new Date(viewDate)
      ),
    [viewDate]
  );
  const dowFmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "short" }),
    []
  );

  // Compute start of the visible 6x7 grid
  const firstOfMonth = useMemo(
    () => new Date(viewDate.getFullYear(), viewDate.getMonth(), 1),
    [viewDate]
  );
  const startOffset = ((firstOfMonth.getDay() - WEEK_START + 7) % 7);
  const gridStart = useMemo(() => addDays(firstOfMonth, -startOffset), [firstOfMonth, startOffset]);

  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart]
  );

  const baseForNames = useMemo(() => {
    // 2021-01-03 is a Sunday; +WEEK_START gives Monday when WEEK_START=1
    return new Date(2021, 0, 3 + WEEK_START);
  }, []);
  const dayNames = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dowFmt.format(addDays(baseForNames, i))),
    [dowFmt, baseForNames]
  );

  const prev = () => setViewDate(d => addMonths(d, -1));
  const next = () => setViewDate(d => addMonths(d, 1));
  const todayBtn = () =>
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const onWheel = (e) => {
    if (e.deltaY > 0) next();
    else if (e.deltaY < 0) prev();
  };

  return (
    <div className="calendar-wrapper" onWheel={onWheel}>
      <header className="cal-header">
        <button className="nav" onClick={prev} aria-label="Previous month">‹</button>
        <div className="title" aria-live="polite">{monthLabel}</div>
        <button className="nav" onClick={next} aria-label="Next month">›</button>
        <button className="today" onClick={todayBtn}>Today</button>
      </header>

      <div className="grid grid-dow" role="row">
        {dayNames.map((name, i) => (
          <div key={i} className="dow">{name}</div>
        ))}
      </div>

      <div className="grid grid-days" role="grid">
        {days.map((d, i) => {
          const isOther = d.getMonth() !== viewDate.getMonth();
          const isToday = sameDay(d, today);
          return (
            <div
              key={i}
              className={`day ${isOther ? "is-other" : ""} ${isToday ? "is-today" : ""}`}
              role="gridcell"
              aria-selected={isToday ? "true" : "false"}
              aria-label={d.toDateString()}
              tabIndex={0}
            >
              <span className="date">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      <p className="hint">Scroll to switch months. Weeks start on {WEEK_START === 1 ? "Monday" : "Sunday"}.</p>
    </div>
  );
}
