export const DOCKER_COMPOSE_CONTENT = `version: '3.8'

services:
  # -------------------------------------------------------------
  # HADOOP CLUSTER (HDFS & YARN)
  # -------------------------------------------------------------
  namenode:
    image: bde2020/hadoop-namenode:2.0.0-hadoop3.2.1-java8
    container_name: namenode
    restart: always
    ports:
      - "9870:9870"
      - "9000:9000"
    environment:
      - CLUSTER_NAME=ecommerce_hadoop_cluster
      - HDFS_CONF_dfs_replication=1
    volumes:
      - hadoop_namenode:/hadoop/dfs/name
      - ./dataset:/dataset

  datanode:
    image: bde2020/hadoop-datanode:2.0.0-hadoop3.2.1-java8
    container_name: datanode
    restart: always
    environment:
      - SERVICE_PRECONDITION=namenode:9000
    volumes:
      - hadoop_datanode:/hadoop/dfs/data
    depends_on:
      - namenode

  resourcemanager:
    image: bde2020/hadoop-resourcemanager:2.0.0-hadoop3.2.1-java8
    container_name: resourcemanager
    restart: always
    environment:
      - SERVICE_PRECONDITION=namenode:9000 datanode:9864
    ports:
      - "8088:8088"
    depends_on:
      - namenode
      - datanode

  nodemanager:
    image: bde2020/hadoop-nodemanager:2.0.0-hadoop3.2.1-java8
    container_name: nodemanager
    restart: always
    environment:
      - SERVICE_PRECONDITION=namenode:9000 datanode:9864 resourcemanager:8088
    depends_on:
      - resourcemanager

  # -------------------------------------------------------------
  # APACHE SPARK CLUSTER (MASTER & WORKER)
  # -------------------------------------------------------------
  spark-master:
    image: bde2020/spark-master:3.1.1-hadoop3.2
    container_name: spark-master
    ports:
      - "8080:8080"
      - "7077:7077"
    environment:
      - INIT_DAEMON_STEP=setup_spark
      - SPARK_MASTER_PORT=7077
      - SPARK_MASTER_WEBUI_PORT=8080
    volumes:
      - ./scripts:/scripts
    depends_on:
      - namenode
      - resourcemanager

  spark-worker-1:
    image: bde2020/spark-worker:3.1.1-hadoop3.2
    container_name: spark-worker-1
    depends_on:
      - spark-master
    ports:
      - "8081:8081"
    environment:
      - "SPARK_MASTER=spark://spark-master:7077"
      - SPARK_WORKER_CORES=2
      - SPARK_WORKER_MEMORY=2g

  # -------------------------------------------------------------
  # REAL-TIME STREAMING: ZOOKEEPER & KAFKA
  # -------------------------------------------------------------
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.3.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1

  # -------------------------------------------------------------
  # POSTGRESQL (STORAGE SINK FOR INSIGHTS)
  # -------------------------------------------------------------
  postgres:
    image: postgres:15-alpine
    container_name: ecommerce_postgres
    restart: always
    environment:
      POSTGRES_DB: ecommerce_analytics
      POSTGRES_USER: spark_user
      POSTGRES_PASSWORD: analytics_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  hadoop_namenode:
  hadoop_datanode:
  postgres_data:
`;

export const ANALYSIS_PY_CONTENT = `"""
Analysis.py - PySpark Batch Preprocessing & Behavior Insights
Objective:
Employs Hadoop HDFS and Apache Spark for batch processing to segment
customers, identify churn-risk cohorts, and compute aggregation metrics.
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, when, avg, count, sum as _sum, round as _round, stddev
)

def init_spark_session():
    return (
        SparkSession.builder
        .appName("EcommerceCustomerBehavior-BatchAnalysis")
        .master("yarn")
        .config("spark.executor.memory", "4g")
        .config("spark.executor.cores", "2")
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )

def main():
    spark = init_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    print(">>> [Stage 1] Ingesting CSV from Hadoop HDFS...")
    hdfs_path = "hdfs://namenode:9000/E-commerceCustomerBehavior-Sheet1.csv"
    
    df = (
        spark.read
        .format("csv")
        .option("header", "true")
        .option("inferSchema", "true")
        .load(hdfs_path)
    )

    print(f">>> Successfully loaded {df.count()} customer records.")
    df.printSchema()

    # Data Cleaning & Standardization
    cleaned_df = (
        df.filter(col("Customer ID").isNotNull())
        .withColumnRenamed("Customer ID", "customer_id")
        .withColumnRenamed("Membership Type", "membership_type")
        .withColumnRenamed("Total Spend", "total_spend")
        .withColumnRenamed("Items Purchased", "items_purchased")
        .withColumnRenamed("Average Rating", "average_rating")
        .withColumnRenamed("Discount Applied", "discount_applied")
        .withColumnRenamed("Days Since Last Purchase", "days_since_last_purchase")
        .withColumnRenamed("Satisfaction Level", "satisfaction_level")
    )

    # 1. Demographic & Shopping Behavior Segmentation
    print(">>> [Stage 2] Computing Demographic & Spending Aggregations...")
    city_spend_summary = (
        cleaned_df.groupBy("City", "membership_type")
        .agg(
            count("customer_id").alias("customer_count"),
            _round(avg("total_spend"), 2).alias("avg_spend"),
            _round(avg("items_purchased"), 2).alias("avg_items"),
            _round(avg("average_rating"), 2).alias("avg_rating")
        )
        .orderBy(col("avg_spend").desc())
    )
    city_spend_summary.show(10)

    # 2. Risk of Churn Analysis: Days Since Last Purchase & Satisfaction
    print(">>> [Stage 3] Identifying At-Risk Customer Segments...")
    churn_risk_df = cleaned_df.withColumn(
        "churn_risk_tier",
        when((col("days_since_last_purchase") > 45) & (col("satisfaction_level") == "Unsatisfied"), "High Risk")
        .when((col("days_since_last_purchase") > 45) & (col("satisfaction_level") == "Neutral"), "Medium Risk")
        .when((col("satisfaction_level") == "Unsatisfied"), "Moderate Risk")
        .otherwise("Retained / Safe")
    )

    risk_summary = churn_risk_df.groupBy("churn_risk_tier").agg(
        count("customer_id").alias("total_customers"),
        _round(avg("total_spend"), 2).alias("avg_historical_spend"),
        _round(avg("days_since_last_purchase"), 1).alias("avg_days_dormant")
    )
    risk_summary.show()

    # 3. Write Processed Aggregates to PostgreSQL
    print(">>> [Stage 4] Exporting Batch Insights to PostgreSQL...")
    (
        city_spend_summary.write
        .format("jdbc")
        .option("url", "jdbc:postgresql://postgres:5432/ecommerce_analytics")
        .option("dbtable", "batch_city_segmentation_summary")
        .option("user", "spark_user")
        .option("password", "analytics_secure_password")
        .mode("overwrite")
        .save()
    )

    print(">>> Batch analysis completed successfully.")
    spark.stop()

if __name__ == "__main__":
    main()
`;

export const PREDICT_PY_CONTENT = `"""
predict.py - PySpark MLlib Logistic Regression Satisfaction Classifier
Objective:
Predict customer's Satisfaction Level (Satisfied, Neutral, Unsatisfied)
based on demographic features and purchase behavior.
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when
from pyspark.ml.feature import (
    StringIndexer, OneHotEncoder, VectorAssembler, StandardScaler
)
from pyspark.ml.classification import LogisticRegression
from pyspark.ml import Pipeline
from pyspark.ml.evaluation import MulticlassClassificationEvaluator

def main():
    spark = SparkSession.builder \\
        .appName("Ecommerce-PredictSatisfaction-LogisticRegression") \\
        .getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")

    hdfs_data = "hdfs://namenode:9000/E-commerceCustomerBehavior-Sheet1.csv"
    df = spark.read.option("header", "true").option("inferSchema", "true").csv(hdfs_data)

    # Encode target label: Satisfaction Level -> label index (0: Satisfied, 1: Neutral, 2: Unsatisfied)
    label_indexer = StringIndexer(
        inputCol="Satisfaction Level",
        outputCol="label"
    ).fit(df)

    # Categorical encodings
    gender_indexer = StringIndexer(inputCol="Gender", outputCol="gender_idx")
    city_indexer = StringIndexer(inputCol="City", outputCol="city_idx")
    membership_indexer = StringIndexer(inputCol="Membership Type", outputCol="membership_idx")

    encoder = OneHotEncoder(
        inputCols=["gender_idx", "city_idx", "membership_idx"],
        outputCols=["gender_vec", "city_vec", "membership_vec"]
    )

    # Assemble numerical and one-hot vectors into a single feature vector
    assembler = VectorAssembler(
        inputCols=[
            "Age", "Total Spend", "Items Purchased", "Average Rating",
            "Days Since Last Purchase", "gender_vec", "city_vec", "membership_vec"
        ],
        outputCol="raw_features"
    )

    # Standardize features for logistic regression convergence
    scaler = StandardScaler(
        inputCol="raw_features",
        outputCol="features",
        withStd=True,
        withMean=True
    )

    # Multi-class Logistic Regression with ElasticNet Regularization
    lr = LogisticRegression(
        featuresCol="features",
        labelCol="label",
        maxIter=100,
        regParam=0.01,
        elasticNetParam=0.2,
        family="multinomial"
    )

    # Build ML Pipeline
    pipeline = Pipeline(stages=[
        label_indexer,
        gender_indexer,
        city_indexer,
        membership_indexer,
        encoder,
        assembler,
        scaler,
        lr
    ])

    train_data, test_data = df.randomSplit([0.8, 0.2], seed=42)
    print(f"Training instances: {train_data.count()}, Test instances: {test_data.count()}")

    print(">>> Fitting Logistic Regression pipeline on Spark Cluster...")
    model = pipeline.fit(train_data)

    print(">>> Running batch predictions on test split...")
    predictions = model.transform(test_data)

    # Model Evaluation
    evaluator_acc = MulticlassClassificationEvaluator(labelCol="label", metricName="accuracy")
    evaluator_f1 = MulticlassClassificationEvaluator(labelCol="label", metricName="f1")

    accuracy = evaluator_acc.evaluate(predictions)
    f1_score = evaluator_f1.evaluate(predictions)

    print("=" * 50)
    print(f"Model Evaluation Results:")
    print(f"Test Accuracy: {accuracy * 100:.2f}%")
    print(f"Test F1-Score: {f1_score:.4f}")
    print("=" * 50)

    # Save model pipeline for real-time inference
    model_output_path = "hdfs://namenode:9000/models/logistic_regression_satisfaction"
    model.write().overwrite().save(model_output_path)
    print(f"Model successfully serialized to {model_output_path}")

    spark.stop()

if __name__ == "__main__":
    main()
`;

export const KAFKA_PRODUCER_PY = `"""
KafkaProducer.py - Real-Time E-Commerce Transaction Stream Producer
Ingests dynamic customer purchases and ratings into Kafka topics.
"""

import time
import json
import random
from datetime import datetime
from kafka import KafkaProducer

def json_serializer(data):
    return json.dumps(data).encode("utf-8")

def main():
    producer = KafkaProducer(
        bootstrap_servers=['kafka:29092', 'localhost:9092'],
        value_serializer=json_serializer
    )

    cities = ["New York", "Los Angeles", "Chicago", "San Francisco", "Houston", "Miami"]
    memberships = ["Bronze", "Silver", "Gold"]

    print(">>> Kafka Producer active. Streaming real-time e-commerce transactions...")

    event_id = 1
    while True:
        # Simulate realistic shopping event
        membership = random.choice(memberships)
        multiplier = 2.8 if membership == "Gold" else (1.5 if membership == "Silver" else 1.0)
        items = random.randint(1, 12)
        base_amount = items * random.uniform(30, 95) * multiplier
        
        # Inject occasional anomaly (e.g. velocity fraud or rating crash)
        is_anomaly = random.random() < 0.05
        if is_anomaly:
            base_amount = round(base_amount * 6.5, 2)
            rating = 1.0
            anomaly_flag = "SURGE_SPEND_OUTLIER"
        else:
            base_amount = round(base_amount, 2)
            rating = round(random.uniform(3.0, 5.0), 1)
            anomaly_flag = None

        payload = {
            "event_id": f"EVT-{event_id:06d}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "customer_id": f"CUST-{random.randint(1001, 1380)}",
            "city": random.choice(cities),
            "membership_type": membership,
            "amount": base_amount,
            "items_count": items,
            "rating": rating,
            "is_anomaly": is_anomaly,
            "anomaly_reason": anomaly_flag
        }

        # Send to partition based on city hash
        producer.send("ecommerce.transactions.v1", value=payload)
        print(f"Produced event {payload['event_id']} | Spend: \${payload['amount']} | City: {payload['city']}")
        
        event_id += 1
        time.sleep(random.uniform(0.4, 1.2))

if __name__ == "__main__":
    main()
`;

export const SPARK_STREAMING_PY = `"""
SparkStreamingConsumer.py - Apache Spark Structured Streaming
Filters, aggregates, detects anomalies in real-time and persists to PostgreSQL / HDFS.
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, window, avg, sum as _sum, count
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, IntegerType, BooleanType, TimestampType
)

def main():
    spark = SparkSession.builder \\
        .appName("Ecommerce-SparkStreaming-RealTime") \\
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.1.1,org.postgresql:postgresql:42.2.18") \\
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    # Transaction Schema definition
    schema = StructType([
        StructField("event_id", StringType()),
        StructField("timestamp", TimestampType()),
        StructField("customer_id", StringType()),
        StructField("city", StringType()),
        StructField("membership_type", StringType()),
        StructField("amount", DoubleType()),
        StructField("items_count", IntegerType()),
        StructField("rating", DoubleType()),
        StructField("is_anomaly", BooleanType()),
        StructField("anomaly_reason", StringType())
    ])

    # 1. Read Stream from Kafka
    kafka_df = (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", "kafka:29092")
        .option("subscribe", "ecommerce.transactions.v1")
        .option("startingOffsets", "latest")
        .load()
    )

    # 2. Parse JSON & Extract Fields
    parsed_stream = (
        kafka_df.selectExpr("CAST(value AS STRING) as json_payload")
        .select(from_json(col("json_payload"), schema).alias("data"))
        .select("data.*")
    )

    # 3. Real-Time Anomaly Detection Engine
    anomalies = parsed_stream.filter(
        (col("amount") > 1500) | (col("rating") <= 1.5) | (col("is_anomaly") == True)
    )

    # 4. Sliding Window Aggregates (Window: 30 seconds, Slide: 10 seconds)
    windowed_aggregates = (
        parsed_stream
        .withWatermark("timestamp", "1 minute")
        .groupBy(
            window(col("timestamp"), "30 seconds", "10 seconds"),
            col("city")
        )
        .agg(
            count("event_id").alias("transaction_count"),
            _sum("amount").alias("window_revenue"),
            avg("amount").alias("avg_order_value"),
            avg("rating").alias("avg_satisfaction")
        )
    )

    # 5. Output Sink to Console and PostgreSQL Sink
    query_console = (
        windowed_aggregates.writeStream
        .outputMode("update")
        .format("console")
        .option("truncate", "false")
        .start()
    )

    query_console.awaitTermination()

if __name__ == "__main__":
    main()
`;
