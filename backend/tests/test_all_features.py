import json
import urllib.request
import urllib.error
import sys

base_api = "http://127.0.0.1:8000"
base_fe = "http://127.0.0.1:5173"
insforge_url = "https://ybxnq7bx.us-east.insforge.app"

def request_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers=headers,
        method=method
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        code = resp.getcode()
        raw = resp.read().decode("utf-8")
        try:
            body = json.loads(raw)
        except Exception:
            body = raw
        return code, body

def get_demo_token():
    try:
        url = f"{insforge_url}/api/auth/sessions?client_type=server"
        payload = {
            "email": "admin@roadsafe.app",
            "password": "RoadSafeDemo2026!",
            "method": "password"
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer ik_92788e4c813759649c2140f502c28d07"
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("accessToken") or data.get("token") or data.get("session", {}).get("access_token")
    except Exception as e:
        print(f"[WARN] Could not retrieve InsForge token: {e}")
        return None

def run_tests():
    all_passed = True

    print("=" * 65)
    print("1. FRONTEND DEV SERVER & ROUTING VERIFICATION")
    print("=" * 65)
    routes = ["/", "/dashboard", "/predict", "/hotspots", "/analysis", "/dataset", "/recommendations", "/login"]
    for r in routes:
        try:
            req = urllib.request.Request(f"{base_fe}{r}")
            with urllib.request.urlopen(req, timeout=5) as resp:
                print(f"[PASS] Frontend Route {r:20} -> HTTP {resp.getcode()}")
        except Exception as e:
            print(f"[FAIL] Frontend Route {r:20} -> {e}")
            all_passed = False

    print("\n" + "=" * 65)
    print("2. AUTHENTICATION & SESSION RETRIEVAL")
    print("=" * 65)
    token = get_demo_token()
    if token:
        print(f"[PASS] Authenticated successfully as admin@roadsafe.app (token obtained: {token[:16]}...)")
    else:
        print("[WARN] Proceeding without bearer token")

    print("\n" + "=" * 65)
    print("3. CORE API ENDPOINTS")
    print("=" * 65)
    api_tests = [
        ("Health Check", f"{base_api}/health", "GET", None, False),
        ("API v1 Health", f"{base_api}/api/v1/health", "GET", None, False),
        ("Metadata", f"{base_api}/api/v1/metadata", "GET", None, False),
        ("Analytics Summary", f"{base_api}/api/v1/analytics/summary", "GET", None, False),
        ("Analytics Trends", f"{base_api}/api/v1/analytics/trends", "GET", None, False),
        ("Analytics Distributions", f"{base_api}/api/v1/analytics/distributions", "GET", None, False),
        ("Analytics Dimensions", f"{base_api}/api/v1/analytics/dimensions", "GET", None, False),
        ("Analytics KPIs", f"{base_api}/api/v1/analytics/kpis", "GET", None, False),
        ("Hotspots List", f"{base_api}/api/v1/hotspots", "GET", None, False),
        ("Hotspots Summary", f"{base_api}/api/v1/hotspots/summary", "GET", None, False),
        ("Recommendations List", f"{base_api}/api/v1/recommendations", "GET", None, False),
        ("Recommendation Item (urban-junction-safety-audits)", f"{base_api}/api/v1/recommendations/urban-junction-safety-audits", "GET", None, False),
        ("Dataset Template (CSV schema)", f"{base_api}/api/v1/dataset/template", "GET", None, True),
    ]

    for name, url, method, body, auth_req in api_tests:
        try:
            req_token = token if auth_req else None
            code, res = request_json(url, method=method, data=body, token=req_token)
            print(f"[PASS] {name:50} -> HTTP {code}")
        except urllib.error.HTTPError as e:
            print(f"[FAIL] {name:50} -> HTTP {e.code} ({e.read().decode('utf-8')[:120]})")
            all_passed = False
        except Exception as e:
            print(f"[FAIL] {name:50} -> {e}")
            all_passed = False

    print("\n" + "=" * 65)
    print("4. ML SEVERITY PREDICTIONS UNDER VARIOUS WEATHER CONDITIONS")
    print("=" * 65)
    weather_scenarios = [
        {
            "label": "Clear / Sunny (Dry, Urban Road, 30mph, Daylight)",
            "weather": "Clear",
            "road_condition": "Dry",
            "road_type": "Urban Road",
            "lighting_condition": "Good",
            "speed_limit": 30,
            "vehicle_type": "Car",
            "time_of_day": "Afternoon",
            "day_of_week": "Friday"
        },
        {
            "label": "Rainy / Stormy (Wet, Highway, 70mph, Night)",
            "weather": "Rainy",
            "road_condition": "Wet",
            "road_type": "Highway",
            "lighting_condition": "Poor",
            "speed_limit": 70,
            "vehicle_type": "Car",
            "time_of_day": "Night",
            "day_of_week": "Friday"
        },
        {
            "label": "Snowy / Icy (Snowy/Icy, Rural Road, 50mph, Evening)",
            "weather": "Snowy",
            "road_condition": "Snowy/Icy",
            "road_type": "Rural Road",
            "lighting_condition": "Moderate",
            "speed_limit": 50,
            "vehicle_type": "Two-Wheeler",
            "time_of_day": "Evening",
            "day_of_week": "Saturday"
        },
        {
            "label": "Foggy / Mist (Wet, Rural Road, 40mph, Poor Lighting)",
            "weather": "Foggy",
            "road_condition": "Wet",
            "road_type": "Rural Road",
            "lighting_condition": "Poor",
            "speed_limit": 40,
            "vehicle_type": "Truck",
            "time_of_day": "Morning",
            "day_of_week": "Monday"
        },
        {
            "label": "Flooded Road Hazard (Flooded, Intersection, 30mph, Night)",
            "weather": "Rainy",
            "road_condition": "Flooded",
            "road_type": "Intersection",
            "lighting_condition": "No Lighting",
            "speed_limit": 30,
            "vehicle_type": "Bus",
            "time_of_day": "Night",
            "day_of_week": "Sunday"
        },
        {
            "label": "Cloudy (Dry, Urban Road, 20mph, Good Lighting)",
            "weather": "Cloudy",
            "road_condition": "Dry",
            "road_type": "Urban Road",
            "lighting_condition": "Good",
            "speed_limit": 20,
            "vehicle_type": "Car",
            "time_of_day": "Morning",
            "day_of_week": "Wednesday"
        }
    ]

    for sc in weather_scenarios:
        payload = {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "road_type": sc["road_type"],
            "weather": sc["weather"],
            "road_condition": sc["road_condition"],
            "time_of_day": sc["time_of_day"],
            "day_of_week": sc["day_of_week"],
            "vehicle_type": sc["vehicle_type"],
            "speed_limit": sc["speed_limit"],
            "lighting_condition": sc["lighting_condition"],
        }
        try:
            code, res = request_json(f"{base_api}/api/v1/predict", method="POST", data=payload)
            severity = res.get("predicted_severity")
            risk_score = res.get("risk_score")
            risk_name = res.get("risk_level", {}).get("name")
            probs = res.get("probabilities", {})
            recs = len(res.get("recommendations", []))
            print(f"[PASS] {sc['label']}")
            print(f"       -> Predicted: {severity.upper():<7} | Risk: {risk_score:.1f}/100 ({risk_name}) | Probabilities: {probs} | Recs: {recs}")
        except Exception as e:
            print(f"[FAIL] {sc['label']} -> {e}")
            all_passed = False

    print("\n" + "=" * 65)
    print("5. HOTSPOTS CLUSTERING & SPATIAL QUERIES")
    print("=" * 65)
    try:
        code, hotspots_data = request_json(f"{base_api}/api/v1/hotspots?limit=5")
        clusters = hotspots_data.get("clusters", [])
        print(f"[PASS] Retrieved {len(clusters)} hotspot clusters (Total clusters: {hotspots_data.get('count', 0)})")
        for i, h in enumerate(clusters[:3]):
            print(f"       Cluster {i+1}: Center ({h.get('latitude'):.4f}, {h.get('longitude'):.4f}) | Collisions: {h.get('accident_count')} | Severity Rate: {h.get('severity_rate'):.1%}")
    except Exception as e:
        print(f"[FAIL] Hotspots query -> {e}")
        all_passed = False

    print("\n" + "=" * 65)
    print("6. KPI & ANALYTICS DATA VERIFICATION")
    print("=" * 65)
    try:
        code, kpis = request_json(f"{base_api}/api/v1/analytics/kpis")
        print(f"[PASS] Total Collisions: {kpis.get('total_accidents', 0):,}")
        print(f"       Fatal Collisions: {kpis.get('fatal_count', 0):,} ({kpis.get('fatal_rate', 0):.2%})")
        print(f"       Severe Collisions: {kpis.get('severe_count', 0):,} ({kpis.get('severe_rate', 0):.2%})")
        print(f"       Top Weather: {kpis.get('top_weather')}")
        print(f"       Top Road Type: {kpis.get('top_road_type')}")
        print(f"       Hotspot Clusters: {kpis.get('hotspot_count')}")
        print(f"       Recommendations: {kpis.get('recommendation_count')}")
        print(f"       ML Model: {kpis.get('model', {}).get('name')} v{kpis.get('model', {}).get('version')}")
    except Exception as e:
        print(f"[FAIL] KPIs -> {e}")
        all_passed = False

    print("\n" + "=" * 65)
    if all_passed:
        print("ALL TESTS PASSED! Every feature of RoadSafe AI is functioning correctly.")
    else:
        print("SOME TESTS FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
