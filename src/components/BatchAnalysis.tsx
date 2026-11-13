import React, { useState, useMemo } from 'react';
import { CustomerRecord } from '../data/customerData';
import { 
  Play, 
  CheckCircle2, 
  Terminal, 
  Cpu, 
  HardDrive, 
  Search, 
  Download, 
  ArrowUpDown, 
  Filter, 
  RotateCw,
  Layers,
  FileCode,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface BatchAnalysisProps {
  customers: CustomerRecord[];
  onAddRecord: (record: CustomerRecord) => void;
}

export const BatchAnalysis: React.FC<BatchAnalysisProps> = ({
  customers,
  onAddRecord,
}) => {
  const [selectedScript, setSelectedScript] = useState<'Analysis.py' | 'predict.py'>('Analysis.py');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Hadoop Namenode ready at hdfs://namenode:9000',
    'Spark Master registered 2 workers at spark://spark-master:7077',
    'YARN Resource Manager allocated 16GB RAM / 8 vCores',
    'Dataset verified: /E-commerceCustomerBehavior-Sheet1.csv (380 records)',
    'Ready for spark-submit execution.',
  ]);

  // Table pagination and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [membershipFilter, setMembershipFilter] = useState('All');
  const [satisfactionFilter, setSatisfactionFilter] = useState('All');
  const [sortField, setSortField] = useState<keyof CustomerRecord>('total_spend');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // New customer quick-add state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCity, setNewCity] = useState<CustomerRecord['city']>('New York');
  const [newGender, setNewGender] = useState<CustomerRecord['gender']>('Female');
  const [newAge, setNewAge] = useState<number>(30);
  const [newMembership, setNewMembership] = useState<CustomerRecord['membership_type']>('Gold');
  const [newSpend, setNewSpend] = useState<number>(1850);
  const [newItems, setNewItems] = useState<number>(12);
  const [newRating, setNewRating] = useState<number>(4.5);
  const [newDaysSince, setNewDaysSince] = useState<number>(14);

  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        if (cityFilter !== 'All' && c.city !== cityFilter) return false;
        if (membershipFilter !== 'All' && c.membership_type !== membershipFilter) return false;
        if (satisfactionFilter !== 'All' && c.satisfaction_level !== satisfactionFilter) return false;
        if (searchTerm) {
          const matchId = c.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
          const matchCity = c.city.toLowerCase().includes(searchTerm.toLowerCase());
          if (!matchId && !matchCity) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === undefined || valB === undefined) return 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [customers, cityFilter, membershipFilter, satisfactionFilter, searchTerm, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredAndSortedCustomers.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedCustomers.slice(start, start + pageSize);
  }, [filteredAndSortedCustomers, currentPage]);

  const handleSort = (field: keyof CustomerRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const runPySparkJob = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStage(1);

    const stages = selectedScript === 'Analysis.py' ? [
      '[Stage 0/4] spark-submit --master yarn --deploy-mode client /scripts/Analysis.py',
      '[Stage 1/4] Ingesting CSV from HDFS -> Schema inference & Column standardization',
      '[Stage 2/4] Executing groupBy(City, Membership Type).agg(avg(spend), avg(items))',
      '[Stage 3/4] Evaluating Churn Risk Rules (Inactivity > 45d & Satisfaction != Satisfied)',
      '[Stage 4/4] Writing batch summary dataset to PostgreSQL table `batch_city_segmentation_summary`',
      'SUCCESS: PySpark job Analysis.py finished in 3.42s with 0 errors.',
    ] : [
      '[Stage 0/5] spark-submit --master yarn /scripts/predict.py',
      '[Stage 1/5] VectorAssembler: concatenating [Age, Total Spend, Items, Rating, DaysSince]',
      '[Stage 2/5] StringIndexer & OneHotEncoder for Gender, City, Membership Type',
      '[Stage 3/5] StandardScaler normalization across 380 feature vectors',
      '[Stage 4/5] Multi-class LogisticRegression fitting with ElasticNet (alpha=0.2, lambda=0.01)',
      '[Stage 5/5] Evaluator test accuracy: 87.42% | Model saved to hdfs://namenode:9000/models/',
      'SUCCESS: Spark MLlib LogisticRegression Pipeline persisted.',
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < stages.length) {
        const line = stages[step];
        setConsoleLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
        setCurrentStage(step + 1);
        step++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 700);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `CUST-${1000 + customers.length + 1}`;
    const newRecord: CustomerRecord = {
      customer_id: newId,
      gender: newGender,
      age: newAge,
      city: newCity,
      membership_type: newMembership,
      total_spend: newSpend,
      items_purchased: newItems,
      average_rating: newRating,
      discount_applied: true,
      days_since_last_purchase: newDaysSince,
      satisfaction_level: newRating >= 4.0 ? 'Satisfied' : (newRating <= 2.5 ? 'Unsatisfied' : 'Neutral'),
      churn_risk_score: newDaysSince > 50 ? 75 : 25,
      cluster_name: newSpend > 2500 ? 'High-Value VIPs' : 'Steady Core Shoppers',
    };

    onAddRecord(newRecord);
    setIsAddModalOpen(false);
    setConsoleLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] HDFS Put: Appended record ${newId} to /E-commerceCustomerBehavior-Sheet1.csv`,
    ]);
  };

  const exportCSV = () => {
    const headers = [
      'Customer ID',
      'Gender',
      'Age',
      'City',
      'Membership Type',
      'Total Spend',
      'Items Purchased',
      'Average Rating',
      'Discount Applied',
      'Days Since Last Purchase',
      'Satisfaction Level',
    ];
    const rows = filteredAndSortedCustomers.map((c) => [
      c.customer_id,
      c.gender,
      c.age,
      c.city,
      c.membership_type,
      c.total_spend,
      c.items_purchased,
      c.average_rating,
      c.discount_applied ? 'Yes' : 'No',
      c.days_since_last_purchase,
      c.satisfaction_level,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ecommerce_customer_behavior_batch.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Pipeline Overview */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5">
          <span>PATH: /Main/For batch-data</span>
          <span aria-hidden="true">·</span>
          <span>CLUSTER: HADOOP 3.2.1 + YARN + SPARK 3.1.1</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Batch Data Analysis & PySpark MLlib Pipeline
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Executes distributed batch transformations on HDFS user logs and trains Logistic Regression models for customer segmentation and churn prediction.
        </p>
      </div>

      {/* Cluster Status & Job Runner Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Job Trigger Panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">PySpark Driver Script</span>
              </div>
              <div className="flex items-center gap-2">
                {(['Analysis.py', 'predict.py'] as const).map((script) => (
                  <button
                    key={script}
                    onClick={() => setSelectedScript(script)}
                    disabled={isRunning}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                      selectedScript === script
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {script}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-300">
              {selectedScript === 'Analysis.py' ? (
                <div>
                  <div className="font-semibold text-white">Analysis.py Objective:</div>
                  <p className="mt-1 text-slate-400">
                    Reads HDFS customer records, computes demographic aggregations (Age, City, Membership), calculates churn risk tiers based on inactivity days and satisfaction, and writes results to PostgreSQL.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-white">predict.py Objective:</div>
                  <p className="mt-1 text-slate-400">
                    Constructs an end-to-end ML Pipeline (StringIndexer, OneHotEncoder, VectorAssembler, StandardScaler) and fits a Multi-Class Logistic Regression model to predict customer Satisfaction Level.
                  </p>
                </div>
              )}
            </div>

            {/* Stage Progress Bar */}
            {isRunning && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-blue-400">
                  <span>Executing Stage {currentStage} on Spark Master</span>
                  <span>Working on YARN...</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentStage / (selectedScript === 'Analysis.py' ? 5 : 6)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-400">
              Target: <span className="text-slate-200">hdfs://namenode:9000/</span>
            </div>
            <button
              onClick={runPySparkJob}
              disabled={isRunning}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                isRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing on YARN...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Submit spark-submit Job</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* YARN & Cluster Metrics (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-white">YARN Cluster Telemetry</span>
            <span className="text-xs font-mono text-emerald-400">Active / Healthy</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>vCores Used</span>
              </div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums">
                {isRunning ? '6 / 8' : '2 / 8'} Cores
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>YARN Memory</span>
              </div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums">
                {isRunning ? '12.4 GB / 16 GB' : '4.0 GB / 16 GB'}
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400">HDFS Block Size</div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums">128 MB</div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400">Active Executors</div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums">
                {isRunning ? '4 Containers' : '2 Containers'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Output Console */}
      <div className="bg-[#080b11] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-300">PySpark Execution Logs (spark-master stdout)</span>
          </div>
          <button
            onClick={() => setConsoleLogs([])}
            className="text-[11px] hover:text-slate-200 transition-colors"
          >
            Clear Console
          </button>
        </div>
        <div className="p-4 space-y-1 max-h-48 overflow-y-auto text-slate-300">
          {consoleLogs.map((log, index) => (
            <div key={index} className="leading-relaxed">
              <span className="text-blue-500 select-none mr-2">&gt;</span>
              <span className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('Stage') ? 'text-blue-300' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset Explorer with Filters & Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              HDFS Batch Dataset Browser (E-commerceCustomerBehavior.csv)
            </h2>
            <p className="text-xs text-slate-400">
              {filteredAndSortedCustomers.length} total customer records in cluster warehouse
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
            >
              + Ingest New Record
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID or City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 shrink-0">City:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Cities</option>
              <option value="New York">New York</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="San Francisco">San Francisco</option>
              <option value="Chicago">Chicago</option>
              <option value="Houston">Houston</option>
              <option value="Miami">Miami</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 shrink-0">Membership:</span>
            <select
              value={membershipFilter}
              onChange={(e) => setMembershipFilter(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Tiers</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 shrink-0">Satisfaction:</span>
            <select
              value={satisfactionFilter}
              onChange={(e) => setSatisfactionFilter(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Levels</option>
              <option value="Satisfied">Satisfied</option>
              <option value="Neutral">Neutral</option>
              <option value="Unsatisfied">Unsatisfied</option>
            </select>
          </div>
        </div>

        {/* Dataset Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <th
                  onClick={() => handleSort('customer_id')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('age')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Age / Gender</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('city')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>City</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('membership_type')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Membership</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_spend')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Spend</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('items_purchased')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Items</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('average_rating')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Rating</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('days_since_last_purchase')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Recency</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Satisfaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRecords.map((c) => (
                <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-blue-400">{c.customer_id}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">
                    {c.age} yrs · {c.gender}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{c.city}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-semibold ${
                        c.membership_type === 'Gold'
                          ? 'text-amber-400'
                          : c.membership_type === 'Silver'
                          ? 'text-slate-300'
                          : 'text-amber-600'
                      }`}
                    >
                      {c.membership_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-white font-bold tabular-nums">
                    ${c.total_spend.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                    {c.items_purchased}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 tabular-nums">
                    {c.average_rating.toFixed(1)} / 5.0
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">
                    {c.days_since_last_purchase}d
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-semibold ${
                        c.satisfaction_level === 'Satisfied'
                          ? 'text-emerald-400'
                          : c.satisfaction_level === 'Neutral'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {c.satisfaction_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredAndSortedCustomers.length)} of{' '}
            {filteredAndSortedCustomers.length} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal for adding a customer to HDFS dataset */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Append Record to Hadoop HDFS Dataset
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Simulates <code className="text-blue-400">hdfs dfs -put</code> to append new customer telemetry.
            </p>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">City</label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                  >
                    <option value="New York">New York</option>
                    <option value="Los Angeles">Los Angeles</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="Chicago">Chicago</option>
                    <option value="Houston">Houston</option>
                    <option value="Miami">Miami</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Membership</label>
                  <select
                    value={newMembership}
                    onChange={(e) => setNewMembership(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Age</label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                    min="18"
                    max="80"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Total Spend ($)</label>
                  <input
                    type="number"
                    value={newSpend}
                    onChange={(e) => setNewSpend(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Items Purchased</label>
                  <input
                    type="number"
                    value={newItems}
                    onChange={(e) => setNewItems(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Rating (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRating}
                    onChange={(e) => setNewRating(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                    min="1"
                    max="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Days Since Last Purchase</label>
                <input
                  type="number"
                  value={newDaysSince}
                  onChange={(e) => setNewDaysSince(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-2"
                  min="1"
                  max="120"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold"
                >
                  Write to HDFS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
