#!/usr/bin/env python3
"""
E-Commerce Customer Analytics & Machine Learning Module
RFM Customer Segmentation using K-Means Clustering

Authors / Students:
  - Nisha Rathi (24BYB0137)
  - Anshul Gupta (24BYB0149)

Database: PostgreSQL
Algorithms: scikit-learn StandardScaler, KMeans (k=4)
Target Table: customer_segments
"""

import os
import sys
import logging
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("RFM_Segmentation")

# Load environment variables
load_dotenv()

DEFAULT_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/ecommerce_db"
)

# SQL Query calculating RFM Metrics per customer with robust snapshot reference
RFM_EXTRACTION_QUERY = """
WITH snapshot_ref AS (
    SELECT COALESCE(MAX(order_date), CURRENT_TIMESTAMP) + INTERVAL '1 day' AS snapshot_date
    FROM orders
),
customer_orders AS (
    SELECT
        c.customer_id,
        c.customer_name,
        c.email,
        c.city,
        -- Recency: Days elapsed since customer's last order (or since join date if no orders)
        COALESCE(
            ROUND(EXTRACT(EPOCH FROM (ref.snapshot_date - MAX(o.order_date))) / 86400),
            ROUND(EXTRACT(EPOCH FROM (ref.snapshot_date - c.join_date)) / 86400)
        )::INT AS recency_days,
        -- Frequency: Count of non-cancelled orders
        COUNT(DISTINCT CASE WHEN o.status != 'Cancelled' THEN o.order_id END)::INT AS frequency,
        -- Monetary: Lifetime aggregate spend on non-cancelled orders
        COALESCE(
            SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0 END),
            0.00
        )::NUMERIC(12, 2) AS monetary_value
    FROM customers c
    CROSS JOIN snapshot_ref ref
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.customer_name, c.email, c.city, ref.snapshot_date
)
SELECT
    customer_id,
    customer_name,
    email,
    city,
    recency_days,
    frequency,
    monetary_value
FROM customer_orders
ORDER BY customer_id ASC;
"""


def get_db_connection(database_url: str = None):
    """Establishes and returns a psycopg2 connection."""
    url = database_url or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    return psycopg2.connect(url)


def fetch_rfm_data(connection) -> pd.DataFrame:
    """Executes the RFM SQL query and loads the result into a pandas DataFrame."""
    logger.info("Executing analytical RFM extraction query...")
    df = pd.read_sql_query(RFM_EXTRACTION_QUERY, connection)
    df["recency_days"] = df["recency_days"].astype(int)
    df["frequency"] = df["frequency"].astype(int)
    df["monetary_value"] = df["monetary_value"].astype(float)
    logger.info("Retrieved %d customer records for RFM analysis.", len(df))
    return df


def perform_kmeans_clustering(df: pd.DataFrame, n_clusters: int = 4) -> pd.DataFrame:
    """
    Applies StandardScaler and KMeans clustering (k=4) on RFM metrics.
    Maps cluster centroids dynamically to human-readable labels:
      - 'Big Spender': Highest Monetary centroid
      - 'At-Risk': Highest Recency centroid (longest absence)
      - 'Loyal': Higher Frequency / engagement among remainder
      - 'New': Recent acquisition with low order count
    """
    if len(df) == 0:
        raise ValueError("Customer dataframe is empty. Cannot perform clustering.")

    features = ["recency_days", "frequency", "monetary_value"]
    X = df[features].copy()

    # Scale RFM features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Effective number of clusters cannot exceed unique rows
    effective_k = min(n_clusters, len(df))
    logger.info("Fitting KMeans with k=%d on normalized RFM features...", effective_k)

    kmeans = KMeans(n_clusters=effective_k, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_scaled)

    # Calculate centroid means in original feature space
    cluster_means = df.groupby("cluster")[features].mean()

    # Dynamic domain mapping based on centroid attributes:
    assigned_labels: Dict[int, str] = {}
    remaining_clusters = list(cluster_means.index)

    # 1. Big Spender: Cluster with highest mean Monetary Value
    big_spender_cluster = cluster_means.loc[remaining_clusters, "monetary_value"].idxmax()
    assigned_labels[big_spender_cluster] = "Big Spender"
    remaining_clusters.remove(big_spender_cluster)

    # 2. At-Risk: Cluster with highest mean Recency (longest inactivity)
    if remaining_clusters:
        at_risk_cluster = cluster_means.loc[remaining_clusters, "recency_days"].idxmax()
        assigned_labels[at_risk_cluster] = "At-Risk"
        remaining_clusters.remove(at_risk_cluster)

    # 3. Loyal: Cluster with highest mean Frequency among remaining
    if remaining_clusters:
        loyal_cluster = cluster_means.loc[remaining_clusters, "frequency"].idxmax()
        assigned_labels[loyal_cluster] = "Loyal"
        remaining_clusters.remove(loyal_cluster)

    # 4. New: Remaining cluster (low recency, low frequency)
    if remaining_clusters:
        new_cluster = remaining_clusters[0]
        assigned_labels[new_cluster] = "New"

    # Map cluster index to label with safe fallback
    df["segment_label"] = df["cluster"].map(assigned_labels).fillna("Loyal")

    logger.info("Cluster Label Assignment Summary:")
    for cluster_id, label in assigned_labels.items():
        stats = cluster_means.loc[cluster_id]
        logger.info(
            "  Cluster %s -> Label: '%s' | Mean R: %.1f days, F: %.1f orders, M: $%.2f",
            cluster_id, label, stats["recency_days"], stats["frequency"], stats["monetary_value"]
        )

    return df


def upsert_customer_segments(connection, df: pd.DataFrame) -> int:
    """
    Upserts the RFM metrics and segment labels back into PostgreSQL `customer_segments`.
    Uses ON CONFLICT (customer_id) DO UPDATE.
    """
    upsert_query = """
    INSERT INTO customer_segments (
        customer_id,
        recency_days,
        frequency,
        monetary_value,
        segment_label,
        last_updated
    ) VALUES %s
    ON CONFLICT (customer_id) DO UPDATE
    SET
        recency_days   = EXCLUDED.recency_days,
        frequency      = EXCLUDED.frequency,
        monetary_value = EXCLUDED.monetary_value,
        segment_label  = EXCLUDED.segment_label,
        last_updated   = CURRENT_TIMESTAMP;
    """

    records = [
        (
            int(row["customer_id"]),
            int(row["recency_days"]),
            int(row["frequency"]),
            float(row["monetary_value"]),
            str(row["segment_label"]),
        )
        for _, row in df.iterrows()
    ]

    with connection.cursor() as cursor:
        execute_values(
            cursor,
            upsert_query,
            records,
            template="(%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)"
        )
    connection.commit()
    logger.info("Successfully upserted %d customer segments into database.", len(records))
    return len(records)


def run_pipeline(database_url: str = None) -> pd.DataFrame:
    """End-to-end pipeline runner."""
    conn = get_db_connection(database_url)
    try:
        df = fetch_rfm_data(conn)
        clustered_df = perform_kmeans_clustering(df, n_clusters=4)
        upsert_customer_segments(conn, clustered_df)
        return clustered_df
    finally:
        conn.close()


if __name__ == "__main__":
    db_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATABASE_URL
    print(f"Connecting to database: {db_url}")
    try:
        result_df = run_pipeline(db_url)
        print("\n--- RFM SEGMENTATION RESULTS ---")
        print(
            result_df[[
                "customer_id", "customer_name", "recency_days",
                "frequency", "monetary_value", "segment_label"
            ]].to_string(index=False)
        )
    except Exception as e:
        logger.error("Failed to run RFM Segmentation pipeline: %s", e)
        sys.exit(1)
