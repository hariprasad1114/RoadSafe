from __future__ import annotations

import argparse
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

COLLISION_URL = "https://data.dft.gov.uk/road-accidents-safety-data/dft-road-casualty-statistics-collision-2022.csv"
VEHICLE_URL = "https://data.dft.gov.uk/road-accidents-safety-data/dft-road-casualty-statistics-vehicle-2022.csv"

SEVERITY_MAP = {1: "Fatal", 2: "Serious", 3: "Minor"}
WEATHER_MAP = {
    1: "Clear",
    2: "Rainy",
    3: "Snowy",
    4: "Cloudy",
    5: "Rainy",
    6: "Snowy",
    7: "Foggy",
    8: "Other",
    9: "Other",
}
ROAD_CONDITION_MAP = {
    1: "Dry",
    2: "Wet",
    3: "Snowy/Icy",
    4: "Snowy/Icy",
    5: "Flooded",
    9: "Other",
}
LIGHTING_MAP = {
    1: "Good",
    4: "Moderate",
    5: "Poor",
    6: "No Lighting",
    7: "Poor",
}
VEHICLE_MAP = {
    1: "Two-Wheeler",
    2: "Two-Wheeler",
    3: "Two-Wheeler",
    4: "Two-Wheeler",
    5: "Two-Wheeler",
    8: "Car",
    9: "Car",
    10: "Bus",
    11: "Bus",
    16: "Other",
    17: "Other",
    18: "Other",
    19: "Truck",
    20: "Truck",
    21: "Truck",
    22: "Two-Wheeler",
    23: "Two-Wheeler",
    90: "Other",
    97: "Two-Wheeler",
    98: "Truck",
}

OUTPUT_COLUMNS = [
    "accident_id",
    "accident_date",
    "latitude",
    "longitude",
    "time_of_day",
    "day_of_week",
    "weather",
    "road_condition",
    "road_type",
    "vehicle_type",
    "speed_limit",
    "lighting_condition",
    "severity",
    "source_dataset",
]


def download_if_missing(url: str, destination: Path) -> Path:
    if destination.exists() and destination.stat().st_size > 0:
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}")
    urllib.request.urlretrieve(url, destination)
    return destination


def time_bucket(value: object) -> str:
    if pd.isna(value):
        return "Unknown"
    text = str(value).strip()
    try:
        hour = int(text.split(":")[0])
    except (ValueError, IndexError):
        return "Unknown"
    if 5 <= hour < 12:
        return "Morning"
    if 12 <= hour < 17:
        return "Afternoon"
    if 17 <= hour < 21:
        return "Evening"
    return "Night"


def map_road_type(row: pd.Series) -> str:
    junction = row.get("junction_detail")
    road_type = row.get("road_type")
    speed_limit = row.get("speed_limit")
    urban_rural = row.get("urban_or_rural_area")
    if road_type == 1 or junction in {1, 2, 3, 6, 7}:
        return "Intersection"
    if road_type == 3 or (pd.notna(speed_limit) and speed_limit >= 60):
        return "Highway"
    if urban_rural == 1:
        return "Urban Road"
    if urban_rural == 2:
        return "Rural Road"
    return "Other"


def build_dataset(collision_path: Path, vehicle_path: Path) -> pd.DataFrame:
    collisions = pd.read_csv(collision_path, low_memory=False)
    vehicles = pd.read_csv(vehicle_path, low_memory=False)

    collisions.columns = [column.strip().lower() for column in collisions.columns]
    vehicles.columns = [column.strip().lower() for column in vehicles.columns]

    vehicles = vehicles.sort_values(["collision_index", "vehicle_reference"]).drop_duplicates(
        "collision_index"
    )
    vehicles = vehicles[["collision_index", "vehicle_type"]].rename(
        columns={"vehicle_type": "vehicle_type_code"}
    )

    frame = collisions.merge(vehicles, on="collision_index", how="left")

    frame["severity"] = pd.to_numeric(frame["collision_severity"], errors="coerce").map(SEVERITY_MAP)
    frame["weather"] = pd.to_numeric(frame["weather_conditions"], errors="coerce").map(WEATHER_MAP)
    frame["road_condition"] = pd.to_numeric(
        frame["road_surface_conditions"], errors="coerce"
    ).map(ROAD_CONDITION_MAP)
    frame["lighting_condition"] = pd.to_numeric(frame["light_conditions"], errors="coerce").map(
        LIGHTING_MAP
    )
    frame["vehicle_type"] = pd.to_numeric(frame["vehicle_type_code"], errors="coerce").map(
        VEHICLE_MAP
    )

    frame["latitude"] = pd.to_numeric(frame["latitude"], errors="coerce")
    frame["longitude"] = pd.to_numeric(frame["longitude"], errors="coerce")
    frame["speed_limit"] = pd.to_numeric(frame["speed_limit"], errors="coerce")
    frame["accident_date"] = pd.to_datetime(frame["date"], dayfirst=True, errors="coerce")
    frame["accident_id"] = frame["collision_index"].astype(str)
    frame["time_of_day"] = frame["time"].map(time_bucket)
    frame["day_of_week"] = frame["accident_date"].dt.day_name()

    frame["road_type"] = frame.apply(map_road_type, axis=1)

    frame = frame.dropna(subset=["severity", "accident_date", "latitude", "longitude"])
    frame = frame[
        frame["latitude"].between(49.0, 61.5)
        & frame["longitude"].between(-9.0, 2.5)
        & (frame["latitude"] != 0)
        & (frame["longitude"] != 0)
    ]
    frame = frame[frame["speed_limit"].between(5, 90, inclusive="both")]

    frame["weather"] = frame["weather"].fillna("Other")
    frame["road_condition"] = frame["road_condition"].fillna("Other")
    frame["lighting_condition"] = frame["lighting_condition"].fillna("Other")
    frame["vehicle_type"] = frame["vehicle_type"].fillna("Other")
    frame["time_of_day"] = frame["time_of_day"].replace("Unknown", "Night")

    frame["source_dataset"] = "uk-dft-collision-2022"
    frame["accident_date"] = frame["accident_date"].dt.strftime("%Y-%m-%d")

    frame = frame.drop_duplicates(subset=["accident_id"])

    return frame[OUTPUT_COLUMNS].sort_values(["accident_date", "accident_id"]).reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare UK DfT 2022 collision data for RoadSafe AI")
    parser.add_argument("--collision", type=Path, default=Path("data/raw/collision-2022.csv"))
    parser.add_argument("--vehicle", type=Path, default=Path("data/raw/vehicle-2022.csv"))
    parser.add_argument("--output", type=Path, default=Path("data/accidents_uk_2022.csv"))
    parser.add_argument("--sample-output", type=Path, default=Path("data/accidents_sample.csv"))
    parser.add_argument("--sample-size", type=int, default=5000)
    args = parser.parse_args()

    collision_path = download_if_missing(COLLISION_URL, args.collision)
    vehicle_path = download_if_missing(VEHICLE_URL, args.vehicle)

    frame = build_dataset(collision_path, vehicle_path)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.output, index=False)

    sample_size = min(args.sample_size, len(frame))
    sample = frame.sample(n=sample_size, random_state=42).sort_values("accident_date")
    sample.to_csv(args.sample_output, index=False)

    print(f"Prepared {len(frame):,} records -> {args.output}")
    print(f"Bundled fallback sample {len(sample):,} records -> {args.sample_output}")
    print(frame["severity"].value_counts().to_string())
    print(frame["road_type"].value_counts().to_string())
    print(frame["vehicle_type"].value_counts().to_string())
    print(frame["weather"].value_counts().to_string())
    print(
        "Date range:",
        frame["accident_date"].min(),
        "to",
        frame["accident_date"].max(),
    )


if __name__ == "__main__":
    main()
