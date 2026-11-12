from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import haversine_distances

EARTH_RADIUS_KM = 6371.0088
SEVERITY_ORDER = ["Minor", "Serious", "Fatal"]


def load_points(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path, low_memory=False)
    frame["latitude"] = pd.to_numeric(frame["latitude"], errors="coerce")
    frame["longitude"] = pd.to_numeric(frame["longitude"], errors="coerce")
    frame = frame.dropna(subset=["latitude", "longitude"])
    frame = frame[frame["latitude"].between(-90, 90) & frame["longitude"].between(-180, 180)]
    return frame.reset_index(drop=True)


def summarize_clusters(frame: pd.DataFrame, labels: np.ndarray, centroids: list[tuple[float, float]]) -> list[dict]:
    summaries = []
    for index, (latitude, longitude) in enumerate(centroids):
        cluster = frame[labels == index]
        if cluster.empty:
            continue
        severity_counts = {
            severity: int((cluster["severity"] == severity).sum()) for severity in SEVERITY_ORDER
        }
        time_mode = cluster["time_of_day"].mode()
        weather_mode = cluster["weather"].mode()
        summaries.append(
            {
                "cluster_id": index,
                "latitude": round(float(latitude), 6),
                "longitude": round(float(longitude), 6),
                "accident_count": int(len(cluster)),
                "minor_count": severity_counts["Minor"],
                "serious_count": severity_counts["Serious"],
                "fatal_count": severity_counts["Fatal"],
                "severity_distribution": severity_counts,
                "most_common_time": str(time_mode.iloc[0]) if not time_mode.empty else None,
                "most_common_weather": str(weather_mode.iloc[0]) if not weather_mode.empty else None,
            }
        )
    return sorted(summaries, key=lambda item: item["accident_count"], reverse=True)


def kmeans_summary(frame: pd.DataFrame, n_clusters: int, random_state: int) -> tuple[KMeans, list[dict]]:
    points = np.radians(frame[["latitude", "longitude"]].to_numpy())
    model = KMeans(n_clusters=min(n_clusters, len(points)), random_state=random_state, n_init=10)
    labels = model.fit_predict(points)
    centroids = np.degrees(model.cluster_centers_)
    summaries = summarize_clusters(
        frame,
        labels,
        [(latitude, longitude) for latitude, longitude in centroids],
    )
    return model, summaries


def dbscan_summary(
    frame: pd.DataFrame,
    eps_km: float,
    min_samples: int,
) -> tuple[DBSCAN, list[dict], int]:
    points = np.radians(frame[["latitude", "longitude"]].to_numpy())
    model = DBSCAN(
        eps=eps_km / EARTH_RADIUS_KM,
        min_samples=min_samples,
        metric="haversine",
        algorithm="ball_tree",
    )
    labels = model.fit_predict(points)
    unique = sorted(set(labels) - {-1})
    centroids = []
    for label in unique:
        mask = labels == label
        centroid = frame.loc[mask, ["latitude", "longitude"]].mean()
        centroids.append((float(centroid["latitude"]), float(centroid["longitude"])))
    summaries = summarize_clusters(frame, labels, centroids)
    noise_count = int((labels == -1).sum())
    return model, summaries, noise_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and evaluate RoadSafe AI hotspot clustering")
    parser.add_argument("--dataset", type=Path, default=Path("data/accidents_uk_2022.csv"))
    parser.add_argument("--output-dir", type=Path, default=Path("models"))
    parser.add_argument("--clusters", type=int, default=12)
    parser.add_argument("--eps-km", type=float, default=2.0)
    parser.add_argument("--min-samples", type=int, default=20)
    parser.add_argument("--max-dbscan-points", type=int, default=20000)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    if not args.dataset.exists():
        raise SystemExit(f"Dataset not found: {args.dataset}. Run training.prepare_dataset first.")

    frame = load_points(args.dataset)
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    kmeans, kmeans_clusters = kmeans_summary(frame, args.clusters, args.random_state)

    sample_size = min(len(frame), args.max_dbscan_points)
    dbscan_frame = frame.sample(n=sample_size, random_state=args.random_state) if sample_size < len(frame) else frame
    dbscan, dbscan_clusters, noise_count = dbscan_summary(
        dbscan_frame,
        args.eps_km,
        args.min_samples,
    )

    sample_for_silhouette = frame.sample(n=min(2000, len(frame)), random_state=args.random_state)
    sample_points = np.radians(sample_for_silhouette[["latitude", "longitude"]].to_numpy())
    sample_labels = kmeans.predict(sample_points)
    silhouette = None
    if len(set(sample_labels)) > 1:
        distances = haversine_distances(sample_points)
        silhouette = round(float(silhouette_score(distances, sample_labels, metric="precomputed")), 4)

    dbscan_sizes = [item["accident_count"] for item in dbscan_clusters]
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_rows": int(len(frame)),
        "clustering_note": "Clustering is evaluated with geographic cluster sizes, severity mixes, silhouette score for K-Means, and DBSCAN noise counts. Classification accuracy is not used.",
        "kmeans": {
            "n_clusters": args.clusters,
            "cluster_sizes": [item["accident_count"] for item in kmeans_clusters],
            "silhouette_haversine_sample": silhouette,
            "centroids": [
                {
                    "cluster_id": item["cluster_id"],
                    "latitude": item["latitude"],
                    "longitude": item["longitude"],
                }
                for item in kmeans_clusters
            ],
        },
        "dbscan": {
            "eps_km": args.eps_km,
            "min_samples": args.min_samples,
            "sample_size": int(sample_size),
            "cluster_count": len(dbscan_clusters),
            "noise_count": noise_count,
            "noise_percentage": round(noise_count / sample_size * 100, 2) if sample_size else 0,
            "cluster_sizes": dbscan_sizes,
            "largest_cluster": max(dbscan_sizes) if dbscan_sizes else 0,
        },
    }

    joblib.dump(kmeans, output_dir / "hotspots_kmeans.joblib", compress=3)
    with (output_dir / "hotspots_metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    with (output_dir / "hotspots_default.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "generated_at": metrics["trained_at"],
                "kmeans": kmeans_clusters,
                "dbscan": dbscan_clusters,
                "dbscan_noise_count": noise_count,
            },
            handle,
            indent=2,
        )

    print(json.dumps(metrics, indent=2))
    print(f"Saved hotspot artifacts to {output_dir}")


if __name__ == "__main__":
    main()
