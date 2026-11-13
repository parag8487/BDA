import React, { useState } from 'react';
import { CustomerRecord, INITIAL_CUSTOMERS, StreamingTransaction } from './data/customerData';
import { Navigation, ActiveTab } from './components/Navigation';
import { AnalysisReport } from './components/AnalysisReport';
import { BatchAnalysis } from './components/BatchAnalysis';
import { StreamingData } from './components/StreamingData';
import { ClusterSetup } from './components/ClusterSetup';
import { PostgresConsole } from './components/PostgresConsole';
import { CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analysis');
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [dualPipelineAlert, setDualPipelineAlert] = useState<string | null>(null);

  // Initial stream transactions
  const [streamingTransactions, setStreamingTransactions] = useState<StreamingTransaction[]>([
    {
      event_id: 'EVT-081491',
      timestamp: '22:58:12',
      customer_id: 'CUST-1042',
      city: 'New York',
      membership_type: 'Gold',
      amount: 480,
      items_count: 4,
      rating: 4.8,
      is_anomaly: false,
      partition: 0,
      offset: 10418,
    },
    {
      event_id: 'EVT-081492',
      timestamp: '22:58:13',
      customer_id: 'CUST-1185',
      city: 'San Francisco',
      membership_type: 'Silver',
      amount: 210,
      items_count: 2,
      rating: 3.9,
      is_anomaly: false,
      partition: 1,
      offset: 10419,
    },
    {
      event_id: 'EVT-081493',
      timestamp: '22:58:15',
      customer_id: 'CUST-1310',
      city: 'Miami',
      membership_type: 'Gold',
      amount: 2850,
      items_count: 1,
      rating: 1.2,
      is_anomaly: true,
      anomaly_reason: 'SURGE_SPEND_OUTLIER ($1500+ threshold)',
      partition: 2,
      offset: 10420,
    },
  ]);

  const handleAddCustomer = (newCustomer: CustomerRecord) => {
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const handleAddStreamingTransaction = (txn: StreamingTransaction) => {
    setStreamingTransactions((prev) => [...prev.slice(-99), txn]);
  };

  const handleRunDualPipeline = () => {
    setIsStreaming(true);
    setDualPipelineAlert(
      'Dual Pipeline synchronized: HDFS batch datasets refreshed & Kafka live streaming consumer active.'
    );
    setTimeout(() => {
      setDualPipelineAlert(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white">
      {/* Universal Top Bar Contract Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRunDualPipeline={handleRunDualPipeline}
        isStreaming={isStreaming}
      />

      {/* Dual Pipeline Notification Banner */}
      {dualPipelineAlert && (
        <div className="bg-blue-600/20 border-b border-blue-500/40 text-blue-200 text-xs px-4 py-2.5 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{dualPipelineAlert}</span>
            </div>
            <button
              onClick={() => setDualPipelineAlert(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analysis' && (
          <AnalysisReport
            customers={customers}
            onNavigateToBatch={() => setActiveTab('batch')}
            onNavigateToStreaming={() => setActiveTab('streaming')}
          />
        )}

        {activeTab === 'batch' && (
          <BatchAnalysis customers={customers} onAddRecord={handleAddCustomer} />
        )}

        {activeTab === 'streaming' && (
          <StreamingData
            isStreaming={isStreaming}
            onToggleStreaming={() => setIsStreaming(!isStreaming)}
            transactions={streamingTransactions}
            onAddTransaction={handleAddStreamingTransaction}
          />
        )}

        {activeTab === 'cluster' && <ClusterSetup />}

        {activeTab === 'sql' && (
          <PostgresConsole
            customers={customers}
            streamingTransactions={streamingTransactions}
          />
        )}
      </main>

      {/* Understated Editorial Footer */}
      <footer className="border-t border-slate-800 bg-[#080b11] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">BehaviorStream Analytics</span>
            <span>·</span>
            <span>Hadoop HDFS</span>
            <span>·</span>
            <span>Apache Spark</span>
            <span>·</span>
            <span>Apache Kafka</span>
            <span>·</span>
            <span>PostgreSQL</span>
          </div>
          <div>
            Batch & Real-Time E-Commerce Customer Behavior Analysis Platform
          </div>
        </div>
      </footer>
    </div>
  );
}
