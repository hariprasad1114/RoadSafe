from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    fbeta_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.ml.features import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    CLASS_ORDER,
    DERIVED_FEATURES,
    NUMERIC_FEATURES,
    RAW_FEATURES,
    TARGET,
    prepare_features,
)
from app.ml.hierarchy import HierarchicalSeverityModel

MODEL_VERSION = "1.2.0"
FATAL_THRESHOLD_GRID = [0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.25]
SERIOUS_WEIGHT_GRID = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25]


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_dataset(path: Path, max_rows: int | None) -> tuple[pd.DataFrame, str, int, dict[str, int]]:
    raw_targets = pd.read_csv(path, usecols=[TARGET])[TARGET]
    raw_targets = raw_targets.dropna()
    raw_targets = raw_targets[raw_targets.isin(CLASS_ORDER)]
    full_row_count = int(len(raw_targets))
    full_class_counts = {
        label: int((raw_targets == label).sum()) for label in CLASS_ORDER
    }

    frame = pd.read_csv(path, low_memory=False)
    frame = frame.dropna(subset=[TARGET])
    frame = frame[frame[TARGET].isin(CLASS_ORDER)].copy()
    target = frame[TARGET].copy()
    frame = prepare_features(frame)
    frame[TARGET] = target.loc[frame.index]

    if max_rows and len(frame) > max_rows:
        frame, _ = train_test_split(
            frame,
            train_size=max_rows,
            stratify=frame[TARGET],
            random_state=42,
        )
    return frame.reset_index(drop=True), file_digest(path), full_row_count, full_class_counts


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", min_frequency=20),
                CATEGORICAL_FEATURES,
            ),
            ("numeric", StandardScaler(), NUMERIC_FEATURES),
        ],
        remainder="drop",
    )


def build_random_forest(random_state: int, n_estimators: int) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=24,
        min_samples_leaf=4,
        max_features=0.35,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=random_state,
    )


def build_severe_pipeline(random_state: int, n_estimators: int) -> Pipeline:
    return Pipeline(
        [
            ("preprocessor", build_preprocessor()),
            ("model", build_random_forest(random_state, n_estimators)),
        ]
    )


def build_hierarchical(
    frame: pd.DataFrame,
    random_state: int,
    n_estimators: int,
    fatal_threshold: float = 0.15,
    serious_weight: float = 1.5,
) -> HierarchicalSeverityModel:
    features = frame[ALL_FEATURES]
    target = frame[TARGET]
    severe_target = (target != "Minor").astype(int)
    fatal_target = (target == "Fatal").astype(int)

    severe_pipeline = build_severe_pipeline(random_state, n_estimators)
    severe_pipeline.fit(features, severe_target)

    severe_mask = target != "Minor"
    fatal_pipeline = build_severe_pipeline(random_state + 1, n_estimators)
    fatal_pipeline.fit(features.loc[severe_mask], fatal_target.loc[severe_mask])

    return HierarchicalSeverityModel(
        severe_pipeline=severe_pipeline,
        fatal_pipeline=fatal_pipeline,
        fatal_threshold=fatal_threshold,
        serious_weight=serious_weight,
        class_order=list(CLASS_ORDER),
    )


def metrics_from_predictions(target: pd.Series, predictions: np.ndarray, labels: list[str]) -> dict:
    report = {}
    for label in labels:
        report[label] = {
            "precision": round(float(precision_score(target, predictions, labels=[label], average="macro", zero_division=0)), 4),
            "recall": round(float(recall_score(target, predictions, labels=[label], average="macro", zero_division=0)), 4),
            "f1": round(float(f1_score(target, predictions, labels=[label], average="macro", zero_division=0)), 4),
            "f2": round(float(fbeta_score(target, predictions, beta=2, labels=[label], average="macro", zero_division=0)), 4),
            "support": int((target == label).sum()),
        }
    matrix = confusion_matrix(target, predictions, labels=labels)
    return {
        "accuracy": round(float(accuracy_score(target, predictions)), 4),
        "macro_precision": round(float(precision_score(target, predictions, average="macro", zero_division=0)), 4),
        "macro_recall": round(float(recall_score(target, predictions, average="macro", zero_division=0)), 4),
        "macro_f1": round(float(f1_score(target, predictions, average="macro", zero_division=0)), 4),
        "weighted_precision": round(float(precision_score(target, predictions, average="weighted", zero_division=0)), 4),
        "weighted_recall": round(float(recall_score(target, predictions, average="weighted", zero_division=0)), 4),
        "weighted_f1": round(float(f1_score(target, predictions, average="weighted", zero_division=0)), 4),
        "per_class": report,
        "confusion_matrix": matrix.tolist(),
        "labels": labels,
    }


def decide(probabilities: np.ndarray, fatal_threshold: float, serious_weight: float) -> np.ndarray:
    rows = np.atleast_2d(probabilities)
    results = []
    for minor, serious, fatal in rows:
        if fatal >= fatal_threshold:
            results.append("Fatal")
        elif serious * serious_weight >= minor:
            results.append("Serious")
        else:
            results.append("Minor")
    return np.array(results)


def score_rule(metrics: dict) -> float:
    fatal = metrics["per_class"].get("Fatal", {})
    serious = metrics["per_class"].get("Serious", {})
    return round(
        0.40 * fatal.get("f2", 0.0)
        + 0.35 * serious.get("f1", 0.0)
        + 0.25 * metrics["macro_f1"],
        5,
    )


def tune_decision_rule(probabilities: np.ndarray, target: pd.Series) -> tuple[dict, float]:
    best: dict | None = None
    best_score = -1.0
    for fatal_threshold in FATAL_THRESHOLD_GRID:
        for serious_weight in SERIOUS_WEIGHT_GRID:
            predictions = decide(probabilities, fatal_threshold, serious_weight)
            metrics = metrics_from_predictions(target, predictions, list(CLASS_ORDER))
            score = score_rule(metrics)
            if score > best_score:
                best_score = score
                best = {
                    "fatal_threshold": fatal_threshold,
                    "serious_weight": serious_weight,
                    "validation_score": score,
                    "validation_metrics": metrics,
                }
    assert best is not None
    return best, best_score


def save_plots(
    matrix: list[list[int]],
    labels: list[str],
    class_counts: dict[str, int],
    feature_names: list[str],
    importances: list[float],
    output_dir: Path,
) -> None:
    evaluation_dir = output_dir / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)

    fig, axis = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        np.array(matrix),
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=labels,
        yticklabels=labels,
        ax=axis,
    )
    axis.set_xlabel("Predicted")
    axis.set_ylabel("Actual")
    axis.set_title("RoadSafe AI severity model confusion matrix")
    fig.tight_layout()
    fig.savefig(evaluation_dir / "confusion_matrix.png", dpi=140)
    plt.close(fig)

    fig, axis = plt.subplots(figsize=(7, 4))
    ordered = [class_counts.get(label, 0) for label in labels]
    sns.barplot(
        x=labels,
        y=ordered,
        hue=labels,
        palette=["#16a34a", "#f59e0b", "#dc2626"],
        legend=False,
        ax=axis,
    )
    axis.set_title("Severity class distribution in the training data")
    axis.set_ylabel("Accident records")
    fig.tight_layout()
    fig.savefig(evaluation_dir / "class_distribution.png", dpi=140)
    plt.close(fig)

    top = sorted(zip(feature_names, importances), key=lambda item: item[1], reverse=True)[:15]
    fig, axis = plt.subplots(figsize=(8, 5))
    sns.barplot(
        x=[value for _, value in top],
        y=[name for name, _ in top],
        color="#1d6fe0",
        ax=axis,
    )
    axis.set_title("Top Random Forest feature importances")
    axis.set_xlabel("Importance")
    fig.tight_layout()
    fig.savefig(evaluation_dir / "feature_importance.png", dpi=140)
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the RoadSafe AI severity classification model")
    parser.add_argument("--dataset", type=Path, default=Path("data/accidents_uk_2022.csv"))
    parser.add_argument("--output-dir", type=Path, default=Path("models"))
    parser.add_argument("--max-rows", type=int, default=70000)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--validation-size", type=float, default=0.15)
    parser.add_argument("--n-estimators", type=int, default=180)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    if not args.dataset.exists():
        raise SystemExit(f"Dataset not found: {args.dataset}. Run training.prepare_dataset first.")

    frame, dataset_hash, full_row_count, class_counts = load_dataset(args.dataset, args.max_rows)
    labels = [label for label in CLASS_ORDER if label in set(frame[TARGET])]

    train_frame, test_frame = train_test_split(
        frame,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=frame[TARGET],
    )
    fit_frame, validation_frame = train_test_split(
        train_frame,
        test_size=args.validation_size,
        random_state=args.random_state,
        stratify=train_frame[TARGET],
    )

    validation_model = build_hierarchical(
        fit_frame,
        args.random_state,
        args.n_estimators,
    )
    validation_probabilities = validation_model.predict_proba(validation_frame[ALL_FEATURES])
    best_rule, best_score = tune_decision_rule(validation_probabilities, validation_frame[TARGET])

    model = build_hierarchical(
        train_frame,
        args.random_state,
        args.n_estimators,
        fatal_threshold=best_rule["fatal_threshold"],
        serious_weight=best_rule["serious_weight"],
    )

    test_probabilities = model.predict_proba(test_frame[ALL_FEATURES])
    deployed_predictions = model.decide(test_probabilities)
    deployed_metrics = metrics_from_predictions(test_frame[TARGET], deployed_predictions, labels)
    argmax_predictions = model.classes_[np.argmax(test_probabilities, axis=1)]
    argmax_metrics = metrics_from_predictions(test_frame[TARGET], argmax_predictions, labels)

    flat_pipeline = Pipeline(
        [
            ("preprocessor", build_preprocessor()),
            ("model", build_random_forest(args.random_state, args.n_estimators)),
        ]
    )
    flat_pipeline.fit(train_frame[ALL_FEATURES], train_frame[TARGET])
    flat_predictions = flat_pipeline.predict(test_frame[ALL_FEATURES])
    flat_metrics = metrics_from_predictions(test_frame[TARGET], flat_predictions, labels)

    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(train_frame[ALL_FEATURES], train_frame[TARGET])
    dummy_predictions = dummy.predict(test_frame[ALL_FEATURES])
    dummy_metrics = metrics_from_predictions(test_frame[TARGET], dummy_predictions, labels)

    logistic = Pipeline(
        [
            ("preprocessor", build_preprocessor()),
            (
                "model",
                LogisticRegression(
                    max_iter=400,
                    class_weight="balanced",
                    random_state=args.random_state,
                ),
            ),
        ]
    )
    logistic.fit(train_frame[ALL_FEATURES], train_frame[TARGET])
    logistic_predictions = logistic.predict(test_frame[ALL_FEATURES])
    logistic_metrics = metrics_from_predictions(test_frame[TARGET], logistic_predictions, labels)

    preprocessor = flat_pipeline.named_steps["preprocessor"]
    feature_names = list(preprocessor.get_feature_names_out())
    importances = list(flat_pipeline.named_steps["model"].feature_importances_)
    top_features = sorted(
        (
            {"feature": name, "importance": round(float(value), 5)}
            for name, value in zip(feature_names, importances)
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )[:25]

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_dir / "severity_pipeline.joblib", compress=3)
    joblib.dump(flat_pipeline, output_dir / "severity_flat_pipeline.joblib", compress=3)

    trained_at = datetime.now(timezone.utc).isoformat()
    decision_rule = {
        "fatal_threshold": best_rule["fatal_threshold"],
        "serious_weight": best_rule["serious_weight"],
        "validation_score": best_score,
        "description": (
            "The deployed decision rule is safety-oriented: Fatal is selected when the estimated fatal "
            "probability reaches the tuned threshold; otherwise Serious is selected when the weighted "
            "Serious estimate reaches the Minor estimate. This prioritizes severe-outcome recall."
        ),
    }

    metrics_payload = {
        "model_name": "Hierarchical Random Forest (2-stage)",
        "model_kind": "hierarchical_random_forest",
        "model_version": MODEL_VERSION,
        "trained_at": trained_at,
        "dataset_version": dataset_hash[:16],
        "dataset_path": str(args.dataset),
        "dataset_rows": full_row_count,
        "training_pool_rows": int(len(frame)),
        "training_rows": int(len(train_frame)),
        "validation_rows": int(len(validation_frame)),
        "test_rows": int(len(test_frame)),
        "features": ALL_FEATURES,
        "raw_features": RAW_FEATURES,
        "derived_features": DERIVED_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "class_order": labels,
        "class_counts": class_counts,
        "test_size": args.test_size,
        "validation_size": args.validation_size,
        "random_state": args.random_state,
        "n_estimators": args.n_estimators,
        "class_weight": "balanced_subsample",
        "decision_rule": decision_rule,
        "metrics": deployed_metrics,
        "argmax_metrics": argmax_metrics,
        "flat_model_metrics": flat_metrics,
        "baselines": {
            "dummy_most_frequent": dummy_metrics,
            "logistic_regression": logistic_metrics,
        },
        "top_features": top_features,
        "probability_note": (
            "Probabilities are model estimates from a class-weighted hierarchical Random Forest. "
            "They have not been calibrated and should not be read as exact real-world likelihoods. "
            "The predicted class uses a safety-oriented decision rule."
        ),
        "performance_note": (
            "The supplied accident-condition features carry limited signal for Fatal outcomes because "
            "fatal collisions are rare and partly depend on unobserved factors such as impact speed, "
            "vehicle safety, and emergency response. Serious and Fatal recall are reported explicitly; "
            "accuracy alone is not used to judge the model."
        ),
        "dataset_source": "UK Department for Transport road safety open data, collisions 2022",
        "dataset_licence": "Open Government Licence v3.0",
    }

    metadata_payload = {
        "model_name": metrics_payload["model_name"],
        "model_kind": metrics_payload["model_kind"],
        "model_version": MODEL_VERSION,
        "trained_at": trained_at,
        "dataset_version": dataset_hash[:16],
        "features": ALL_FEATURES,
        "raw_features": RAW_FEATURES,
        "derived_features": DERIVED_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "categories": {
            column: sorted(frame[column].dropna().astype(str).unique().tolist())
            for column in CATEGORICAL_FEATURES
        },
        "ranges": {
            "latitude": [float(frame["latitude"].min()), float(frame["latitude"].max())],
            "longitude": [float(frame["longitude"].min()), float(frame["longitude"].max())],
            "speed_limit": [float(frame["speed_limit"].min()), float(frame["speed_limit"].max())],
        },
        "bounds": {
            "min_latitude": float(frame["latitude"].min()),
            "max_latitude": float(frame["latitude"].max()),
            "min_longitude": float(frame["longitude"].min()),
            "max_longitude": float(frame["longitude"].max()),
            "center_latitude": float(frame["latitude"].median()),
            "center_longitude": float(frame["longitude"].median()),
        },
        "class_order": labels,
        "class_counts": class_counts,
        "dataset_rows": full_row_count,
        "training_pool_rows": int(len(frame)),
        "decision_rule": decision_rule,
        "dataset_source": metrics_payload["dataset_source"],
        "dataset_licence": metrics_payload["dataset_licence"],
        "probability_note": metrics_payload["probability_note"],
        "performance_note": metrics_payload["performance_note"],
    }

    with (output_dir / "severity_metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, indent=2)
    with (output_dir / "severity_metadata.json").open("w", encoding="utf-8") as handle:
        json.dump(metadata_payload, handle, indent=2)

    save_plots(
        deployed_metrics["confusion_matrix"],
        labels,
        class_counts,
        feature_names,
        importances,
        output_dir,
    )

    print(json.dumps(deployed_metrics, indent=2))
    print(f"Selected decision rule: {decision_rule}")
    print(f"Fatal recall: {deployed_metrics['per_class'].get('Fatal', {}).get('recall')}")
    print(f"Serious recall: {deployed_metrics['per_class'].get('Serious', {}).get('recall')}")
    print(f"Flat model macro F1: {flat_metrics['macro_f1']}")
    print(f"Saved model artifacts to {output_dir}")


if __name__ == "__main__":
    main()
