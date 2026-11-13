import React, { useState, useEffect, useRef } from 'react';
import { StreamingTransaction } from '../data/customerData';
import { 
  Play, 
  Pause, 
  Flame, 
  Zap, 
  AlertTriangle, 
  Activity, 
  Radio, 
  Database, 
  ShieldAlert, 
  RotateCcw,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

interface StreamingDataProps {
  isStreaming: boolean;
  onToggleStreaming: () => void;
  transactions: StreamingTransaction[];
  onAddTransaction: (txn: StreamingTransaction) => void;
}

export const StreamingData: React.FC<StreamingDataProps> = ({
  isStreaming,
  onToggleStreaming,
  transactions,
  onAddTransaction,
}) => {
  const [streamSpeed, setStreamSpeed] = useState<number>(1000); // ms per event
  const [injectedCount, setInjectedCount] = useState<number>(0);
  const [activePartition, setActivePartition] = useState<number | 'all'>('all');
  const [postgresSinkEvents, setPostgresSinkEvents] = useState<number>(1420);
  const [hdfsSinkBlocks, setHdfsSinkBlocks] = useState<number>(38);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate realistic synthetic transaction
  const generateRandomTransaction = (forceAnomaly: boolean = false): StreamingTransaction => {
    const cities: StreamingTransaction['city'][] = [
      'New York',
      'Los Angeles',
      'Chicago',
      'San Francisco',
      'Houston',
      'Miami',
    ];
    const memberships: StreamingTransaction['membership_type'][] = ['Bronze', 'Silver', 'Gold'];

    const id = 1000 + Math.floor(Math.random() * 380);
    const city = cities[Math.floor(Math.random() * cities.length)];
    const membership = memberships[Math.floor(Math.random() * memberships.length)];
    const items = Math.floor(Math.random() * 8) + 1;

    let baseAmount = Math.round(items * (40 + Math.random() * 90) * (membership === 'Gold' ? 2.5 : 1.2));
    let rating = Number((3.0 + Math.random() * 2.0).toFixed(1));
    let is_anomaly = forceAnomaly || Math.random() < 0.08;
    let anomaly_reason = undefined;

    if (is_anomaly) {
      if (Math.random() > 0.5) {
        baseAmount = Math.round(baseAmount * 5.5 + 1200);
        anomaly_reason = 'SURGE_SPEND_OUTLIER ($1500+ threshold)';
      } else {
        rating = 1.0;
        anomaly_reason = 'ACUTE_DISSATISFACTION_DROP (1.0 rating alert)';
      }
    }

    const partition = Math.floor(Math.random() * 3); // 3 partitions: 0, 1, 2
    const offset = transactions.length + 10420;

    return {
      event_id: `EVT-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString(),
      customer_id: `CUST-${id}`,
      city,
      membership_type: membership,
      amount: baseAmount,
      items_count: items,
      rating,
      is_anomaly,
      anomaly_reason,
      partition,
      offset,
    };
  };

  // Streaming interval loop
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        const newTxn = generateRandomTransaction(false);
        onAddTransaction(newTxn);
        setPostgresSinkEvents((prev) => prev + 1);
        if (Math.random() < 0.15) {
          setHdfsSinkBlocks((prev) => prev + 1);
        }
      }, streamSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming, streamSpeed, onAddTransaction]);

  const handleInjectAnomaly = () => {
    const anomaly = generateRandomTransaction(true);
    onAddTransaction(anomaly);
    setInjectedCount((prev) => prev + 1);
    setPostgresSinkEvents((prev) => prev + 1);
  };

  // Recent 30-second window metrics
  const recentEvents = transactions.slice(-25);
  const anomaliesList = transactions.filter((t) => t.is_anomaly).slice(-10);
  const windowRevenue = recentEvents.reduce((s, t) => s + t.amount, 0);
  const avgOrderValue = recentEvents.length
    ? Math.round(windowRevenue / recentEvents.length)
    : 0;

  // Filtered by partition
  const displayEvents = recentEvents.filter((t) => {
    if (activePartition === 'all') return true;
    return t.partition === activePartition;
  });

  return (
    <div className="space-y-6">
      {/* Title & Real-Time Overview */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5">
          <span>PATH: /Main/For Streaming-data</span>
          <span aria-hidden="true">·</span>
          <span>KAFKA 2.12 + SPARK STREAMING + POSTGRESQL / HDFS SINK</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Real-Time E-Commerce Streaming Architecture
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Captures live customer purchases, evaluates real-time anomaly heuristics with Apache Spark Streaming, and buffers micro-batches into PostgreSQL and Hadoop HDFS.
        </p>
      </div>

      {/* Streaming Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Stream Toggle & Rate */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleStreaming}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm ${
              isStreaming
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Kafka Producer</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Real-Time Stream</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs font-mono">
            <span className="text-slate-400 px-2">Velocity:</span>
            <button
              onClick={() => setStreamSpeed(1500)}
              className={`px-2 py-1 rounded ${
                streamSpeed === 1500 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              0.7x
            </button>
            <button
              onClick={() => setStreamSpeed(800)}
              className={`px-2 py-1 rounded ${
                streamSpeed === 800 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              1.2x
            </button>
            <button
              onClick={() => setStreamSpeed(300)}
              className={`px-2 py-1 rounded ${
                streamSpeed === 300 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              3.5x Burst
            </button>
          </div>
        </div>

        {/* Right: Anomaly Injector */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleInjectAnomaly}
            className="px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Inject Outlier / Anomaly ({injectedCount})</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Kafka Ingestion Rate</span>
            <Radio className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1 tabular-nums">
            {isStreaming ? (1000 / streamSpeed).toFixed(1) : '0.0'}{' '}
            <span className="text-xs font-normal text-slate-400">events/sec</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Topic: ecommerce.transactions.v1
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sliding 30s Revenue</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1 tabular-nums">
            ${windowRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Avg Order: ${avgOrderValue}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Spark Streaming Latency</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1 tabular-nums">
            8.4 <span className="text-xs font-normal text-slate-400">ms / microbatch</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Watermark: 1m delay threshold
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Detected Outliers</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1 tabular-nums">
            {transactions.filter((t) => t.is_anomaly).length}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Surge spend or rating alert
          </div>
        </div>
      </div>

      {/* Main Stream Activity & Partition Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Event Stream Table (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <h3 className="text-sm font-semibold text-white">
                Live Transaction Stream (Kafka Consumer Group)
              </h3>
            </div>

            {/* Partition filter buttons */}
            <div className="flex items-center gap-1 text-xs font-mono">
              <span className="text-slate-400 mr-1">Partition:</span>
              {(['all', 0, 1, 2] as const).map((p) => (
                <button
                  key={String(p)}
                  onClick={() => setActivePartition(p)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activePartition === p
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === 'all' ? 'All' : `P-${p}`}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2.5">Time</th>
                  <th className="py-2 px-2.5">Event ID</th>
                  <th className="py-2 px-2.5">Customer</th>
                  <th className="py-2 px-2.5">City</th>
                  <th className="py-2 px-2.5">Tier</th>
                  <th className="py-2 px-2.5 text-right">Amount</th>
                  <th className="py-2 px-2.5 text-right">Items</th>
                  <th className="py-2 px-2.5 text-right">Rating</th>
                  <th className="py-2 px-2.5">Partition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayEvents.map((t) => (
                  <tr
                    key={t.event_id}
                    className={`transition-colors ${
                      t.is_anomaly
                        ? 'bg-rose-950/20 text-rose-300'
                        : 'hover:bg-slate-800/30 text-slate-200'
                    }`}
                  >
                    <td className="py-2 px-2.5 text-slate-400">{t.timestamp}</td>
                    <td className="py-2 px-2.5 font-semibold text-blue-400">{t.event_id}</td>
                    <td className="py-2 px-2.5 text-white font-semibold">{t.customer_id}</td>
                    <td className="py-2 px-2.5 text-slate-300 font-sans">{t.city}</td>
                    <td className="py-2 px-2.5">
                      <span
                        className={
                          t.membership_type === 'Gold'
                            ? 'text-amber-400'
                            : t.membership_type === 'Silver'
                            ? 'text-slate-300'
                            : 'text-amber-600'
                        }
                      >
                        {t.membership_type}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold tabular-nums">
                      ${t.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums">{t.items_count}</td>
                    <td className="py-2 px-2.5 text-right tabular-nums">
                      <span
                        className={
                          t.rating < 2.5
                            ? 'text-rose-400'
                            : t.rating > 4.0
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }
                      >
                        {t.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-400 font-mono">
                      p{t.partition}:{t.offset}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Sinks & Anomaly Watchdog (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Storage Sinks Status */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Stream Storage Sinks</h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>PostgreSQL Sink</span>
                  </div>
                  <span className="text-emerald-400 text-[10px]">CONNECTED</span>
                </div>
                <div className="mt-2 flex justify-between text-slate-400">
                  <span>Table:</span>
                  <span className="text-white">realtime_transactions</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Committed Rows:</span>
                  <span className="text-blue-400 font-bold tabular-nums">
                    {postgresSinkEvents.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hadoop HDFS Parquet Sink</span>
                  </div>
                  <span className="text-emerald-400 text-[10px]">ACTIVE</span>
                </div>
                <div className="mt-2 flex justify-between text-slate-400">
                  <span>HDFS Path:</span>
                  <span className="text-white">/streaming/checkpoints/</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Blocks Flushed:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {hdfsSinkBlocks} parquet files
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Anomaly Detection Watchdog */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-white">Spark Anomaly Engine</h3>
              </div>
              <span className="text-xs font-mono text-rose-400">Live Filters</span>
            </div>

            <p className="text-xs text-slate-400">
              Flags velocity spikes, sudden single-item spend surges &gt;$1,500, or acute rating drops.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {anomaliesList.length === 0 ? (
                <div className="text-xs font-mono text-slate-500 py-3 text-center">
                  No anomalies detected in current window.
                </div>
              ) : (
                anomaliesList.map((a) => (
                  <div
                    key={a.event_id}
                    className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs font-mono space-y-1"
                  >
                    <div className="flex justify-between text-rose-300 font-bold">
                      <span>{a.customer_id}</span>
                      <span>${a.amount}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {a.anomaly_reason || 'Outlier detected by heuristic'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
