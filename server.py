import os
import re
import json
import random
import hashlib
import datetime
import warnings
from urllib.parse import urlencode

import joblib
import pandas as pd
import requests
from flask import Flask, request, jsonify, send_from_directory

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from india_config import (
    CATEGORIES,
    CATEGORY_ALIASES,
    CATEGORY_KEYWORDS,
    CRITICAL_KEYWORDS,
    DEFAULT_ADDRESS,
    DEFAULT_CITY,
    DEFAULT_COUNTRY,
    DEFAULT_LAT,
    DEFAULT_LNG,
    DEFAULT_PIN,
    DEFAULT_STATE,
    DEFAULT_ZOOM,
    DEPARTMENT_MAPPING,
    INDIAN_CITIES,
    INDIAN_STREETS,
    AREA_IMPORTANCE_KEYWORDS,
    URGENCY_KEYWORDS,
)

warnings.filterwarnings("ignore")

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
CSV_PATH = os.path.join(DATA_DIR, "municipal_training_set_1100.csv")
ACTIVE_JSON_PATH = os.path.join(DATA_DIR, "active_reports.json")
USA_BACKUP_PATH = os.path.join(DATA_DIR, "active_reports_usa_backup.json")
MODEL_PATH = os.path.join(MODELS_DIR, "category_model.joblib")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")

GOOGLE_MAPS_API_KEY = (os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("MAPS_API_KEY") or "").strip()
MAP_PROVIDER = (os.environ.get("MAP_PROVIDER") or ("google" if GOOGLE_MAPS_API_KEY else "nominatim")).lower()
NOMINATIM_UA = "CityFix-India/1.0 (civic-issue-dispatcher)"

MAP_LAT = float(os.environ.get("DEFAULT_LAT", DEFAULT_LAT))
MAP_LNG = float(os.environ.get("DEFAULT_LNG", DEFAULT_LNG))
MAP_ZOOM = int(os.environ.get("DEFAULT_ZOOM", DEFAULT_ZOOM))
MAP_CITY = os.environ.get("DEFAULT_CITY", DEFAULT_CITY)

category_model = None
model_metrics = {}

try:
    if os.path.exists(MODEL_PATH):
        category_model = joblib.load(MODEL_PATH)
        print(f"Loaded ML model from {MODEL_PATH}")
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")

if os.path.exists(METRICS_PATH):
    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            model_metrics = json.load(f)
    except Exception:
        model_metrics = {}


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9\u0900-\u097f ]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_category(label):
    if not label:
        return "other"
    label = str(label).strip().lower().replace(" ", "_")
    return CATEGORY_ALIASES.get(label, label)


def keyword_category_scores(cleaned):
    scores = {}
    for cat, words in CATEGORY_KEYWORDS.items():
        hit = 0
        for w in words:
            if w in cleaned:
                hit += 1
        if hit:
            scores[cat] = hit
    return scores


def calculate_priority(cleaned, confidence=0.0):
    urgency_hits = sum(1 for w in URGENCY_KEYWORDS if w in cleaned)
    critical_hits = sum(1 for w in CRITICAL_KEYWORDS if w in cleaned)
    area_hits = sum(1 for w in AREA_IMPORTANCE_KEYWORDS if w in cleaned)

    severity = 4
    if critical_hits:
        suggested = "critical"
        severity = min(10, 8 + critical_hits + area_hits)
    elif urgency_hits >= 2 or (urgency_hits and area_hits):
        suggested = "high"
        severity = min(9, 6 + urgency_hits + area_hits)
    elif urgency_hits == 1:
        suggested = "high" if area_hits else "medium"
        severity = 7 if area_hits else 6
    else:
        suggested = "medium" if confidence < 0.75 else "low"
        severity = 5 if suggested == "medium" else 3

    area_importance = min(10, 5 + area_hits * 2)
    priority_scores = {"low": 3.2, "medium": 5.8, "high": 7.9, "critical": 9.4}
    return {
        "suggested_priority": suggested,
        "suggested_severity": severity,
        "area_importance": area_importance,
        "priority_score": min(10.0, priority_scores[suggested] + area_hits * 0.2),
        "urgency_hits": urgency_hits,
        "critical_hits": critical_hits,
    }


def predict_issue(text):
    cleaned = clean_text(text)
    kw_scores = keyword_category_scores(cleaned)

    predicted = "other"
    confidence = 0.0
    top_predictions = []
    classes = []
    probabilities = []

    if category_model is not None:
        predicted = normalize_category(category_model.predict([cleaned])[0])
        probabilities = category_model.predict_proba([cleaned])[0]
        classes = list(category_model.classes_)
        top_indices = probabilities.argsort()[::-1][:5]
        top_predictions = [
            {"category": normalize_category(classes[idx]), "confidence": round(float(probabilities[idx]), 3)}
            for idx in top_indices
        ]
        confidence = float(max(probabilities))

    if kw_scores:
        kw_best, kw_hits = max(kw_scores.items(), key=lambda kv: kv[1])
        if kw_hits >= 2 and (confidence < 0.72 or predicted == "other"):
            predicted = kw_best
            confidence = max(confidence, min(0.93, 0.62 + kw_hits * 0.08))
        elif kw_hits >= 1 and confidence < 0.45:
            predicted = kw_best
            confidence = max(confidence, 0.55)

        # Merge keyword hints into top list
        existing = {p["category"] for p in top_predictions}
        for cat, hits in sorted(kw_scores.items(), key=lambda kv: -kv[1]):
            if cat not in existing:
                top_predictions.append({"category": cat, "confidence": round(min(0.9, 0.4 + hits * 0.1), 3)})
        top_predictions = sorted(top_predictions, key=lambda p: p["confidence"], reverse=True)[:5]

    if not top_predictions:
        top_predictions = [{"category": predicted, "confidence": round(confidence, 3)}]

    dept = DEPARTMENT_MAPPING.get(predicted, DEPARTMENT_MAPPING["other"])
    prio = calculate_priority(cleaned, confidence)
    return {
        "category": predicted,
        "confidence": round(confidence, 3),
        "department": dept,
        "top_predictions": top_predictions,
        **prio,
    }


def _jitter(seed, spread=0.035):
    digest = hashlib.md5(str(seed).encode("utf-8")).hexdigest()
    a = int(digest[:8], 16) / 0xFFFFFFFF
    b = int(digest[8:16], 16) / 0xFFFFFFFF
    return (a - 0.5) * spread, (b - 0.5) * spread


def remap_report_to_india(report, index):
    city = INDIAN_CITIES[index % len(INDIAN_CITIES)]
    dlat, dlng = _jitter(report.get("report_id") or index)
    street = INDIAN_STREETS[index % len(INDIAN_STREETS)]
    spot = city["spots"][index % len(city["spots"])]
    issue_type = normalize_category(report.get("issue_type"))
    report["issue_type"] = issue_type
    report["latitude"] = round(city["lat"] + dlat, 6)
    report["longitude"] = round(city["lng"] + dlng, 6)
    report["location_street_address"] = f"{street}, {spot}"
    report["location_city"] = city["city"]
    report["location_state"] = city["state"]
    report["location_postal_code"] = city["pin"]
    report["location_country"] = DEFAULT_COUNTRY
    report["municipal_department"] = DEPARTMENT_MAPPING.get(issue_type, DEPARTMENT_MAPPING["other"])
    phone = str(report.get("resident_phone") or "")
    if phone.startswith("+1") or "555" in phone:
        report["resident_phone"] = f"+91 98{10000000 + (index % 80000000)}"
    return report


def looks_us_centric(reports):
    if not reports:
        return False
    sample = reports[: min(40, len(reports))]
    usa = sum(1 for r in sample if str(r.get("location_country", "")).upper() in {"USA", "US", "UNITED STATES"})
    west = sum(1 for r in sample if (r.get("longitude") or 0) < -30)
    return usa >= len(sample) * 0.4 or west >= len(sample) * 0.4


REPORTS = []


def init_data():
    global REPORTS
    if os.path.exists(ACTIVE_JSON_PATH):
        try:
            with open(ACTIVE_JSON_PATH, "r", encoding="utf-8") as f:
                REPORTS = json.load(f)
            print(f"Loaded {len(REPORTS)} active reports from JSON store.")
        except Exception as e:
            print(f"Could not load active JSON store: {e}")
            REPORTS = []

    if not REPORTS and os.path.exists(CSV_PATH):
        try:
            df = pd.read_csv(CSV_PATH)
            df = df.where(pd.notnull(df), None)
            records = df.to_dict(orient="records")
            for r in records:
                if r.get("citizen_reports_count") is None:
                    r["citizen_reports_count"] = 1
                else:
                    r["citizen_reports_count"] = int(r["citizen_reports_count"])
                if r.get("priority_score") is not None:
                    r["priority_score"] = float(r["priority_score"])
                for coord in ("latitude", "longitude"):
                    if r.get(coord) is not None:
                        try:
                            r[coord] = float(r[coord])
                        except Exception:
                            pass
                r["issue_type"] = normalize_category(r.get("issue_type"))
            REPORTS = records
            print(f"Initialized {len(REPORTS)} reports from CSV.")
        except Exception as e:
            print(f"Error loading CSV data: {e}")
            REPORTS = []

    if REPORTS and looks_us_centric(REPORTS):
        if not os.path.exists(USA_BACKUP_PATH):
            try:
                with open(USA_BACKUP_PATH, "w", encoding="utf-8") as f:
                    json.dump(REPORTS, f, ensure_ascii=False)
                print(f"Backed up US-centric reports to {USA_BACKUP_PATH}")
            except Exception as e:
                print(f"Could not write USA backup: {e}")
        REPORTS = [remap_report_to_india(r, i) for i, r in enumerate(REPORTS)]
        save_data()
        print(f"Remapped {len(REPORTS)} reports onto Indian cities for GIS.")
    else:
        for r in REPORTS:
            r["issue_type"] = normalize_category(r.get("issue_type"))


def save_data():
    try:
        with open(ACTIVE_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(REPORTS, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Failed to save data: {e}")


init_data()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS,PATCH"
    return response


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "model_loaded": category_model is not None,
        "total_reports": len(REPORTS),
        "region": "IN",
        "map_provider": "google" if (MAP_PROVIDER == "google" and GOOGLE_MAPS_API_KEY) else "nominatim",
        "maps_key_configured": bool(GOOGLE_MAPS_API_KEY),
        "model_accuracy": model_metrics.get("holdout_accuracy"),
    })


@app.route("/api/config", methods=["GET"])
def get_config():
    provider = "google" if (MAP_PROVIDER == "google" and GOOGLE_MAPS_API_KEY) else "nominatim"
    return jsonify({
        "region": "IN",
        "country": DEFAULT_COUNTRY,
        "default_city": MAP_CITY,
        "default_state": DEFAULT_STATE,
        "default_pin": DEFAULT_PIN,
        "default_address": DEFAULT_ADDRESS,
        "map": {
            "provider": provider,
            "lat": MAP_LAT,
            "lng": MAP_LNG,
            "zoom": MAP_ZOOM,
            "tile_url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "attribution": "&copy; OpenStreetMap contributors",
            "geocoder": provider,
            "key_required": False,
            "key_configured": bool(GOOGLE_MAPS_API_KEY),
        },
        "cities": [
            {"label": c["city"], "city": c["city"], "state": c["state"], "pin": c["pin"], "lat": c["lat"], "lng": c["lng"]}
            for c in INDIAN_CITIES
        ],
        "categories": CATEGORIES,
        "departments": sorted(set(DEPARTMENT_MAPPING.values())),
        "department_mapping": DEPARTMENT_MAPPING,
    })


def geocode_nominatim(query, limit=5):
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": limit,
        "countrycodes": "in",
    }
    url = "https://nominatim.openstreetmap.org/search?" + urlencode(params)
    resp = requests.get(url, headers={"User-Agent": NOMINATIM_UA}, timeout=12)
    resp.raise_for_status()
    out = []
    for item in resp.json():
        addr = item.get("address") or {}
        out.append({
            "display_name": item.get("display_name"),
            "latitude": float(item["lat"]),
            "longitude": float(item["lon"]),
            "street": addr.get("road") or addr.get("neighbourhood") or addr.get("suburb") or "",
            "city": addr.get("city") or addr.get("town") or addr.get("village") or addr.get("state_district") or "",
            "state": addr.get("state") or "",
            "pin": addr.get("postcode") or "",
            "country": addr.get("country") or "India",
        })
    return out


def geocode_google(query, limit=5):
    params = {
        "address": query,
        "components": "country:IN",
        "key": GOOGLE_MAPS_API_KEY,
        "region": "in",
    }
    url = "https://maps.googleapis.com/maps/api/geocode/json?" + urlencode(params)
    resp = requests.get(url, timeout=12)
    resp.raise_for_status()
    payload = resp.json()
    status = payload.get("status")
    if status not in {"OK", "ZERO_RESULTS"}:
        raise RuntimeError(payload.get("error_message") or status or "Google Geocoding failed")
    out = []
    for item in payload.get("results", [])[:limit]:
        loc = item["geometry"]["location"]
        comps = {c["types"][0]: c["long_name"] for c in item.get("address_components", []) if c.get("types")}
        out.append({
            "display_name": item.get("formatted_address"),
            "latitude": float(loc["lat"]),
            "longitude": float(loc["lng"]),
            "street": comps.get("route") or comps.get("sublocality") or "",
            "city": comps.get("locality") or comps.get("administrative_area_level_2") or "",
            "state": comps.get("administrative_area_level_1") or "",
            "pin": comps.get("postal_code") or "",
            "country": comps.get("country") or "India",
        })
    return out


def reverse_nominatim(lat, lng):
    params = {"lat": lat, "lon": lng, "format": "jsonv2", "addressdetails": 1, "zoom": 18}
    url = "https://nominatim.openstreetmap.org/reverse?" + urlencode(params)
    resp = requests.get(url, headers={"User-Agent": NOMINATIM_UA}, timeout=12)
    resp.raise_for_status()
    item = resp.json()
    addr = item.get("address") or {}
    return {
        "display_name": item.get("display_name"),
        "latitude": float(lat),
        "longitude": float(lng),
        "street": addr.get("road") or addr.get("neighbourhood") or addr.get("suburb") or "",
        "city": addr.get("city") or addr.get("town") or addr.get("village") or addr.get("state_district") or "",
        "state": addr.get("state") or "",
        "pin": addr.get("postcode") or "",
        "country": addr.get("country") or "India",
    }


def reverse_google(lat, lng):
    params = {"latlng": f"{lat},{lng}", "key": GOOGLE_MAPS_API_KEY, "result_type": "street_address|route|locality"}
    url = "https://maps.googleapis.com/maps/api/geocode/json?" + urlencode(params)
    resp = requests.get(url, timeout=12)
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("status") not in {"OK", "ZERO_RESULTS"}:
        raise RuntimeError(payload.get("error_message") or payload.get("status"))
    results = payload.get("results") or []
    if not results:
        return {"display_name": "", "latitude": float(lat), "longitude": float(lng), "country": "India"}
    item = results[0]
    comps = {c["types"][0]: c["long_name"] for c in item.get("address_components", []) if c.get("types")}
    return {
        "display_name": item.get("formatted_address"),
        "latitude": float(lat),
        "longitude": float(lng),
        "street": comps.get("route") or comps.get("sublocality") or "",
        "city": comps.get("locality") or "",
        "state": comps.get("administrative_area_level_1") or "",
        "pin": comps.get("postal_code") or "",
        "country": comps.get("country") or "India",
    }


@app.route("/api/geocode", methods=["GET"])
def geocode():
    query = (request.args.get("q") or request.args.get("query") or "").strip()
    if not query:
        return jsonify({"error": "Missing q parameter"}), 400
    try:
        use_google = MAP_PROVIDER == "google" and GOOGLE_MAPS_API_KEY
        results = geocode_google(query) if use_google else geocode_nominatim(query)
        return jsonify({"provider": "google" if use_google else "nominatim", "results": results})
    except Exception as e:
        if MAP_PROVIDER == "google" and GOOGLE_MAPS_API_KEY:
            try:
                results = geocode_nominatim(query)
                return jsonify({"provider": "nominatim", "fallback": True, "results": results})
            except Exception:
                pass
        return jsonify({"error": str(e)}), 502


@app.route("/api/reverse-geocode", methods=["GET"])
def reverse_geocode():
    try:
        lat = float(request.args.get("lat"))
        lng = float(request.args.get("lng") or request.args.get("lon"))
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lng are required"}), 400
    try:
        use_google = MAP_PROVIDER == "google" and GOOGLE_MAPS_API_KEY
        result = reverse_google(lat, lng) if use_google else reverse_nominatim(lat, lng)
        return jsonify({"provider": "google" if use_google else "nominatim", "result": result})
    except Exception as e:
        if MAP_PROVIDER == "google" and GOOGLE_MAPS_API_KEY:
            try:
                result = reverse_nominatim(lat, lng)
                return jsonify({"provider": "nominatim", "fallback": True, "result": result})
            except Exception:
                pass
        return jsonify({"error": str(e)}), 502


@app.route("/api/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json() or {}
    text = (data.get("description") or "").strip()
    if not text:
        return jsonify({"error": "No description provided"}), 400

    try:
        return jsonify(predict_issue(text))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reports", methods=["GET", "POST", "OPTIONS"])
def handle_reports():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    global REPORTS

    if request.method == "POST":
        data = request.get_json() or {}
        desc = (data.get("issue_description") or "").strip()
        if not desc:
            return jsonify({"error": "Issue description is required"}), 400

        prediction = predict_issue(desc)
        issue_type = normalize_category(data.get("issue_type") or prediction["category"])
        dept = data.get("municipal_department") or DEPARTMENT_MAPPING.get(issue_type, DEPARTMENT_MAPPING["other"])

        report_id = f"RPT-{random.randint(100000, 999999)}"
        now_str = datetime.datetime.now().isoformat()
        priority_lvl = data.get("priority_level") or prediction["suggested_priority"]
        priority_scores = {"low": 3.2, "medium": 5.8, "high": 7.9, "critical": 9.4}

        new_report = {
            "report_id": report_id,
            "resident_id": f"RES-{random.randint(1000, 9999)}",
            "resident_name": data.get("resident_name") if not data.get("is_anonymous") else "Anonymous Citizen",
            "resident_email": data.get("resident_email", "") if not data.get("is_anonymous") else "",
            "resident_phone": data.get("resident_phone", "") if not data.get("is_anonymous") else "",
            "issue_type": issue_type,
            "issue_description": desc,
            "issue_status": "submitted",
            "report_datetime": now_str,
            "location_street_address": data.get("location_street_address") or DEFAULT_ADDRESS,
            "location_city": data.get("location_city") or MAP_CITY,
            "location_state": data.get("location_state") or DEFAULT_STATE,
            "location_postal_code": data.get("location_postal_code") or DEFAULT_PIN,
            "location_country": data.get("location_country") or DEFAULT_COUNTRY,
            "latitude": float(data.get("latitude", MAP_LAT)),
            "longitude": float(data.get("longitude", MAP_LNG)),
            "photo_url": data.get("photo_url", ""),
            "municipal_department": dept,
            "resolution_datetime": None,
            "resolution_notes": None,
            "is_anonymous": bool(data.get("is_anonymous", False)),
            "priority_level": priority_lvl,
            "priority_score": float(data.get("priority_score") or priority_scores.get(priority_lvl, 5.0)),
            "severity_score": data.get("severity_score") or prediction["suggested_severity"],
            "area_importance": data.get("area_importance") or prediction["area_importance"],
            "citizen_reports_count": 1,
        }

        REPORTS.insert(0, new_report)
        save_data()
        return jsonify(new_report), 201

    query = request.args.get("search", "").lower().strip()
    status_filter = request.args.get("status", "all")
    dept_filter = request.args.get("department", "all")
    type_filter = request.args.get("issue_type", "all")
    priority_filter = request.args.get("priority", "all")
    sort_by = request.args.get("sort_by", "report_datetime")
    sort_dir = request.args.get("sort_dir", "desc")

    filtered = REPORTS

    if status_filter != "all":
        filtered = [r for r in filtered if (r.get("issue_status") or "").lower() == status_filter.lower()]
    if dept_filter != "all":
        filtered = [r for r in filtered if (r.get("municipal_department") or "").lower() == dept_filter.lower()]
    if type_filter != "all":
        filtered = [r for r in filtered if (r.get("issue_type") or "").lower() == type_filter.lower()]
    if priority_filter != "all":
        filtered = [r for r in filtered if (r.get("priority_level") or "").lower() == priority_filter.lower()]

    if query:
        filtered = [
            r for r in filtered
            if query in str(r.get("report_id", "")).lower()
            or query in str(r.get("issue_description", "")).lower()
            or query in str(r.get("location_street_address", "")).lower()
            or query in str(r.get("location_city", "")).lower()
            or query in str(r.get("resident_name", "")).lower()
            or query in str(r.get("issue_type", "")).lower()
        ]

    reverse = sort_dir == "desc"
    try:
        filtered = sorted(filtered, key=lambda x: x.get(sort_by) or "", reverse=reverse)
    except Exception:
        pass

    limit_param = request.args.get("limit", "20")
    if limit_param == "all":
        return jsonify({"total": len(filtered), "reports": filtered})

    try:
        limit = int(limit_param)
        page = max(1, int(request.args.get("page", "1")))
    except Exception:
        limit = 20
        page = 1

    start_idx = (page - 1) * limit
    paginated = filtered[start_idx:start_idx + limit]
    return jsonify({
        "total": len(filtered),
        "page": page,
        "limit": limit,
        "total_pages": (len(filtered) + limit - 1) // limit,
        "reports": paginated,
    })


@app.route("/api/reports/<report_id>", methods=["GET", "PATCH", "OPTIONS"])
def report_detail(report_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200

    global REPORTS
    report = next((r for r in REPORTS if r.get("report_id") == report_id), None)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    if request.method == "PATCH":
        data = request.get_json() or {}
        if "issue_status" in data:
            new_status = data["issue_status"]
            report["issue_status"] = new_status
            if new_status == "resolved" and not report.get("resolution_datetime"):
                report["resolution_datetime"] = datetime.datetime.now().isoformat()
        if "municipal_department" in data:
            report["municipal_department"] = data["municipal_department"]
        if "resolution_notes" in data:
            report["resolution_notes"] = data["resolution_notes"]
        if "priority_level" in data:
            report["priority_level"] = data["priority_level"]
        save_data()
        return jsonify(report)

    return jsonify(report)


@app.route("/api/reports/<report_id>/upvote", methods=["POST", "OPTIONS"])
def upvote_report(report_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200

    global REPORTS
    report = next((r for r in REPORTS if r.get("report_id") == report_id), None)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    curr_count = report.get("citizen_reports_count") or 1
    report["citizen_reports_count"] = curr_count + 1
    curr_score = report.get("priority_score") or 5.0
    report["priority_score"] = min(10.0, round(curr_score + 0.15, 2))
    save_data()
    return jsonify({
        "success": True,
        "citizen_reports_count": report["citizen_reports_count"],
        "priority_score": report["priority_score"],
    })


@app.route("/api/stats", methods=["GET"])
def get_stats():
    total = len(REPORTS)
    if total == 0:
        return jsonify({"total": 0})

    status_counts = {"submitted": 0, "in-progress": 0, "resolved": 0}
    category_counts = {}
    dept_counts = {}
    priority_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    total_priority_score = 0.0

    for r in REPORTS:
        st = (r.get("issue_status") or "submitted").lower()
        status_counts[st] = status_counts.get(st, 0) + 1
        cat = r.get("issue_type") or "other"
        category_counts[cat] = category_counts.get(cat, 0) + 1
        dept = r.get("municipal_department") or "Unassigned"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
        prio = (r.get("priority_level") or "medium").lower()
        priority_counts[prio] = priority_counts.get(prio, 0) + 1
        try:
            total_priority_score += float(r.get("priority_score") or 0.0)
        except Exception:
            pass

    resolved_count = status_counts.get("resolved", 0)
    return jsonify({
        "total_reports": total,
        "by_status": status_counts,
        "by_category": category_counts,
        "by_department": dept_counts,
        "by_priority": priority_counts,
        "resolution_rate": round((resolved_count / total) * 100, 1) if total else 0,
        "avg_priority_score": round(total_priority_score / total, 2) if total else 0,
        "critical_and_high_count": priority_counts.get("high", 0) + priority_counts.get("critical", 0),
    })


@app.route("/api/metadata", methods=["GET"])
def get_metadata():
    departments = sorted(set(DEPARTMENT_MAPPING.values()))
    return jsonify({
        "categories": CATEGORIES,
        "departments": departments,
        "department_mapping": DEPARTMENT_MAPPING,
        "priorities": ["low", "medium", "high", "critical"],
        "statuses": ["submitted", "in-progress", "resolved"],
        "region": "IN",
    })


DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api"):
        return jsonify({"error": "API endpoint not found"}), 404

    target_file = os.path.join(DIST_DIR, path)
    if path and os.path.exists(target_file) and os.path.isfile(target_file):
        return send_from_directory(DIST_DIR, path)

    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(DIST_DIR, "index.html")

    return jsonify({"message": "CityFix API Server Running. Frontend dist not found."})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting CityFix India API on port {port}...")
    print(f"Maps: {'Google Geocoding (server-side key)' if GOOGLE_MAPS_API_KEY and MAP_PROVIDER == 'google' else 'OpenStreetMap + Nominatim (no key, India-restricted)'}")
    app.run(host="0.0.0.0", port=port, debug=False)
