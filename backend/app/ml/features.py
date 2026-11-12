from __future__ import annotations

import pandas as pd

RAW_FEATURES = [
    "latitude",
    "longitude",
    "road_type",
    "weather",
    "road_condition",
    "time_of_day",
    "day_of_week",
    "vehicle_type",
    "speed_limit",
    "lighting_condition",
]

CATEGORICAL_FEATURES = [
    "road_type",
    "weather",
    "road_condition",
    "time_of_day",
    "day_of_week",
    "vehicle_type",
    "lighting_condition",
]

BASE_NUMERIC_FEATURES = ["latitude", "longitude", "speed_limit"]

DERIVED_FEATURES = [
    "is_night",
    "is_poor_lighting",
    "is_wet",
    "is_high_speed",
    "is_two_wheeler",
    "is_intersection",
    "is_weekend",
]

NUMERIC_FEATURES = BASE_NUMERIC_FEATURES + DERIVED_FEATURES
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET = "severity"
CLASS_ORDER = ["Minor", "Serious", "Fatal"]


def add_derived_features(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    result["is_night"] = (result["time_of_day"].astype(str) == "Night").astype(int)
    result["is_poor_lighting"] = (
        result["lighting_condition"].astype(str).isin(["Poor", "No Lighting"])
    ).astype(int)
    result["is_wet"] = (
        result["road_condition"].astype(str).isin(["Wet", "Flooded", "Snowy/Icy"])
    ).astype(int)
    speed = pd.to_numeric(result["speed_limit"], errors="coerce").fillna(0)
    result["is_high_speed"] = (speed >= 50).astype(int)
    result["is_two_wheeler"] = (result["vehicle_type"].astype(str) == "Two-Wheeler").astype(int)
    result["is_intersection"] = (result["road_type"].astype(str) == "Intersection").astype(int)
    result["is_weekend"] = (
        result["day_of_week"].astype(str).isin(["Saturday", "Sunday"])
    ).astype(int)
    return result


def prepare_features(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = frame.copy()
    for column in CATEGORICAL_FEATURES:
        prepared[column] = prepared[column].fillna("Other").astype(str)
    for column in BASE_NUMERIC_FEATURES:
        prepared[column] = pd.to_numeric(prepared[column], errors="coerce")
    prepared = prepared.dropna(subset=BASE_NUMERIC_FEATURES)
    prepared = add_derived_features(prepared)
    return prepared[ALL_FEATURES]
