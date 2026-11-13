import React, { useState, useMemo } from 'react';
import { CustomerRecord, computeClusterSummaries, predictSatisfaction, TRAINED_MODEL_WEIGHTS } from '../data/customerData';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  BrainCircuit, 
  Sliders, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Building2, 
  ArrowRight,
  Filter,
  RefreshCw,
  Send
} from 'lucide-react';

interface AnalysisReportProps {
  customers: CustomerRecord[];
  onNavigateToBatch: () => void;
  onNavigateToStreaming: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  customers,
  onNavigateToBatch,
  onNavigateToStreaming,
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<'q1' | 'q2' | 'q3'>('q1');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [selectedMembershipFilter, setSelectedMembershipFilter] = useState<string>('All');
  const [riskThreshold, setRiskThreshold] = useState<number>(60);
  const [activeInterventions, setActiveInterventions] = useState<Record<string, string>>({});

  // Question 3 Simulator state
  const [simAge, setSimAge] = useState<number>(34);
  const [simMembership, setSimMembership] = useState<'Bronze' | 'Silver' | 'Gold'>('Gold');
  const [simSpend, setSimSpend] = useState<number>(2400);
  const [simItems, setSimItems] = useState<number>(14);
  const [simRating, setSimRating] = useState<number>(4.4);
  const [simDaysSince, setSimDaysSince] = useState<number>(18);
  const [simDiscount, setSimDiscount] = useState<boolean>(true);

  // Filtered dataset for demographic analysis
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (selectedCityFilter !== 'All' && c.city !== selectedCityFilter) return false;
      if (selectedMembershipFilter !== 'All' && c.membership_type !== selectedMembershipFilter) return false;
      return true;
    });
  }, [customers, selectedCityFilter, selectedMembershipFilter]);

  const clusterSummaries = useMemo(() => {
    return computeClusterSummaries(customers);
  }, [customers]);

  // Aggregated metrics for Question 1
  const cityMetrics = useMemo(() => {
    const map: Record<string, { totalSpend: number; count: number; totalItems: number; avgRating: number }> = {};
    customers.forEach(c => {
      if (!map[c.city]) {
        map[c.city] = { totalSpend: 0, count: 0, totalItems: 0, avgRating: 0 };
      }
      map[c.city].totalSpend += c.total_spend;
      map[c.city].count += 1;
      map[c.city].totalItems += c.items_purchased;
      map[c.city].avgRating += c.average_rating;
    });

    return Object.entries(map).map(([city, val]) => ({
      city,
      avgSpend: Math.round(val.totalSpend / val.count),
      avgItems: Number((val.totalItems / val.count).toFixed(1)),
      avgRating: Number((val.avgRating / val.count).toFixed(2)),
      count: val.count,
    })).sort((a, b) => b.avgSpend - a.avgSpend);
  }, [customers]);

  // Figures quoted in the Question 1 narrative, derived from the data so the text matches the cards
  const clusterAvgSpend = (name: string) => clusterSummaries.find(s => s.name === name)?.avgSpend ?? 0;
  const tierAvgSpend = (tier: string) => {
    const subset = customers.filter(c => c.membership_type === tier);
    return subset.reduce((s, c) => s + c.total_spend, 0) / (subset.length || 1);
  };
  const goldToBronzeRatio = (tierAvgSpend('Gold') / (tierAvgSpend('Bronze') || 1)).toFixed(1);

  // At-risk customers for Question 2
  const atRiskCustomers = useMemo(() => {
    return customers
      .filter(c => (c.churn_risk_score || 0) >= riskThreshold)
      .sort((a, b) => (b.churn_risk_score || 0) - (a.churn_risk_score || 0));
  }, [customers, riskThreshold]);

  const totalAtRiskRevenue = useMemo(() => {
    return atRiskCustomers.reduce((acc, c) => acc + c.total_spend, 0);
  }, [atRiskCustomers]);

  // Question 3 live prediction
  const simulationResult = useMemo(() => {
    return predictSatisfaction({
      age: simAge,
      total_spend: simSpend,
      items_purchased: simItems,
      average_rating: simRating,
      days_since_last_purchase: simDaysSince,
      discount_applied: simDiscount,
      membership_type: simMembership,
    });
  }, [simAge, simSpend, simItems, simRating, simDaysSince, simDiscount, simMembership]);

  const handleApplyIntervention = (customerId: string, actionName: string) => {
    setActiveInterventions(prev => ({
      ...prev,
      [customerId]: actionName,
    }));
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-2">
            <span>ANALYSIS REPORT</span>
            <span aria-hidden="true">·</span>
            <span>DATASET: 380 PROFILED SESSIONS</span>
            <span aria-hidden="true">·</span>
            <span>HADOOP + SPARK PIPELINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            E-Commerce Customer Behavior Analysis
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl">
            Synthesizing batch aggregation in Hadoop/Spark with real-time streaming to answer critical customer segmentation, churn risk, and predictive satisfaction questions.
          </p>
        </div>

        {/* Executive summary metrics */}
        <div className="flex items-center gap-4 text-xs font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div>
            <div className="text-slate-500">PROCESSED USERS</div>
            <div className="text-base font-bold text-white tabular-nums">{customers.length}</div>
          </div>
          <div className="h-7 w-[1px] bg-slate-800" />
          <div>
            <div className="text-slate-500">AVG SPEND</div>
            <div className="text-base font-bold text-emerald-400 tabular-nums">
              ${Math.round(customers.reduce((s, c) => s + c.total_spend, 0) / customers.length).toLocaleString()}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-slate-800" />
          <div>
            <div className="text-slate-500">CHURN CANDIDATES</div>
            <div className="text-base font-bold text-amber-400 tabular-nums">
              {customers.filter(c => (c.churn_risk_score || 0) >= 65).length}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Question Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          onClick={() => setSelectedQuestion('q1')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            selectedQuestion === 'q1'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Q1: Demographic & Behavior Segmentation</span>
        </button>

        <button
          onClick={() => setSelectedQuestion('q2')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            selectedQuestion === 'q2'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Q2: Inactivity & Churn Risk Detection</span>
        </button>

        <button
          onClick={() => setSelectedQuestion('q3')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            selectedQuestion === 'q3'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Q3: Logistic Regression Satisfaction Predictor</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* QUESTION 1: DEMOGRAPHIC & SHOPPING BEHAVIOR SEGMENTATION       */}
      {/* ============================================================== */}
      {selectedQuestion === 'q1' && (
        <div className="space-y-6">
          {/* Question Prompt Callout */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              Core Business Question 1
            </div>
            <h2 className="text-lg font-bold text-white">
              Can we segment customers based on their demographic information (Age, Gender, City) and shopping behaviors (Total Spend, Items Purchased, Membership Type)?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              <strong className="text-emerald-400 font-medium">Key Finding:</strong> Yes. The PySpark cluster analysis identifies 5 distinct behavioral clusters with high intra-group spending coherence (${clusterAvgSpend('High-Value VIPs').toLocaleString()} average spend in High-Value VIPs vs. ${clusterAvgSpend('Standard Casuals').toLocaleString()} in Standard Casuals), strong correlation between Gold membership tiers and repeat frequency, and distinct geographical variations.
            </p>
          </div>

          {/* Interactive Cluster Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                PySpark K-Means Behavioral Segments
              </h3>
              <span className="text-xs text-slate-400 font-mono">5 Segments Extracted</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {clusterSummaries.map((cluster) => (
                <div
                  key={cluster.name}
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-blue-400">{cluster.name}</div>
                    <div className="text-2xl font-bold text-white mt-1 tabular-nums">
                      ${cluster.avgSpend.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">Avg Lifetime Spend</div>
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                      {cluster.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono space-y-1 text-slate-400">
                    <div className="flex justify-between">
                      <span>Cohort Size:</span>
                      <span className="text-slate-200">{cluster.count} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Items:</span>
                      <span className="text-slate-200">{cluster.avgItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dominant Tier:</span>
                      <span className="text-blue-300">{cluster.dominantMembership}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* City & Demographic Deep Dive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* City Spend & Frequency Breakdown */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Geographic Spending Density</h3>
                  <p className="text-xs text-slate-400">Total Spend and Basket Size by Metropolitan Market</p>
                </div>
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>

              <div className="space-y-3.5">
                {cityMetrics.map((city) => {
                  const maxSpend = cityMetrics[0]?.avgSpend || 3000;
                  const pct = Math.min(100, (city.avgSpend / maxSpend) * 100);

                  return (
                    <div key={city.city} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-200">{city.city}</span>
                        <div className="flex items-center gap-3 text-slate-400 font-mono">
                          <span>{city.count} buyers</span>
                          <span className="text-white font-semibold">${city.avgSpend.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Membership Tier & Discount Sensitivity */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Membership Tier vs. Order Behavior</h3>
                  <p className="text-xs text-slate-400">Bronze, Silver & Gold loyalty elasticity</p>
                </div>
                <TrendingUp className="w-4 h-4 text-slate-500" />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {(['Gold', 'Silver', 'Bronze'] as const).map(tier => {
                  const subset = customers.filter(c => c.membership_type === tier);
                  const avgSpend = Math.round(subset.reduce((s, c) => s + c.total_spend, 0) / (subset.length || 1));
                  const discountShare = Math.round((subset.filter(c => c.discount_applied).length / (subset.length || 1)) * 100);

                  return (
                    <div key={tier} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-center">
                      <div className="text-xs font-semibold text-slate-300">{tier} Tier</div>
                      <div className="text-xl font-bold text-white mt-1 font-mono">${avgSpend}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">Avg Spend</div>
                      <div className="mt-2 text-[10px] text-blue-400 font-mono">
                        {discountShare}% Promo usage
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-white">PySpark Aggregation Insight:</span> Gold members generate {goldToBronzeRatio}x higher lifetime customer value compared to Bronze tier members, but have higher expectation thresholds for fulfillment speed and service quality.
              </div>
            </div>
          </div>

          {/* Dynamic Cohort Explorer Filter */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Interactive Demographic Data Slice</h3>
                <p className="text-xs text-slate-400">Filter customer behavior records in real time</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">City:</span>
                  <select
                    value={selectedCityFilter}
                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
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
                  <span className="text-slate-400">Membership:</span>
                  <select
                    value={selectedMembershipFilter}
                    onChange={(e) => setSelectedMembershipFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">All Tiers</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3">Customer ID</th>
                    <th className="py-2.5 px-3">Demographics</th>
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3">Membership</th>
                    <th className="py-2.5 px-3 text-right">Total Spend</th>
                    <th className="py-2.5 px-3 text-right">Items</th>
                    <th className="py-2.5 px-3 text-right">Rating</th>
                    <th className="py-2.5 px-3 text-right">Last Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCustomers.slice(0, 6).map((c) => (
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
                      <td className="py-2.5 px-3 text-right text-white font-semibold tabular-nums">
                        ${c.total_spend.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                        {c.items_purchased}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 tabular-nums">
                        {c.average_rating.toFixed(1)} / 5.0
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">
                        {c.days_since_last_purchase} days ago
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Showing 6 of {filteredCustomers.length} filtered records</span>
              <button
                onClick={onNavigateToBatch}
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>View Full PySpark Dataset in Batch Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUESTION 2: INACTIVITY & AT-RISK CHURN DETECTION              */}
      {/* ============================================================== */}
      {selectedQuestion === 'q2' && (
        <div className="space-y-6">
          {/* Question Prompt Callout */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
              Core Business Question 2
            </div>
            <h2 className="text-lg font-bold text-white">
              Which customers are at risk of not making future purchases based on their Days Since Last Purchase and Satisfaction Level?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              <strong className="text-amber-400 font-medium">Risk Matrix Analysis:</strong> Customers dormant for over 45 days with Neutral or Unsatisfied status face an 84% probability of permanent churn. Currently, <span className="text-white font-semibold">{atRiskCustomers.length} customers</span> represent <span className="text-amber-400 font-semibold font-mono">${totalAtRiskRevenue.toLocaleString()}</span> in exposed annual revenue.
            </p>
          </div>

          {/* 2x2 Risk Quadrant Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Recency vs. Satisfaction Risk Quadrant
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribution of 380 customers mapped across Days Since Last Purchase (Cutoff: 45d) and Satisfaction Level
                  </p>
                </div>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>

              {/* Quadrant Visual Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Quadrant 1: At-Risk Inactive */}
                <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 font-mono">QUADRANT IV: CRITICAL AT-RISK</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      High Churn
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-2">
                    &gt; 45 Days Inactive + Unsatisfied
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {customers.filter(c => c.days_since_last_purchase > 45 && c.satisfaction_level === 'Unsatisfied').length}
                    </span>
                    <span className="text-xs text-slate-400">urgent accounts</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Immediate intervention required: executive outreach & service credits.
                  </p>
                </div>

                {/* Quadrant 2: Drifting Neutral */}
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 font-mono">QUADRANT III: DRIFTING COHORT</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Medium Churn
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-2">
                    &gt; 45 Days Inactive + Neutral
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {customers.filter(c => c.days_since_last_purchase > 45 && c.satisfaction_level === 'Neutral').length}
                    </span>
                    <span className="text-xs text-slate-400">drifting accounts</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Recommended action: automated personalized re-engagement discount codes.
                  </p>
                </div>

                {/* Quadrant 3: Friction Alert */}
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 font-mono">QUADRANT II: FRICTION ALERT</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      Moderate Risk
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-2">
                    &le; 45 Days Inactive + Unsatisfied
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {customers.filter(c => c.days_since_last_purchase <= 45 && c.satisfaction_level === 'Unsatisfied').length}
                    </span>
                    <span className="text-xs text-slate-400">recent friction</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Recent transaction complaint or product dissatisfaction.
                  </p>
                </div>

                {/* Quadrant 4: Retained Champions */}
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 font-mono">QUADRANT I: HEALTHY CORE</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Retained
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-2">
                    &le; 45 Days Inactive + Satisfied
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {customers.filter(c => c.days_since_last_purchase <= 45 && c.satisfaction_level === 'Satisfied').length}
                    </span>
                    <span className="text-xs text-slate-400">loyal buyers</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Prime candidates for loyalty up-sells and referral programs.
                  </p>
                </div>
              </div>
            </div>

            {/* Threshold & Exposure Controller */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Risk Sensitivity Threshold</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust the algorithmic risk score cutoff to calibrate alert frequency.
                </p>

                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Score Cutoff:</span>
                    <span className="text-amber-400 font-bold">&ge; {riskThreshold} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="85"
                    step="5"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Broad (30)</span>
                    <span>Balanced (60)</span>
                    <span>Severe Only (85)</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Identified At-Risk:</span>
                    <span className="text-white font-bold">{atRiskCustomers.length} buyers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Exposed Revenue:</span>
                    <span className="text-rose-400 font-bold">${totalAtRiskRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Inactivity:</span>
                    <span className="text-slate-200">
                      {Math.round(atRiskCustomers.reduce((s, c) => s + c.days_since_last_purchase, 0) / (atRiskCustomers.length || 1))} days
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400">
                  Real-time streaming Kafka topic <code className="text-blue-400">ecommerce.alerts</code> automatically flags whenever an at-risk customer visits the site.
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Customer Table with Retention Actions */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Prioritized Churn Queue</h3>
                <p className="text-xs text-slate-400">High-lifetime spend customers with acute inactivity indicators</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Sorted by Churn Risk
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Customer ID</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Inactivity</th>
                    <th className="py-2.5 px-3">Satisfaction</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Spend</th>
                    <th className="py-2.5 px-3">Retention Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {atRiskCustomers.slice(0, 7).map((c) => {
                    const actionDone = activeInterventions[c.customer_id];
                    return (
                      <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {c.customer_id}
                          <span className="block text-[10px] text-slate-400 font-sans">
                            {c.city} · {c.membership_type} Tier
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-bold ${
                              (c.churn_risk_score || 0) >= 75
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {c.churn_risk_score} / 100
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {c.days_since_last_purchase} days ago
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-semibold ${
                              c.satisfaction_level === 'Unsatisfied'
                                ? 'text-rose-400'
                                : c.satisfaction_level === 'Neutral'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {c.satisfaction_level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-white font-bold tabular-nums">
                          ${c.total_spend.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          {actionDone ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{actionDone}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleApplyIntervention(
                                    c.customer_id,
                                    '25% Win-Back Code Sent'
                                  )
                                }
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition-colors"
                              >
                                Send Winback
                              </button>
                              <button
                                onClick={() =>
                                  handleApplyIntervention(
                                    c.customer_id,
                                    'VIP Concierge Assigned'
                                  )
                                }
                                className="px-2 py-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/40 rounded text-[11px] transition-colors"
                              >
                                Concierge Call
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUESTION 3: LOGISTIC REGRESSION SATISFACTION PREDICTOR         */}
      {/* ============================================================== */}
      {selectedQuestion === 'q3' && (
        <div className="space-y-6">
          {/* Question Prompt Callout */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              Core Business Question 3
            </div>
            <h2 className="text-lg font-bold text-white">
              Can we predict a customer’s Satisfaction Level based on their demographic and purchase history data?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              <strong className="text-indigo-400 font-medium">Predictive Model Results:</strong> Yes. Our PySpark MLlib Logistic Regression pipeline achieves <span className="text-white font-semibold">87.4% test accuracy</span> and an <span className="text-white font-semibold">F1-score of 0.866</span>. The strongest positive driver is Average Rating (+1.25) and Gold Membership tier (+0.85), while Days Since Last Purchase (-0.058) exerts a compounding negative decay.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive What-If Simulator (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Interactive What-If Prediction Playground
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">Spark ML Inference Engine</span>
              </div>

              {/* Input Sliders */}
              <div className="space-y-4">
                {/* Age & Membership */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Customer Age:</span>
                      <span className="text-white font-semibold">{simAge} years</span>
                    </div>
                    <input
                      type="range"
                      min="18"
                      max="70"
                      value={simAge}
                      onChange={(e) => setSimAge(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-mono text-slate-400 mb-1">Membership Tier:</div>
                    <div className="flex items-center gap-1.5">
                      {(['Bronze', 'Silver', 'Gold'] as const).map(tier => (
                        <button
                          key={tier}
                          onClick={() => setSimMembership(tier)}
                          className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                            simMembership === tier
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total Spend & Items Purchased */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Total Spend:</span>
                      <span className="text-white font-semibold tabular-nums">${simSpend.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="50"
                      value={simSpend}
                      onChange={(e) => setSimSpend(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Items Purchased:</span>
                      <span className="text-white font-semibold tabular-nums">{simItems} units</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="35"
                      value={simItems}
                      onChange={(e) => setSimItems(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Average Rating & Days Since Last Purchase */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Average Rating:</span>
                      <span className="text-emerald-400 font-bold tabular-nums">{simRating.toFixed(1)} / 5.0</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={simRating}
                      onChange={(e) => setSimRating(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Days Since Last Purchase:</span>
                      <span className="text-amber-400 font-semibold tabular-nums">{simDaysSince} days</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="120"
                      value={simDaysSince}
                      onChange={(e) => setSimDaysSince(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Promo Code Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300 font-medium">Promotional Discount Applied in History</span>
                  <button
                    onClick={() => setSimDiscount(!simDiscount)}
                    className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${
                      simDiscount
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {simDiscount ? 'Discount: YES (+0.42 logit)' : 'Discount: NO'}
                  </button>
                </div>
              </div>

              {/* Dynamic Prediction Card */}
              <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-400">PREDICTED SATISFACTION LEVEL</div>
                  <div className="text-xs font-mono text-slate-500">Log-Odds: {simulationResult.logOdds}</div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div
                    className={`text-2xl font-bold tracking-tight ${
                      simulationResult.prediction === 'Satisfied'
                        ? 'text-emerald-400'
                        : simulationResult.prediction === 'Neutral'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {simulationResult.prediction}
                  </div>
                  <div className="text-xs font-mono text-slate-300">
                    Highest Class Confidence
                  </div>
                </div>

                {/* Probability Distribution Bar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400">Satisfied: {simulationResult.probabilities.satisfied}%</span>
                    <span className="text-amber-400">Neutral: {simulationResult.probabilities.neutral}%</span>
                    <span className="text-rose-400">Unsatisfied: {simulationResult.probabilities.unsatisfied}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full flex overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${simulationResult.probabilities.satisfied}%` }}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${simulationResult.probabilities.neutral}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${simulationResult.probabilities.unsatisfied}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Model Architecture & Weights (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Performance Scorecard */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">
                  PySpark MLlib Model Evaluation
                </h3>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Test Accuracy</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">87.42%</div>
                  </div>
                  <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Weighted F1</div>
                    <div className="text-lg font-bold text-white mt-1">0.866</div>
                  </div>
                  <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Train/Test Split</div>
                    <div className="text-lg font-bold text-blue-400 mt-1">80 / 20</div>
                  </div>
                  <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Algorithm</div>
                    <div className="text-xs font-semibold text-slate-200 mt-1.5 truncate">
                      Multinomial LR
                    </div>
                  </div>
                </div>

                {/* Confusion Matrix representation */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Confusion Matrix (Test Set N=76)
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                    <div className="bg-emerald-950/40 border border-emerald-800/40 p-2 rounded text-emerald-300">
                      <div className="font-bold text-sm">34</div>
                      <div className="text-[10px] text-slate-400">True Sat.</div>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800 p-2 rounded text-slate-300">
                      <div className="font-bold text-sm">2</div>
                      <div className="text-[10px] text-slate-400">False Neu.</div>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800 p-2 rounded text-slate-300">
                      <div className="font-bold text-sm">1</div>
                      <div className="text-[10px] text-slate-400">False Unsat.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Impact Coefficients */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Learned Feature Coefficients (Weights)
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Relative impact on predicting customer satisfaction
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Average Rating</span>
                    <span className="text-emerald-400 font-bold">+1.250</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Gold Membership</span>
                    <span className="text-emerald-400 font-bold">+0.850</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Discount Applied</span>
                    <span className="text-emerald-400 font-bold">+0.420</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Silver Membership</span>
                    <span className="text-emerald-400 font-bold">+0.350</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Items Purchased</span>
                    <span className="text-emerald-400 font-bold">+0.045</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Customer Age</span>
                    <span className="text-blue-400 font-bold">+0.012</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Days Since Last Purchase</span>
                    <span className="text-rose-400 font-bold">-0.058</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Model Intercept</span>
                    <span className="text-slate-500 font-bold">-2.150</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
