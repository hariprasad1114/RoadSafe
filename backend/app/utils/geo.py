from __future__ import annotations

import math

import numpy as np

EARTH_RADIUS_KM = 6371.0088

CITIES = [
    ("Puttur (Andhra Pradesh)", 13.4428, 79.5544),
    ("Chittoor (Andhra Pradesh)", 13.2172, 79.1003),
    ("Tirupati (Andhra Pradesh)", 13.6288, 79.4192),
    ("Nagari (Andhra Pradesh)", 13.3300, 79.5850),
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


def haversine_km(lat1: np.ndarray | float, lon1: np.ndarray | float, lat2: np.ndarray | float, lon2: np.ndarray | float) -> np.ndarray:
    lat1 = np.radians(np.asarray(lat1, dtype=float))
    lon1 = np.radians(np.asarray(lon1, dtype=float))
    lat2 = np.radians(np.asarray(lat2, dtype=float))
    lon2 = np.radians(np.asarray(lon2, dtype=float))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    return EARTH_RADIUS_KM * 2.0 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def nearest_city(latitude: float, longitude: float) -> str:
    distances = haversine_km(
        latitude,
        longitude,
        np.array([city[1] for city in CITIES]),
        np.array([city[2] for city in CITIES]),
    )
    return CITIES[int(np.argmin(distances))][0]


def project_to_km(latitude: np.ndarray, longitude: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    mean_latitude = float(np.mean(latitude))
    x = longitude * 111.32 * math.cos(math.radians(mean_latitude))
    y = latitude * 110.57
    return x, y


def unproject_from_km(x: float, y: float, mean_latitude: float) -> tuple[float, float]:
    longitude = x / (111.32 * math.cos(math.radians(mean_latitude)))
    latitude = y / 110.57
    return latitude, longitude
