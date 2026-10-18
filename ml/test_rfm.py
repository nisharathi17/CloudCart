"""
Unit tests for RFM Segmentation and K-Means logic.
"""

import pytest
import pandas as pd
import numpy as np
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
try:
    from rfm_segmentation import perform_kmeans_clustering
except ImportError:
    from ml.rfm_segmentation import perform_kmeans_clustering

def test_kmeans_clustering_labels_and_distribution():
    # Synthetic RFM dataset mirroring the seed data
    sample_data = {
        "customer_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "customer_name": [f"Customer {i}" for i in range(1, 11)],
        "email": [f"c{i}@test.com" for i in range(1, 11)],
        "city": ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Kolkata", "Bengaluru", "Ahmedabad", "Jaipur"],
        "recency_days": [9, 6, 17, 329, 211, 12, 4, 19, 85, 3],
        "frequency": [2, 2, 1, 1, 1, 1, 1, 1, 0, 1],
        "monetary_value": [472.98, 678.97, 154.50, 80.50, 79.99, 166.00, 34.99, 174.00, 0.00, 83.00]
    }
    df = pd.DataFrame(sample_data)

    clustered_df = perform_kmeans_clustering(df, n_clusters=4)

    assert "segment_label" in clustered_df.columns
    assert "cluster" in clustered_df.columns
    
    unique_labels = set(clustered_df["segment_label"].unique())
    expected_possible_labels = {"Loyal", "Big Spender", "At-Risk", "New"}
    
    # Assert that all assigned labels are among the allowed 4 business labels
    assert unique_labels.issubset(expected_possible_labels)

    # Customer 2 has the highest monetary value ($678.97) -> should be Big Spender
    big_spenders = clustered_df[clustered_df["segment_label"] == "Big Spender"]
    assert len(big_spenders) > 0
    assert 2 in big_spenders["customer_id"].values

    # Customer 4 has the highest recency (329 days) -> should be At-Risk
    at_risks = clustered_df[clustered_df["segment_label"] == "At-Risk"]
    assert len(at_risks) > 0
    assert 4 in at_risks["customer_id"].values

def test_kmeans_empty_dataframe_raises():
    empty_df = pd.DataFrame(columns=["customer_id", "recency_days", "frequency", "monetary_value"])
    with pytest.raises(ValueError):
        perform_kmeans_clustering(empty_df, n_clusters=4)
