import { useEffect, useRef, useMemo, useState } from "react";
import "./App.css";

// ---- Utilities ----
const WEEK_START = 1; // 1 = Monday, 0 = Sunday
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; // local-date ISO
const sameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth()+n, 1);

function monthGrid(viewMonth) {
  const first = startOfMonth(viewMonth);
  const startOffset = (first.getDay() - WEEK_START + 7) % 7;
  const gridStart = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function predictPeriods(lastStartISO, cycleLength, periodLength, count = 3) {
  if (!lastStartISO || !cycleLength || !periodLength) return [];
  const [y,m,dd] = lastStartISO.split("-").map(Number);
  const lastStart = new Date(y, m-1, dd);
  const preds = [];
  for (let i=1; i<=count; i++) {
    const start = addDays(lastStart, i*cycleLength);
    const days = Array.from({length: periodLength}, (_,k)=> toISO(addDays(start,k)));
    preds.push({ start: toISO(start), days });
  }
  return preds;
}

// LocalStorage hook
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch { return initialValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  // Tracked settings
  const [cycleLength, setCycleLength] = useLocalStorage("pt.cycleLength", 28);

  // Empty-able period length UX
  const [periodLengthInput, setPeriodLengthInput] = useLocalStorage("pt.periodLengthInput", "5");
  const periodLength = useMemo(() => {
    const n = parseInt(periodLengthInput, 10);
    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : null;
  }, [periodLengthInput]);
  const periodLengthError =
    periodLengthInput === "" ? "Period length is required"
    : (periodLength === null ? "Enter a number 1–10" : "");

  const [lastStartISO, setLastStartISO] = useLocalStorage("pt.lastStartISO", toISO(today));

  // Marked period days
  const [markedDays, setMarkedDays] = useLocalStorage("pt.markedDays", []);
  const markedSet = useMemo(() => new Set(markedDays), [markedDays]);

  // Predictions
  const predictions = useMemo(() => {
    if (periodLength === null) return [];
    return predictPeriods(lastStartISO, Number(cycleLength), periodLength, 4);
  }, [lastStartISO, cycleLength, periodLength]);
  const predictedSet = useMemo(() => new Set(predictions.flatMap(p=>p.days)), [predictions]);

  const grid = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(viewMonth),
    [viewMonth]
  );
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "short" }), []);
  const baseForNames = useMemo(() => new Date(2021,0,3 + WEEK_START), []);
  const dayNames = useMemo(() => Array.from({length:7}, (_,i)=> weekdayFmt.format(addDays(baseForNames,i))), [weekdayFmt, baseForNames]);

  // Nav
  const prev = () => setViewMonth(m => addMonths(m, -1));
  const next = () => setViewMonth(m => addMonths(m, +1));
  const jumpToday = () => setViewMonth(startOfMonth(today));

  // Toggle mark
  const toggleDay = (d) => {
    const iso = toISO(d);
    const next = new Set(markedSet);
    if (next.has(iso)) next.delete(iso); else next.add(iso);
    setMarkedDays(Array.from(next).sort());
  };

  // Start today
  const startToday = () => {
    if (periodLength === null) return;
    const iso = toISO(today);
    setLastStartISO(iso);
    const next = new Set(markedSet);
    for (let i = 0; i < periodLength; i++) next.add(toISO(addDays(today, i)));
    setMarkedDays(Array.from(next).sort());
  };

  const clearAll = () => { setMarkedDays([]); };

  // ---- MOVE THESE INSIDE THE COMPONENT ----

  // Extend or trim ONLY the current cycle window based on delta
  const adjustMarksDelta = (newLen, prevLen) => {
    const start = new Date(lastStartISO);

    if (newLen > prevLen) {
      const toAdd = Array.from(
        { length: newLen - prevLen },
        (_, i) => toISO(addDays(start, prevLen + i))
      );
      setMarkedDays(prev => Array.from(new Set([...prev, ...toAdd])).sort());
    } else if (newLen < prevLen) {
      const toRemove = new Set(
        Array.from({ length: prevLen - newLen },
          (_, i) => toISO(addDays(start, newLen + i))
        )
      );
      setMarkedDays(prev => prev.filter(iso => !toRemove.has(iso)));
    }
  };

  // Remember last valid period length
  const prevValidPeriodLenRef = useRef(periodLength ?? undefined);
  useEffect(() => {
    if (periodLength !== null) prevValidPeriodLenRef.current = periodLength;
  }, [periodLength]);

  // -----------------------------------------

  return (
    <div className="calendar-wrapper">
      {/* Use public asset path or import */}
      <img
        src="/periodt-logo.svg"
        alt="Periodt."
        height="36"
        className="brand-logo"
        style={{ display: "block", marginInline: "auto" }}
      />

      <header className="cal-header">
        <button className="nav" onClick={prev} aria-label="Previous month">‹</button>
        <div className="title" aria-live="polite">{monthLabel}</div>
        <button className="nav" onClick={next} aria-label="Next month">›</button>
        <button className="today" onClick={jumpToday}>Today</button>
      </header>

      <section className="controls">
        <label>
          Cycle length (days)
          <input
            type="number"
            min={20}
            max={60}
            value={cycleLength}
            onChange={e=>setCycleLength(Number(e.target.value)||28)}
          />
        </label>

        <label>
          Period length (days)
          <input
            type="number"
            min={1}
            max={10}
            placeholder="e.g. 5"
            value={periodLengthInput}
            onChange={(e) => {
              const v = e.target.value;   // allow ""
              setPeriodLengthInput(v);

              const n = parseInt(v, 10);
              if (Number.isFinite(n) && n >= 1 && n <= 10) {
                const prev = prevValidPeriodLenRef.current ?? 0;
                adjustMarksDelta(n, prev);
                prevValidPeriodLenRef.current = n;
              }
            }}
            aria-invalid={periodLength === null}
          />
          {periodLength === null && (
            <div className="field-error">⚠ Period length is required (1–10)</div>
          )}
        </label>

        <label>
          Last period start
          <input
            type="date"
            value={lastStartISO}
            onChange={e=>setLastStartISO(e.target.value)}
          />
        </label>

        <button
          className="primary"
          onClick={startToday}
          disabled={periodLength === null}
          title={periodLength === null ? "Set period length (1–10)" : undefined}
        >
          Start today
        </button>

        <button className="ghost" onClick={clearAll}>Clear marked days</button>
      </section>

      <div className="grid grid-dow" role="row">
        {dayNames.map((name, i) => (
          <div key={i} className="dow">{name}</div>
        ))}
      </div>

      <div className="grid grid-days" role="grid">
        {grid.map((d, i) => {
          const isOther = d.getMonth() !== viewMonth.getMonth();
          const isToday = sameDay(d, today);
          const iso = toISO(d);
          const isMarked = markedSet.has(iso);
          const isPred = periodLength !== null && predictedSet.has(iso);
          return (
            <button
              key={i}
              className={`day ${isOther?"is-other":""} ${isToday?"is-today":""} ${isMarked?"is-marked":""} ${isPred?"is-pred":""}`}
              onClick={() => toggleDay(d)}
              title={iso}
            >
              <span className="date">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <section className="legend">
        <span className="legend-item"><span className="dot marked"/> Marked period</span>
        <span className="legend-item"><span className="dot pred"/> Predicted</span>
        <span className="legend-item"><span className="dot today"/> Today</span>
      </section>

      {predictions.length>0 && (
        <section className="predictions">
          <h3>Upcoming cycles</h3>
          <ul>
            {predictions.map((p,idx)=> (
              <li key={idx}>Cycle {idx+1}: starts <strong>{p.start}</strong> ({periodLength ?? "?"} days)</li>
            ))}
          </ul>
        </section>
      )}

      <p className="hint">Tip: Click a day to toggle marking.</p>
    </div>
  );
}
