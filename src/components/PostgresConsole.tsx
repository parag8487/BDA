import React, { useState, useMemo } from 'react';
import { CustomerRecord, StreamingTransaction } from '../data/customerData';
import { 
  Database, 
  Play, 
  Terminal, 
  Download, 
  RotateCcw, 
  Table, 
  CheckCircle2,
  Clock
} from 'lucide-react';

interface PostgresConsoleProps {
  customers: CustomerRecord[];
  streamingTransactions: StreamingTransaction[];
}

export const PostgresConsole: React.FC<PostgresConsoleProps> = ({
  customers,
  streamingTransactions,
}) => {
  const PRESET_QUERIES = [
    {
      label: 'Q1: Segment Demographics & Spend',
      query: `SELECT city, membership_type, COUNT(*) as buyers, ROUND(AVG(total_spend), 2) as avg_spend, ROUND(AVG(items_purchased), 1) as avg_items\nFROM batch_customer_behavior\nGROUP BY city, membership_type\nORDER BY avg_spend DESC\nLIMIT 10;`,
    },
    {
      label: 'Q2: At-Risk Churn Queue (>45d & Not Satisfied)',
      query: `SELECT customer_id, city, membership_type, days_since_last_purchase, total_spend, satisfaction_level\nFROM batch_customer_behavior\nWHERE days_since_last_purchase > 45 AND satisfaction_level != 'Satisfied'\nORDER BY total_spend DESC\nLIMIT 15;`,
    },
    {
      label: 'Q3: Gold Tier Satisfaction Correlation',
      query: `SELECT satisfaction_level, COUNT(*) as count, ROUND(AVG(average_rating), 2) as avg_rating, ROUND(AVG(total_spend), 2) as avg_spend\nFROM batch_customer_behavior\nWHERE membership_type = 'Gold'\nGROUP BY satisfaction_level;`,
    },
    {
      label: 'Real-Time Anomaly Sink',
      query: `SELECT event_id, customer_id, city, amount, rating, anomaly_reason\nFROM realtime_transactions\nWHERE is_anomaly = true\nORDER BY amount DESC\nLIMIT 10;`,
    },
  ];

  const [activeQuery, setActiveQuery] = useState<string>(PRESET_QUERIES[0].query);
  const [executionTime, setExecutionTime] = useState<number>(14.2);
  const [resultRows, setResultRows] = useState<any[]>([]);
  const [resultColumns, setResultColumns] = useState<string[]>([]);

  // Execute query handler
  const executeSQL = (sql: string) => {
    const startTime = performance.now();
    const normalized = sql.trim().toLowerCase();

    if (normalized.includes('realtime_transactions')) {
      const anomalies = streamingTransactions.filter((t) => t.is_anomaly);
      const cols = ['event_id', 'customer_id', 'city', 'amount', 'rating', 'anomaly_reason'];
      setResultColumns(cols);
      setResultRows(
        anomalies.slice(0, 15).map((a) => ({
          event_id: a.event_id,
          customer_id: a.customer_id,
          city: a.city,
          amount: `$${a.amount}`,
          rating: a.rating,
          anomaly_reason: a.anomaly_reason || 'Surge Spend Outlier',
        }))
      );
    } else if (normalized.includes('group by') && normalized.includes('city')) {
      const map: Record<string, { buyers: number; totalSpend: number; totalItems: number }> = {};
      customers.forEach((c) => {
        const key = `${c.city} - ${c.membership_type}`;
        if (!map[key]) map[key] = { buyers: 0, totalSpend: 0, totalItems: 0 };
        map[key].buyers += 1;
        map[key].totalSpend += c.total_spend;
        map[key].totalItems += c.items_purchased;
      });

      const cols = ['city_and_tier', 'buyers', 'avg_spend', 'avg_items'];
      setResultColumns(cols);
      setResultRows(
        Object.entries(map)
          .sort(([, a], [, b]) => b.totalSpend / b.buyers - a.totalSpend / a.buyers)
          .slice(0, 10)
          .map(([k, v]) => ({
            city_and_tier: k,
            buyers: v.buyers,
            avg_spend: `$${Math.round(v.totalSpend / v.buyers).toLocaleString()}`,
            avg_items: (v.totalItems / v.buyers).toFixed(1),
          }))
      );
    } else if (normalized.includes('group by satisfaction_level')) {
      const tierMatch = normalized.match(/membership_type\s*=\s*'(gold|silver|bronze)'/);
      const subset = tierMatch
        ? customers.filter((c) => c.membership_type.toLowerCase() === tierMatch[1])
        : customers;
      const map: Record<string, { count: number; totalRating: number; totalSpend: number }> = {};
      subset.forEach((c) => {
        if (!map[c.satisfaction_level]) map[c.satisfaction_level] = { count: 0, totalRating: 0, totalSpend: 0 };
        map[c.satisfaction_level].count += 1;
        map[c.satisfaction_level].totalRating += c.average_rating;
        map[c.satisfaction_level].totalSpend += c.total_spend;
      });

      const cols = ['satisfaction_level', 'count', 'avg_rating', 'avg_spend'];
      setResultColumns(cols);
      setResultRows(
        Object.entries(map).map(([level, v]) => ({
          satisfaction_level: level,
          count: v.count,
          avg_rating: (v.totalRating / v.count).toFixed(2),
          avg_spend: `$${Math.round(v.totalSpend / v.count).toLocaleString()}`,
        }))
      );
    } else if (normalized.includes('days_since_last_purchase > 45')) {
      const atRisk = customers
        .filter((c) => c.days_since_last_purchase > 45 && c.satisfaction_level !== 'Satisfied')
        .sort((a, b) => b.total_spend - a.total_spend)
        .slice(0, 15);

      const cols = [
        'customer_id',
        'city',
        'membership_type',
        'days_since_last_purchase',
        'total_spend',
        'satisfaction_level',
      ];
      setResultColumns(cols);
      setResultRows(
        atRisk.map((c) => ({
          customer_id: c.customer_id,
          city: c.city,
          membership_type: c.membership_type,
          days_since_last_purchase: `${c.days_since_last_purchase}d`,
          total_spend: `$${c.total_spend.toLocaleString()}`,
          satisfaction_level: c.satisfaction_level,
        }))
      );
    } else {
      // Default: show first 10 customers
      const cols = ['customer_id', 'city', 'membership_type', 'total_spend', 'satisfaction_level'];
      setResultColumns(cols);
      setResultRows(
        customers.slice(0, 10).map((c) => ({
          customer_id: c.customer_id,
          city: c.city,
          membership_type: c.membership_type,
          total_spend: `$${c.total_spend.toLocaleString()}`,
          satisfaction_level: c.satisfaction_level,
        }))
      );
    }

    setExecutionTime(Number((performance.now() - startTime + 8.5).toFixed(1)));
  };

  // Run initial query on mount
  React.useEffect(() => {
    executeSQL(activeQuery);
  }, [activeQuery, customers, streamingTransactions]);

  const exportResultsCSV = () => {
    if (!resultRows.length) return;
    const headerLine = resultColumns.join(',');
    const rowLines = resultRows.map((r) => resultColumns.map((col) => `"${r[col]}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerLine, ...rowLines].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'postgres_query_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5">
          <span>PORT: 5432</span>
          <span aria-hidden="true">·</span>
          <span>POSTGRESQL 15 DATABASE: ecommerce_analytics</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          PostgreSQL Storage Sink & Analytics Console
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Verify and query transformed batch summary tables and real-time streaming anomaly sinks written by Apache Spark.
        </p>
      </div>

      {/* Query Console Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        {/* Preset Queries Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Preset SQL Blueprints:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setActiveQuery(preset.query);
                  executeSQL(preset.query);
                }}
                className={`px-3 py-1 text-xs rounded transition-colors font-mono ${
                  activeQuery === preset.query
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Input Area */}
        <div className="space-y-2">
          <textarea
            value={activeQuery}
            onChange={(e) => setActiveQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                executeSQL(activeQuery);
              }
            }}
            rows={4}
            className="w-full bg-[#080b11] border border-slate-800 rounded-lg p-3 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Query Execution Time: {executionTime} ms</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => executeSQL(activeQuery)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3 h-3" />
                <span>Run Query (Ctrl + Enter)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Query Results Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Tabular Query Output</span>
            <span className="text-xs font-mono text-slate-400">
              ({resultRows.length} rows returned)
            </span>
          </div>

          <button
            onClick={exportResultsCSV}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                {resultColumns.map((col) => (
                  <th key={col} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {resultRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  {resultColumns.map((col) => (
                    <td key={col} className="py-2.5 px-3 text-slate-300 tabular-nums">
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
