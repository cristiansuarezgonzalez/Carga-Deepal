import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Fuel, Plus, Trash2, Calendar, X } from 'lucide-react';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const STORAGE_KEY = 'deepal-tracker-entries';

const fmtCOP = (n) => {
  const v = Math.round(n || 0);
  return '$' + v.toLocaleString('es-CO');
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('mensual'); // mensual | anual
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [modal, setModal] = useState(null); // 'electric' | 'fuel' | null
  const [toast, setToast] = useState(null);

  // Carga inicial desde localStorage (persiste solo en este navegador/dispositivo)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch (e) {
      console.error('No se pudo leer el historial guardado', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = (next) => {
    setEntries(next);
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }
    setTimeout(() => setSaving(false), 300);
  };

  const addEntry = async (entry) => {
    const next = [...entries, { id: uid(), ...entry }].sort((a, b) => a.date.localeCompare(b.date));
    persist(next);
    setModal(null);
    setToast(entry.type === 'electric' ? 'Carga eléctrica registrada' : 'Carga de combustible registrada');
    setTimeout(() => setToast(null), 2200);
  };

  const deleteEntry = (id) => {
    persist(entries.filter(e => e.id !== id));
  };

  const years = useMemo(() => {
    const s = new Set(entries.map(e => new Date(e.date + 'T00:00:00').getFullYear()));
    s.add(now.getFullYear());
    return Array.from(s).sort((a, b) => b - a);
  }, [entries]);

  const inMonth = (e) => {
    const d = new Date(e.date + 'T00:00:00');
    return d.getFullYear() === selYear && d.getMonth() === selMonth;
  };
  const inYear = (e) => new Date(e.date + 'T00:00:00').getFullYear() === selYear;

  const scoped = view === 'mensual' ? entries.filter(inMonth) : entries.filter(inYear);

  const totals = useMemo(() => {
    let elCost = 0, elKwh = 0, fuCost = 0, fuGal = 0;
    scoped.forEach(e => {
      if (e.type === 'electric') { elCost += e.cost; elKwh += e.amount; }
      else { fuCost += e.cost; fuGal += e.amount; }
    });
    const total = elCost + fuCost;
    return { elCost, elKwh, fuCost, fuGal, total,
      elPct: total ? (elCost / total) * 100 : 50,
      fuPct: total ? (fuCost / total) * 100 : 50 };
  }, [scoped]);

  const chartData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const monthEntries = entries.filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getFullYear() === selYear && d.getMonth() === i;
      });
      const electrico = monthEntries.filter(e => e.type === 'electric').reduce((s, e) => s + e.cost, 0);
      const combustible = monthEntries.filter(e => e.type === 'fuel').reduce((s, e) => s + e.cost, 0);
      return { mes: m, electrico, combustible };
    });
  }, [entries, selYear]);

  const sortedScoped = [...scoped].sort((a, b) => b.date.localeCompare(a.date));

  const lastChargePercent = useMemo(() => {
    const withPct = sortedScoped.filter(e => e.type === 'electric' && e.batteryPercent != null);
    return withPct.length ? withPct[0].batteryPercent : null;
  }, [sortedScoped]);

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#12181B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8A9499', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Cargando datos…</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #17201F 0%, #101517 50%, #0D1113 100%)',
      color: '#EDEFEF',
      fontFamily: 'Inter, sans-serif',
      paddingBottom: 40
    }}>
      <style>{`
        .mono { font-family: 'JetBrains Mono', monospace; }
        .display { font-family: 'Space Grotesk', sans-serif; }
        button { font-family: inherit; cursor: pointer; }
        input, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #2A3338; border-radius: 4px; }
        @keyframes fillBar { from { width: 0%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .fade-up { animation: fadeUp 0.35s ease both; }
        .entry-row { transition: background 0.15s ease; }
        .entry-row:hover { background: #1D2529 !important; }
        .icon-btn { transition: transform 0.15s ease, background 0.15s ease; }
        .icon-btn:active { transform: scale(0.94); }
        .tab-btn { transition: all 0.2s ease; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '20px 18px 8px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.01em' }}>Deepal S07 <span style={{ color: '#8A9499', fontWeight: 500 }}>REEV</span></div>
            <div style={{ fontSize: 12, color: '#8A9499', marginTop: 2 }}>Control de energía y combustible</div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: saving ? '#F2A65A' : '#2FD7C4', boxShadow: saving ? '0 0 8px #F2A65A' : '0 0 8px #2FD7C4', transition: 'all 0.3s' }} title="Estado de sincronización" />
        </div>

        {/* View toggle + period selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#1B2328', borderRadius: 10, padding: 3, border: '1px solid #2A3338' }}>
            {['mensual', 'anual'].map(v => (
              <button key={v} onClick={() => setView(v)} className="tab-btn" style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: view === v ? '#2A3338' : 'transparent',
                color: view === v ? '#EDEFEF' : '#8A9499',
                fontSize: 13, fontWeight: 600, textTransform: 'capitalize'
              }}>{v}</button>
            ))}
          </div>

          {view === 'mensual' && (
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} style={{
              background: '#1B2328', border: '1px solid #2A3338', color: '#EDEFEF',
              borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600
            }}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          )}
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} style={{
            background: '#1B2328', border: '1px solid #2A3338', color: '#EDEFEF',
            borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600
          }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Signature: split energy gauge */}
        <div key={view + selMonth + selYear} className="fade-up" style={{
          background: '#161D20', border: '1px solid #232C30', borderRadius: 18, padding: '20px 20px 16px', marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#8A9499', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Gasto total {view === 'mensual' ? MONTHS[selMonth] : selYear}
            </span>
            <span className="mono" style={{ fontSize: 26, fontWeight: 600 }}>{fmtCOP(totals.total)}</span>
          </div>

          <div style={{ height: 14, borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#0E1315', border: '1px solid #232C30' }}>
            <div style={{
              width: `${totals.elPct}%`, background: 'linear-gradient(90deg, #1FB89E, #2FD7C4)',
              animation: 'fillBar 0.7s ease', transition: 'width 0.5s ease'
            }} />
            <div style={{
              width: `${totals.fuPct}%`, background: 'linear-gradient(90deg, #F2A65A, #E08A3A)',
              animation: 'fillBar 0.7s ease', transition: 'width 0.5s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Zap size={13} color="#2FD7C4" strokeWidth={2.5} />
                <span style={{ fontSize: 12, color: '#8A9499', fontWeight: 600 }}>Eléctrico</span>
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: '#2FD7C4' }}>{fmtCOP(totals.elCost)}</div>
              <div style={{ fontSize: 11, color: '#5A6570' }}>{totals.elKwh.toFixed(1)} kWh</div>
              {lastChargePercent != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={{ width: 40, height: 6, borderRadius: 4, background: '#0E1315', border: '1px solid #232C30', overflow: 'hidden' }}>
                    <div style={{ width: `${lastChargePercent}%`, height: '100%', background: 'linear-gradient(90deg, #1FB89E, #2FD7C4)', transition: 'width 0.5s ease' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: '#5A6570' }}>{lastChargePercent}% última carga</span>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#8A9499', fontWeight: 600 }}>Combustible</span>
                <Fuel size={13} color="#F2A65A" strokeWidth={2.5} />
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: '#F2A65A' }}>{fmtCOP(totals.fuCost)}</div>
              <div style={{ fontSize: 11, color: '#5A6570' }}>{totals.fuGal.toFixed(1)} gal</div>
            </div>
          </div>
        </div>

        {/* Add buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setModal('electric')} className="icon-btn" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#152420', border: '1px solid #1FB89E44', borderRadius: 12, padding: '13px', color: '#2FD7C4', fontWeight: 700, fontSize: 13.5
          }}>
            <Plus size={16} strokeWidth={2.5} /> Carga eléctrica
          </button>
          <button onClick={() => setModal('fuel')} className="icon-btn" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#241B12', border: '1px solid #F2A65A44', borderRadius: 12, padding: '13px', color: '#F2A65A', fontWeight: 700, fontSize: 13.5
          }}>
            <Plus size={16} strokeWidth={2.5} /> Combustible
          </button>
        </div>

        {/* Yearly chart, only relevant view */}
        {view === 'anual' && (
          <div style={{ background: '#161D20', border: '1px solid #232C30', borderRadius: 18, padding: '16px 8px 10px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#8A9499', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '0 12px 10px' }}>
              Por mes · {selYear}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232C30" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#8A9499', fontSize: 11 }} axisLine={{ stroke: '#232C30' }} tickLine={false} />
                <YAxis tick={{ fill: '#8A9499', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                <Tooltip
                  contentStyle={{ background: '#1B2328', border: '1px solid #2A3338', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#EDEFEF', fontWeight: 600 }}
                  formatter={(v, n) => [fmtCOP(v), n === 'electrico' ? 'Eléctrico' : 'Combustible']}
                />
                <Bar dataKey="electrico" stackId="a" fill="#2FD7C4" radius={[0,0,0,0]} />
                <Bar dataKey="combustible" stackId="a" fill="#F2A65A" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Log */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#8A9499', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} /> Registros {view === 'mensual' ? `de ${MONTHS[selMonth]}` : `de ${selYear}`}
          </div>

          {sortedScoped.length === 0 && (
            <div style={{ background: '#161D20', border: '1px dashed #2A3338', borderRadius: 14, padding: '28px 16px', textAlign: 'center', color: '#5A6570', fontSize: 13 }}>
              Sin registros todavía. Agrega tu primera carga arriba.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sortedScoped.map(e => (
              <div key={e.id} className="entry-row" style={{
                display: 'flex', alignItems: 'center', gap: 12, background: '#161D20',
                border: '1px solid #202A2E', borderRadius: 12, padding: '11px 12px'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: e.type === 'electric' ? '#152420' : '#241B12',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {e.type === 'electric'
                    ? <Zap size={15} color="#2FD7C4" strokeWidth={2.5} />
                    : <Fuel size={15} color="#F2A65A" strokeWidth={2.5} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {e.type === 'electric' ? `${e.amount} kWh` : `${e.amount} gal`}
                    {e.type === 'electric' && e.batteryPercent != null ? (
                      <span style={{ color: '#2FD7C4', fontWeight: 600 }}> · {e.batteryPercent}%</span>
                    ) : null}
                    {e.note ? <span style={{ color: '#5A6570', fontWeight: 400 }}> · {e.note}</span> : null}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#5A6570' }}>
                    {new Date(e.date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {e.odometer ? ` · ${e.odometer.toLocaleString('es-CO')} km` : ''}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: e.type === 'electric' ? '#2FD7C4' : '#F2A65A', whiteSpace: 'nowrap' }}>
                  {fmtCOP(e.cost)}
                </div>
                <button onClick={() => deleteEntry(e.id)} className="icon-btn" style={{
                  background: 'transparent', border: 'none', color: '#5A6570', padding: 4, borderRadius: 6, flexShrink: 0
                }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <EntryModal
          type={modal}
          onClose={() => setModal(null)}
          onSave={addEntry}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', animation: 'toastIn 0.25s ease',
          background: '#1B2328', border: '1px solid #2A3338', color: '#EDEFEF',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function EntryModal({ type, onClose, onSave }) {
  const isElectric = type === 'electric';
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [batteryPercent, setBatteryPercent] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const accent = isElectric ? '#2FD7C4' : '#F2A65A';
  const accentBg = isElectric ? '#152420' : '#241B12';

  const handleSave = async () => {
    const amountNum = parseFloat(String(amount).replace(',', '.'));
    const costNum = parseFloat(String(cost).replace(',', '.'));

    if (!date) { setError('Falta la fecha.'); return; }
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      setError(isElectric ? 'Ingresa la energía en kWh.' : 'Ingresa el volumen en galones.');
      return;
    }
    if (!cost || !Number.isFinite(costNum) || costNum <= 0) {
      setError('Ingresa el costo en pesos.');
      return;
    }
    let pctNum;
    if (isElectric && batteryPercent) {
      pctNum = parseFloat(String(batteryPercent).replace(',', '.'));
      if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
        setError('El porcentaje de carga debe estar entre 0 y 100.');
        return;
      }
    }

    setError('');
    setBusy(true);
    try {
      await onSave({
        type,
        date,
        amount: amountNum,
        cost: costNum,
        odometer: odometer ? parseFloat(String(odometer).replace(',', '.')) : undefined,
        batteryPercent: isElectric && pctNum != null ? Math.round(pctNum) : undefined,
        note: note.trim() || undefined
      });
    } catch (e) {
      setError('No se pudo guardar. Intenta de nuevo.');
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(8,10,11,0.7)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50
    }}>
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{
        width: '100%', maxWidth: 480, background: '#161D20', border: '1px solid #232C30',
        borderRadius: '20px 20px 0 0', padding: '18px 20px 28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isElectric ? <Zap size={15} color={accent} strokeWidth={2.5} /> : <Fuel size={15} color={accent} strokeWidth={2.5} />}
            </div>
            <span className="display" style={{ fontSize: 16, fontWeight: 700 }}>
              {isElectric ? 'Carga eléctrica' : 'Carga de combustible'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: '#1B2328', border: 'none', borderRadius: 8, padding: 6, color: '#8A9499' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Fecha">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label={isElectric ? 'Energía (kWh)' : 'Volumen (gal)'}>
              <input type="number" inputMode="decimal" step="0.01" placeholder={isElectric ? '31.7' : '11'} value={amount}
                onChange={e => { setAmount(e.target.value); if (error) setError(''); }} style={inputStyle} />
            </Field>
            <Field label="Costo (COP)">
              <input type="number" inputMode="numeric" placeholder="150000" value={cost}
                onChange={e => { setCost(e.target.value); if (error) setError(''); }} style={inputStyle} />
            </Field>
          </div>
          {isElectric && (
            <Field label="Porcentaje final de carga (%) · opcional">
              <input type="number" inputMode="numeric" min="0" max="100" placeholder="80" value={batteryPercent}
                onChange={e => { setBatteryPercent(e.target.value); if (error) setError(''); }} style={inputStyle} />
            </Field>
          )}
          <Field label="Odómetro (km) · opcional">
            <input type="number" inputMode="numeric" placeholder="12500" value={odometer}
              onChange={e => setOdometer(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Nota · opcional">
            <input type="text" placeholder={isElectric ? 'Casa, EDS, centro comercial...' : 'Terpel, EDS...'} value={note}
              onChange={e => setNote(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#F2745A', fontWeight: 500 }}>{error}</div>
        )}

        <button type="button" onClick={handleSave} disabled={busy} style={{
          width: '100%', marginTop: 14, padding: '14px', borderRadius: 12, border: 'none',
          background: accent, color: '#0D1113', opacity: busy ? 0.6 : 1,
          fontWeight: 700, fontSize: 14, transition: 'opacity 0.2s'
        }}>
          {busy ? 'Guardando…' : 'Guardar registro'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11.5, color: '#8A9499', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: '#0E1315', border: '1px solid #232C30', borderRadius: 10,
  padding: '11px 12px', color: '#EDEFEF', fontSize: 14, width: '100%', outline: 'none'
};
