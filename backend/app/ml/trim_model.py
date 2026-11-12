from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib


def trim_forests(model, trees: int) -> int:
    """Keep the first ``trees`` estimators of each random forest stage."""
    for name in ("severe_pipeline", "fatal_pipeline"):
        pipeline = getattr(model, name)
        forest = pipeline.named_steps["model"]
        forest.estimators_ = forest.estimators_[:trees]
        forest.n_estimators = len(forest.estimators_)
    return trees


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Reduce the size of the deployed severity model so it fits small "
            "compute machines. A subset of a trained random forest is still a "
            "valid forest; predictions change only slightly."
        )
    )
    parser.add_argument("--model-dir", type=Path, default=Path("models"))
    parser.add_argument("--trees", type=int, default=90)
    args = parser.parse_args()

    model_path = args.model_dir / "severity_pipeline.joblib"
    model = joblib.load(model_path)
    original = len(model.severe_pipeline.named_steps["model"].estimators_)
    if args.trees >= original:
        print(f"{model_path} already uses {original} trees; nothing to trim.")
        return

    trim_forests(model, args.trees)
    joblib.dump(model, model_path, compress=3)

    for filename in ("severity_metrics.json", "severity_metadata.json"):
        path = args.model_dir / filename
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        if "n_estimators" not in payload:
            continue
        payload["n_estimators"] = args.trees
        payload["deployment_note"] = (
            f"Deployed model pruned from {original} to {args.trees} trees per stage "
            "to fit within 512 MB of RAM. Evaluation metrics were measured on the "
            f"full {original}-tree model."
        )
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Trimmed {model_path} from {original} to {args.trees} trees per stage.")


if __name__ == "__main__":
    main()
