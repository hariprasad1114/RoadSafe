from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path

import httpx
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
PROJECT = json.loads((ROOT / ".insforge" / "project.json").read_text(encoding="utf-8"))
BASE_URL = PROJECT["oss_host"].rstrip("/")
API_KEY = PROJECT["api_key"]
AUTH_HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

DEMO_USERS = [
    {
        "email": "admin@roadsafe.app",
        "password": "RoadSafeDemo2026!",
        "name": "Avery Admin",
        "role": "admin",
        "organisation": "RoadSafe AI Demo",
    },
    {
        "email": "analyst@roadsafe.app",
        "password": "RoadSafeDemo2026!",
        "name": "Sam Analyst",
        "role": "analyst",
        "organisation": "RoadSafe AI Demo",
    },
]

CITIES = [
    ("London", 51.5074, -0.1278),
    ("Birmingham", 52.4862, -1.8904),
    ("Manchester", 53.4808, -2.2426),
    ("Leeds", 53.8008, -1.5491),
    ("Liverpool", 53.4084, -2.9916),
    ("Sheffield", 53.3811, -1.4701),
    ("Bristol", 51.4545, -2.5879),
    ("Cardiff", 51.4816, -3.1791),
    ("Newcastle", 54.9783, -1.6178),
    ("Nottingham", 52.9548, -1.1581),
    ("Leicester", 52.6369, -1.1398),
    ("Glasgow", 55.8642, -4.2518),
    ("Edinburgh", 55.9533, -3.1883),
    ("Southampton", 50.9097, -1.4044),
    ("Norwich", 52.6309, 1.2974),
    ("Plymouth", 50.3755, -4.1427),
    ("Swansea", 51.6214, -3.9436),
    ("Aberdeen", 57.1497, -2.0943),
    ("Inverness", 57.4778, -4.2247),
    ("Dundee", 56.4620, -2.9707),
    ("Middlesbrough", 54.5742, -1.2350),
    ("Preston", 53.7632, -2.7031),
    ("Blackpool", 53.8175, -3.0357),
    ("Coventry", 52.4068, -1.5197),
    ("Reading", 51.4543, -0.9781),
    ("Oxford", 51.7520, -1.2577),
    ("Cambridge", 52.2053, 0.1218),
    ("Brighton", 50.8225, -0.1372),
    ("Bournemouth", 50.7192, -1.8808),
    ("Exeter", 50.7184, -3.5339),
    ("York", 53.9590, -1.0815),
    ("Hull", 53.7676, -0.3274),
    ("Stoke-on-Trent", 53.0027, -2.1794),
    ("Derby", 52.9225, -1.4742),
    ("Wolverhampton", 52.5870, -2.1288),
    ("Lincoln", 53.2307, -0.5406),
    ("Luton", 51.8787, -0.4200),
    ("Milton Keynes", 52.0406, -0.7594),
    ("Ipswich", 52.0567, 1.1482),
    ("Peterborough", 52.5695, -0.2405),
    ("Swindon", 51.5558, -1.7797),
    ("Gloucester", 51.8642, -2.2382),
    ("Worcester", 52.1936, -2.2216),
    ("Shrewsbury", 52.7073, -2.7553),
    ("Chester", 53.1934, -2.8931),
    ("Warrington", 53.3900, -2.5970),
    ("Huddersfield", 53.6458, -1.7850),
    ("Bradford", 53.7960, -1.7594),
    ("Doncaster", 53.5228, -1.1285),
    ("Chesterfield", 53.2350, -1.4215),
    ("Bath", 51.3811, -2.3590),
    ("Taunton", 51.0159, -3.1065),
    ("Truro", 50.2632, -5.0510),
    ("Salisbury", 51.0688, -1.7945),
    ("Winchester", 51.0598, -1.3080),
    ("Portsmouth", 50.8198, -1.0880),
    ("Canterbury", 51.2802, 1.0789),
    ("Colchester", 51.8892, 0.9042),
    ("Chelmsford", 51.7356, 0.4685),
    ("Lancaster", 54.0466, -2.8007),
    ("Carlisle", 54.8925, -2.9329),
    ("Durham", 54.7753, -1.5849),
    ("Newport", 51.5842, -2.9977),
    ("Wrexham", 53.0430, -2.9676),
    ("Stirling", 56.1165, -3.9369),
    ("Perth", 56.3950, -3.4308),
    ("Fort William", 56.8198, -5.1052),
]

RECOMMENDATIONS = [
    {
        "slug": "urban-junction-safety-audits",
        "title": "Audit high-volume urban junctions",
        "category": "engineering",
        "priority": "critical",
        "summary": "Prioritise signal timing, turning-lane design and visibility checks at the busiest urban junctions.",
        "detail": "Urban roads account for 57,883 collisions in the 2022 dataset, and intersection collisions have a lower fatal rate but very high volume. A junction audit programme should rank sites by collision frequency, vulnerable-road-user involvement and severe-outcome trend, then deliver low-cost engineering changes first: refreshed markings, better stop-line visibility, protected turning phases and tighter corner radii for pedestrian crossing distances.",
        "evidence": "57,883 urban-road collisions; 6,284 intersection collisions; 16,938 two-wheeler collisions in 2022.",
        "impact_estimate": "High volume reduction potential; target the top 10% of junctions by collision count.",
        "road_type": "Urban Road",
        "weather": None,
        "sort_order": 10,
    },
    {
        "slug": "rural-high-speed-segregation",
        "title": "Separate high-speed rural traffic from vulnerable users",
        "category": "engineering",
        "priority": "critical",
        "summary": "Target rural roads with 50+ mph limits for edge protection, crossing improvements and safer overtaking layouts.",
        "detail": "Rural roads have the highest fatal share in the dataset despite lower collision volume. Interventions should focus on the rural network where speed limits are 50 mph or above: improve sight lines at bends, provide protected crossing points, review edge protection and consider average-speed or speed-limit changes where casualty history is persistent.",
        "evidence": "Rural-road fatal rate 2.22% and highway fatal rate 2.95%, versus 0.76% on urban roads; 23,056 collisions on 50+ mph roads.",
        "impact_estimate": "Highest fatal-severity leverage; a small number of corridor treatments can cover many severe collisions.",
        "road_type": "Rural Road",
        "weather": None,
        "sort_order": 20,
    },
    {
        "slug": "two-wheeler-junction-protection",
        "title": "Protect two-wheeler riders at junctions",
        "category": "engineering",
        "priority": "high",
        "summary": "Use motorcycle-aware junction design, conspicuity treatments and targeted rider safety campaigns.",
        "detail": "Two-wheeler collisions have a 29.9% serious-or-fatal rate, above the 21.9% rate for cars. Junction redesign should account for rider visibility and approach speed, with advanced stop lines, dedicated approach lanes where space allows, and conspicuity messaging aimed at both riders and drivers.",
        "evidence": "16,938 two-wheeler collisions; 29.9% serious-or-fatal rate versus 21.9% for cars.",
        "impact_estimate": "Medium-high; targeted at the most severe vulnerable-road-user segment.",
        "road_type": "Urban Road",
        "weather": None,
        "sort_order": 30,
    },
    {
        "slug": "night-time-lighting-review",
        "title": "Review lighting on night-time collision corridors",
        "category": "engineering",
        "priority": "high",
        "summary": "Identify unlit and poorly lit stretches with repeated night-time collisions and upgrade lighting where justified.",
        "detail": "14,233 collisions occurred at night and 8,031 occurred in poor or absent lighting. A lighting review should combine collision clustering with existing lighting inventory, prioritising rural bends, urban crossing points and bus stops where pedestrians share the carriageway.",
        "evidence": "14,233 night-time collisions; 8,031 in poor or no lighting.",
        "impact_estimate": "Medium; strongest where night-time collisions cluster around crossings and rural bends.",
        "road_type": None,
        "weather": None,
        "sort_order": 40,
    },
    {
        "slug": "wet-weather-skid-resistance",
        "title": "Improve wet-weather skid resistance",
        "category": "engineering",
        "priority": "high",
        "summary": "Combine skid-resistance testing with drainage and surface-dressing programmes on wet-weather collision routes.",
        "detail": "23,363 collisions occurred on wet roads and 1,957 on snowy or icy roads. Maintenance programmes should use collision data to prioritise resurfacing, drainage clearing and high-friction surfacing at approaches to junctions, bends and pedestrian crossings.",
        "evidence": "23,363 wet-road collisions; 1,957 snowy or icy-road collisions.",
        "impact_estimate": "Medium; maintenance-led and suitable for seasonal delivery.",
        "road_type": None,
        "weather": "Rainy",
        "sort_order": 50,
    },
    {
        "slug": "high-speed-corridor-enforcement",
        "title": "Target speed enforcement on high-speed corridors",
        "category": "enforcement",
        "priority": "high",
        "summary": "Deploy average-speed and targeted enforcement where 50+ mph roads combine speed-related collisions and severe outcomes.",
        "detail": "High-speed roads carry a disproportionate fatal burden: highways have a 2.95% fatal rate. Enforcement should be intelligence-led, using collision clusters, speed surveys and community concerns, with average-speed cameras considered where there is a sustained corridor problem rather than isolated incidents.",
        "evidence": "23,056 collisions on 50+ mph roads; highway fatal rate 2.95%; rural fatal rate 2.22%.",
        "impact_estimate": "High fatal-severity leverage on the strategic and rural network.",
        "road_type": "Highway",
        "weather": None,
        "sort_order": 60,
    },
    {
        "slug": "weekend-evening-patrols",
        "title": "Align patrols with weekend and evening peaks",
        "category": "enforcement",
        "priority": "medium",
        "summary": "Schedule visible patrols where Friday, weekend and evening collision volumes are highest.",
        "detail": "Friday is the busiest day in the dataset and the evening period carries 26,712 collisions. Patrol plans should be matched to local hotspot timing rather than a uniform weekly pattern, with briefings informed by the latest hotspot model.",
        "evidence": "17,909 Friday collisions; 26,712 evening collisions; 14,233 night collisions.",
        "impact_estimate": "Medium; low capital cost and quick to deploy.",
        "road_type": None,
        "weather": None,
        "sort_order": 70,
    },
    {
        "slug": "rider-conspicuity-education",
        "title": "Run rider conspicuity and junction-awareness campaigns",
        "category": "education",
        "priority": "medium",
        "summary": "Pair engineering work with campaigns on rider visibility and driver awareness at junctions.",
        "detail": "Two-wheeler collisions are over-represented in severe outcomes. Education should be delivered alongside engineering improvements, focusing on junction approach behaviour, protective clothing and conspicuity, and should be evaluated with before-and-after collision data.",
        "evidence": "16,938 two-wheeler collisions; 29.9% serious-or-fatal rate.",
        "impact_estimate": "Medium when paired with junction engineering; measure with matched comparison areas.",
        "road_type": "Urban Road",
        "weather": None,
        "sort_order": 80,
    },
    {
        "slug": "rural-emergency-response",
        "title": "Review emergency response coverage on rural corridors",
        "category": "emergency",
        "priority": "medium",
        "summary": "Map post-collision response times against rural severe-collision clusters and adjust cover where gaps appear.",
        "detail": "Fatal and serious collisions are concentrated on rural and high-speed roads where distances to trauma care are longer. Response planning should combine hotspot locations, ambulance station coverage and hospital access routes, and review whether co-response or enhanced care can reduce time to definitive treatment.",
        "evidence": "Rural fatal rate 2.22% and highway fatal rate 2.95%; 1,602 fatal collisions overall.",
        "impact_estimate": "Medium; outcome-focused and best delivered with health partners.",
        "road_type": "Rural Road",
        "weather": None,
        "sort_order": 90,
    },
    {
        "slug": "data-quality-and-evaluation",
        "title": "Strengthen collision data quality and evaluation",
        "category": "data",
        "priority": "low",
        "summary": "Track data completeness and evaluate every intervention with before-and-after collision and severity measures.",
        "detail": "The model is limited by the variables available in the published collision and vehicle tables. Teams should record contributory factors consistently, retain location quality flags and evaluate interventions against matched comparison sites. Re-train and review the severity model when new annual data is loaded.",
        "evidence": "Model performance is reported transparently; fatal collisions are rare (1,602 of 105,982 records) and partly depend on unobserved factors.",
        "impact_estimate": "Foundational; improves every downstream analysis and investment decision.",
        "road_type": None,
        "weather": None,
        "sort_order": 100,
    },
]


def check(response: httpx.Response, label: str) -> None:
    if response.is_success:
        return
    raise RuntimeError(f"{label} failed ({response.status_code}): {response.text[:800]}")


def post_with_retry(url: str, *, attempts: int = 6, **kwargs) -> httpx.Response:
    last: httpx.Response | None = None
    for attempt in range(attempts):
        try:
            last = httpx.post(url, **kwargs)
        except httpx.TransportError:
            if attempt == attempts - 1:
                raise
            time.sleep(min(2**attempt, 30))
            continue
        if last.status_code in (429, 500, 502, 503, 504) and attempt < attempts - 1:
            print(f"  retrying after HTTP {last.status_code} ({attempt + 1}/{attempts})", flush=True)
            time.sleep(min(2**attempt, 30))
            continue
        return last
    assert last is not None
    return last


def count_rows(table: str) -> int | None:
    response = httpx.get(
        f"{BASE_URL}/api/database/records/{table}",
        params={"select": "*", "limit": 1},
        headers={**AUTH_HEADERS, "Prefer": "count=exact"},
        timeout=60,
    )
    if not response.is_success:
        return None
    total = response.headers.get("X-Total-Count")
    if total is not None:
        return int(total)
    content_range = response.headers.get("Content-Range", "")
    if "/" in content_range:
        tail = content_range.rsplit("/", 1)[-1]
        if tail.isdigit():
            return int(tail)
    return None


def seed_accidents(csv_path: Path) -> None:
    print(f"Uploading accident records from {csv_path.name} ...")
    frame = pd.read_csv(csv_path, low_memory=False)
    frame = frame.where(pd.notna(frame), None)
    records = frame.to_dict(orient="records")
    chunk_size = 500

    total = count_rows("accident_records")
    if total is not None and total >= len(records):
        print(f"accident_records already has {total:,} rows; skipping.")
        return

    for start in range(0, len(records), chunk_size):
        chunk = records[start : start + chunk_size]
        response = post_with_retry(
            f"{BASE_URL}/api/database/records/accident_records",
            headers={**AUTH_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=chunk,
            timeout=180,
        )
        check(response, f"accident_records insert rows {start}-{start + len(chunk)}")
        if start % 5000 == 0:
            print(f"  inserted {min(start + chunk_size, len(records)):,}/{len(records):,}", flush=True)
    print(f"Accident rows now: {count_rows('accident_records')}")


def nearest_city(latitude: float, longitude: float) -> str:
    best = min(
        CITIES,
        key=lambda city: (
            (latitude - city[1]) ** 2
            + ((longitude - city[2]) * math.cos(math.radians(latitude))) ** 2
        ),
    )
    return best[0]


def assign_top_road_types(accidents: pd.DataFrame, clusters: list[dict]) -> dict[int, str]:
    if not clusters:
        return {}
    centroids = np.array([[item["latitude"], item["longitude"]] for item in clusters])
    points = accidents[["latitude", "longitude"]].to_numpy()
    distances = ((points[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
    assignments = distances.argmin(axis=1)
    roads = accidents["road_type"].to_numpy()
    result: dict[int, str] = {}
    for index, item in enumerate(clusters):
        mask = assignments == index
        if not mask.any():
            continue
        values, counts = np.unique(roads[mask], return_counts=True)
        result[item["cluster_id"]] = str(values[counts.argmax()])
    return result


def build_hotspot_records() -> list[dict]:
    payload = json.loads((BACKEND / "models" / "hotspots_default.json").read_text(encoding="utf-8"))
    accidents = pd.read_csv(BACKEND / "data" / "accidents_uk_2022.csv", usecols=["latitude", "longitude", "road_type"])
    records: list[dict] = []
    for algorithm, radius in (("kmeans", 20.0), ("dbscan", 2.0)):
        clusters = payload.get(algorithm, [])
        top_roads = assign_top_road_types(accidents, clusters)
        for item in clusters:
            total = int(item["accident_count"])
            severe = int(item["fatal_count"]) + int(item["serious_count"])
            severe_rate = round(severe / total, 4) if total else 0
            records.append(
                {
                    "cluster_id": int(item["cluster_id"]),
                    "algorithm": algorithm,
                    "label": f"{nearest_city(float(item['latitude']), float(item['longitude']))} area",
                    "latitude": float(item["latitude"]),
                    "longitude": float(item["longitude"]),
                    "accident_count": total,
                    "fatal_count": int(item["fatal_count"]),
                    "serious_count": int(item["serious_count"]),
                    "minor_count": int(item["minor_count"]),
                    "severity_rate": severe_rate,
                    "radius_km": radius,
                    "top_road_type": top_roads.get(int(item["cluster_id"])),
                    "top_weather": item.get("most_common_weather"),
                    "risk_score": round(severe_rate * 100, 2),
                }
            )
    return records


def seed_hotspots() -> None:
    records = build_hotspot_records()
    response = httpx.delete(
        f"{BASE_URL}/api/database/records/hotspots",
        params={"algorithm": "in.(kmeans,dbscan)"},
        headers=AUTH_HEADERS,
        timeout=60,
    )
    check(response, "hotspots delete")
    response = httpx.post(
        f"{BASE_URL}/api/database/records/hotspots",
        headers={**AUTH_HEADERS, "Prefer": "return=minimal"},
        json=records,
        timeout=120,
    )
    check(response, "hotspots insert")
    print(f"Seeded {len(records)} hotspot rows.")


def seed_recommendations() -> None:
    response = httpx.delete(
        f"{BASE_URL}/api/database/records/recommendations",
        params={"slug": "not.is.null"},
        headers=AUTH_HEADERS,
        timeout=60,
    )
    check(response, "recommendations delete")
    response = httpx.post(
        f"{BASE_URL}/api/database/records/recommendations",
        headers={**AUTH_HEADERS, "Prefer": "return=minimal"},
        json=RECOMMENDATIONS,
        timeout=120,
    )
    check(response, "recommendations insert")
    print(f"Seeded {len(RECOMMENDATIONS)} recommendations.")


def seed_model_metadata() -> None:
    metrics = json.loads((BACKEND / "models" / "severity_metrics.json").read_text(encoding="utf-8"))
    metadata = json.loads((BACKEND / "models" / "severity_metadata.json").read_text(encoding="utf-8"))
    payload = [
        {
            "model_key": "severity",
            "model_name": metrics["model_name"],
            "model_version": metrics["model_version"],
            "trained_at": metrics["trained_at"],
            "dataset_rows": metrics["dataset_rows"],
            "metrics": metrics,
            "metadata": metadata,
            "is_active": True,
        }
    ]
    response = httpx.post(
        f"{BASE_URL}/api/database/records/model_metadata",
        headers={**AUTH_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload,
        timeout=120,
    )
    check(response, "model_metadata upsert")
    print("Seeded severity model metadata.")


def ensure_user(user: dict) -> str:
    response = httpx.post(
        f"{BASE_URL}/api/auth/users?client_type=server",
        headers=AUTH_HEADERS,
        json={"email": user["email"], "password": user["password"], "name": user["name"]},
        timeout=60,
    )
    if response.status_code == 409:
        response = httpx.post(
            f"{BASE_URL}/api/auth/sessions?client_type=server",
            headers=AUTH_HEADERS,
            json={"method": "password", "email": user["email"], "password": user["password"]},
            timeout=60,
        )
        check(response, f"sign in {user['email']}")
        user_id = response.json()["user"]["id"]
    else:
        check(response, f"register {user['email']}")
        user_id = response.json()["user"]["id"]

    profile = {
        "email": user["email"],
        "full_name": user["name"],
        "role": user["role"],
        "organisation": user["organisation"],
    }
    patch = httpx.patch(
        f"{BASE_URL}/api/database/records/profiles",
        params={"id": f"eq.{user_id}"},
        headers=AUTH_HEADERS,
        json=profile,
        timeout=60,
    )
    check(patch, f"profile update {user['email']}")
    return user_id


def seed_users() -> None:
    for user in DEMO_USERS:
        user_id = ensure_user(user)
        print(f"Ready: {user['email']} ({user['role']}, {user_id})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the RoadSafe AI InsForge project")
    parser.add_argument("--accidents", action="store_true", help="upload accident_records")
    parser.add_argument("--hotspots", action="store_true", help="seed hotspot clusters")
    parser.add_argument("--recommendations", action="store_true", help="seed recommendations")
    parser.add_argument("--model-metadata", action="store_true", help="seed model metadata")
    parser.add_argument("--users", action="store_true", help="create demo users")
    parser.add_argument("--all", action="store_true", help="seed everything")
    args = parser.parse_args()

    if not any([args.accidents, args.hotspots, args.recommendations, args.model_metadata, args.users, args.all]):
        parser.print_help()
        return

    if args.all or args.accidents:
        seed_accidents(BACKEND / "data" / "accidents_uk_2022.csv")
    if args.all or args.hotspots:
        seed_hotspots()
    if args.all or args.recommendations:
        seed_recommendations()
    if args.all or args.model_metadata:
        seed_model_metadata()
    if args.all or args.users:
        seed_users()

    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Seeding failed: {exc}", file=sys.stderr)
        raise
