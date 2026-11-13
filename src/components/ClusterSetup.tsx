import React, { useState } from 'react';
import { 
  DOCKER_COMPOSE_CONTENT, 
  ANALYSIS_PY_CONTENT, 
  PREDICT_PY_CONTENT, 
  KAFKA_PRODUCER_PY, 
  SPARK_STREAMING_PY 
} from '../data/clusterConfig';
import { 
  Server, 
  Boxes, 
  Copy, 
  Check, 
  Terminal, 
  ArrowRight, 
  Layers, 
  FileCode, 
  ShieldCheck,
  Cpu,
  Database,
  Radio
} from 'lucide-react';

export const ClusterSetup: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<
    'docker-compose.yml' | 'Analysis.py' | 'predict.py' | 'KafkaProducer.py' | 'SparkStreamingConsumer.py'
  >('docker-compose.yml');

  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCmdIndex, setCopiedCmdIndex] = useState<number | null>(null);

  const getFileContent = () => {
    switch (selectedFile) {
      case 'docker-compose.yml':
        return DOCKER_COMPOSE_CONTENT;
      case 'Analysis.py':
        return ANALYSIS_PY_CONTENT;
      case 'predict.py':
        return PREDICT_PY_CONTENT;
      case 'KafkaProducer.py':
        return KAFKA_PRODUCER_PY;
      case 'SparkStreamingConsumer.py':
        return SPARK_STREAMING_PY;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getFileContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const terminalSteps = [
    {
      step: 'Step 1',
      title: 'Initialize Docker Cluster',
      cmd: 'docker-compose up -d',
      desc: 'Spawns Hadoop Namenode, Datanode, YARN, Spark Master/Worker, Kafka, and PostgreSQL in isolated bridge network.',
    },
    {
      step: 'Step 2',
      title: 'Upload Dataset to Hadoop HDFS',
      cmd: 'docker exec -it namenode hdfs dfs -put /path/to/E-commerceCustomerBehavior-Sheet1.csv /E-commerceCustomerBehavior-Sheet1.csv',
      desc: 'Places the 380-record CSV into distributed HDFS storage at root directory.',
    },
    {
      step: 'Step 3',
      title: 'Run PySpark Batch Analysis',
      cmd: 'docker exec -it spark-master spark-submit --master yarn /scripts/Analysis.py',
      desc: 'Performs demographic group-by aggregations, calculates churn risk tiers, and writes to PostgreSQL.',
    },
    {
      step: 'Step 4',
      title: 'Train Logistic Regression ML Pipeline',
      cmd: 'docker exec -it spark-master spark-submit --master yarn /scripts/predict.py',
      desc: 'Fits VectorAssembler & LogisticRegression model, yielding 87.4% test accuracy.',
    },
    {
      step: 'Step 5',
      title: 'Start Kafka Streaming Producer',
      cmd: 'python3 /scripts/KafkaProducer.py',
      desc: 'Emits live simulated transactions into Kafka topic ecommerce.transactions.v1.',
    },
    {
      step: 'Step 6',
      title: 'Launch Spark Streaming Consumer',
      cmd: 'docker exec -it spark-master spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.1.1 /scripts/SparkStreamingConsumer.py',
      desc: 'Computes real-time sliding window aggregates and anomaly alerts.',
    },
  ];

  const handleCopyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmdIndex(idx);
    setTimeout(() => setCopiedCmdIndex(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5">
          <span>PATH: /Analysis-report/Hadoop_Docker_cluster_setup</span>
          <span aria-hidden="true">·</span>
          <span>ENTERPRISE DISTRIBUTED ARCHITECTURE</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Hadoop & Docker Cluster Architecture Blueprint
        </h1>
        <p className="mt-1 text-sm text-slate-400 max-w-3xl">
          Complete production setup specifications for orchestrating batch workloads (Hadoop HDFS, YARN, Spark ML) and streaming pipelines (Kafka, Spark Streaming, PostgreSQL).
        </p>
      </div>

      {/* Interactive Architecture Flow Diagram */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Dual Pipeline End-to-End Topology
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Node 1: Ingestion */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-blue-400">
              <span>01. INGESTION</span>
              <Radio className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-bold text-white">Batch & Streaming</div>
            <p className="text-xs text-slate-400">
              • Static CSV in HDFS
              <br />• Kafka Producer Events
              <br />• 3 Topic Partitions
            </p>
          </div>

          {/* Node 2: Resource & Compute */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>02. COMPUTE</span>
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-bold text-white">Apache Spark on YARN</div>
            <p className="text-xs text-slate-400">
              • PySpark Batch Jobs
              <br />• Spark Structured Streaming
              <br />• MLlib Logistic Regression
            </p>
          </div>

          {/* Node 3: Storage */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span>03. PERSISTENCE</span>
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-bold text-white">HDFS & PostgreSQL</div>
            <p className="text-xs text-slate-400">
              • HDFS Namenode/Datanode
              <br />• Parquet Checkpoints
              <br />• PostgreSQL JDBC Insights
            </p>
          </div>

          {/* Node 4: Visualization */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-purple-400">
              <span>04. INSIGHTS</span>
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-bold text-white">Behavior Reports</div>
            <p className="text-xs text-slate-400">
              • Customer Segmentation
              <br />• Churn Risk Quadrants
              <br />• Satisfaction Predictor
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Terminal Instructions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Cluster Provisioning & Execution Commands
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Follow these commands in sequence to launch and verify the Docker cluster and Spark jobs.
          </p>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {terminalSteps.map((s, idx) => (
            <div
              key={s.step}
              className="bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-lg p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">{s.step}:</span>
                  <span className="text-white font-semibold">{s.title}</span>
                </div>
                <button
                  onClick={() => handleCopyCommand(s.cmd, idx)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedCmdIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-sans">Copy Command</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#080b11] p-2.5 rounded border border-slate-900 text-blue-300 overflow-x-auto select-all">
                {s.cmd}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster Code & Configuration Explorer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
            {(
              [
                'docker-compose.yml',
                'Analysis.py',
                'predict.py',
                'KafkaProducer.py',
                'SparkStreamingConsumer.py',
              ] as const
            ).map((file) => (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className={`px-3 py-1.5 text-xs font-mono rounded whitespace-nowrap transition-colors ${
                  selectedFile === file
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {file}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans">Copied File!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">Copy Source</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-[#080b11] overflow-x-auto max-h-[480px]">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {getFileContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
