"""India-first municipal config for CityFix (departments, cities, keywords)."""

DEFAULT_CITY = "New Delhi"
DEFAULT_STATE = "Delhi"
DEFAULT_PIN = "110001"
DEFAULT_COUNTRY = "India"
DEFAULT_LAT = 28.6139
DEFAULT_LNG = 77.2090
DEFAULT_ZOOM = 12
DEFAULT_ADDRESS = "Connaught Place, New Delhi"

INDIAN_CITIES = [
    {"city": "New Delhi", "state": "Delhi", "pin": "110001", "lat": 28.6139, "lng": 77.2090, "spots": ["Connaught Place", "Karol Bagh", "Dwarka Sector 12", "Rohini"]},
    {"city": "Mumbai", "state": "Maharashtra", "pin": "400001", "lat": 19.0760, "lng": 72.8777, "spots": ["Andheri West", "Bandra", "Dadar", "Borivali"]},
    {"city": "Bengaluru", "state": "Karnataka", "pin": "560001", "lat": 12.9716, "lng": 77.5946, "spots": ["Koramangala", "Indiranagar", "Whitefield", "Jayanagar"]},
    {"city": "Hyderabad", "state": "Telangana", "pin": "500001", "lat": 17.3850, "lng": 78.4867, "spots": ["Banjara Hills", "Hitech City", "Secunderabad", "Charminar"]},
    {"city": "Chennai", "state": "Tamil Nadu", "pin": "600001", "lat": 13.0827, "lng": 80.2707, "spots": ["T. Nagar", "Anna Nagar", "Velachery", "Adyar"]},
    {"city": "Pune", "state": "Maharashtra", "pin": "411001", "lat": 18.5204, "lng": 73.8567, "spots": ["Shivajinagar", "Hinjawadi", "Kothrud", "Hadapsar"]},
    {"city": "Kolkata", "state": "West Bengal", "pin": "700001", "lat": 22.5726, "lng": 88.3639, "spots": ["Salt Lake", "Howrah", "Park Street", "Gariahat"]},
    {"city": "Ahmedabad", "state": "Gujarat", "pin": "380001", "lat": 23.0225, "lng": 72.5714, "spots": ["Navrangpura", "SG Highway", "Maninagar", "Bopal"]},
    {"city": "Jaipur", "state": "Rajasthan", "pin": "302001", "lat": 26.9124, "lng": 75.7873, "spots": ["C-Scheme", "Malviya Nagar", "Vaishali Nagar", "MI Road"]},
    {"city": "Lucknow", "state": "Uttar Pradesh", "pin": "226001", "lat": 26.8467, "lng": 80.9462, "spots": ["Hazratganj", "Gomti Nagar", "Alambagh", "Indira Nagar"]},
]

INDIAN_STREETS = [
    "MG Road", "Nehru Nagar", "Sector 18", "Ring Road", "NH-48 service lane",
    "Station Road", "Market Lane", "Ward No. 12", "Gandhi Chowk", "Bus Depot Road",
    "School Lane", "Hospital Road", "Metro Station approach", "Bazaar Street",
]

DEPARTMENT_MAPPING = {
    "pothole": "Public Works Department (PWD)",
    "water_leakage": "Jal Board / Water Supply",
    "drainage": "Municipal Drainage & Storm Water",
    "streetlight": "Street Lighting / DISCOM",
    "garbage": "Nagar Nigam Sanitation",
    "illegal_dumping": "Solid Waste Management",
    "illegal_parking": "Traffic Police",
    "noise": "Pollution Control Board",
    "graffiti": "Municipal Corporation",
    "stray_animals": "Municipal Veterinary / Animal Control",
    "encroachment": "Encroachment Removal Cell",
    "other": "Municipal Corporation Helpdesk",
}

CATEGORIES = [
    {"id": "pothole", "label": "Pothole / Road Damage (Gaddha)", "icon": "Hammer"},
    {"id": "water_leakage", "label": "Water Leak / Pipe Burst (Nal / Pipeline)", "icon": "Droplet"},
    {"id": "drainage", "label": "Drainage, Nala & Open Manhole", "icon": "Waves"},
    {"id": "streetlight", "label": "Streetlight / Power Pole Outage", "icon": "Lightbulb"},
    {"id": "garbage", "label": "Garbage / Kachra Overflow", "icon": "Trash2"},
    {"id": "illegal_dumping", "label": "Illegal Dumping of Debris", "icon": "Truck"},
    {"id": "illegal_parking", "label": "Illegal Parking / Footpath Block", "icon": "Car"},
    {"id": "noise", "label": "Noise / Loudspeaker Nuisance", "icon": "Volume2"},
    {"id": "graffiti", "label": "Graffiti / Vandalism / Poster", "icon": "Paintbrush"},
    {"id": "stray_animals", "label": "Stray Animals / Cattle on Road", "icon": "HelpCircle"},
    {"id": "encroachment", "label": "Illegal Encroachment / Hawker Block", "icon": "HelpCircle"},
    {"id": "other", "label": "Other Civic Issue", "icon": "HelpCircle"},
]

CATEGORY_ALIASES = {
    "water-leak": "water_leakage",
    "water_leak": "water_leakage",
    "illegal-dumping": "illegal_dumping",
    "illegal dumping": "illegal_dumping",
}

# Keyword overlays for Hinglish / India civic slang (boosts classifier).
CATEGORY_KEYWORDS = {
    "pothole": ["pothole", "gaddha", "gadha", "pit", "crater", "uneven road", "broken road", "sadak toot", "road damage", "speed breaker broken"],
    "water_leakage": ["water leak", "pipe burst", "nal", "pipeline", "hydrant", "seepage", "paani leak", "water logging pipe", "jal board", "low pressure"],
    "drainage": ["drainage", "nala", "gutter", "sewer", "manhole", "sewage", "jam", "choked drain", "storm water", "overflow nala", "open drain"],
    "streetlight": ["streetlight", "street light", "bijli", "pole", "transformer", "dark street", "light out", "electric pole", "discom", "wire hanging"],
    "garbage": ["garbage", "kooda", "kachra", "trash", "dumpster", "overflow", "safai", "uncollected", "bin", "waste", "ghanta gadi"],
    "illegal_dumping": ["illegal dumping", "malba", "construction debris", "c&d waste", "rubble dump", "tyres dumped"],
    "illegal_parking": ["illegal parking", "footpath parked", "double parked", "auto stand", "blocked gate", "no parking", "tow"],
    "noise": ["noise", "loudspeaker", "dj", "dhol", "construction 5am", "honking", "shor"],
    "graffiti": ["graffiti", "poster", "wall writing", "vandalism", "political banner"],
    "stray_animals": ["stray dog", "stray cattle", "cow on road", "monkey", "pig", "animal attack", "rabies", "gaushala"],
    "encroachment": ["encroachment", "hawker", "thela", "illegal shop", "footpath occupied", "right of way", "illegal construction"],
}

AREA_IMPORTANCE_KEYWORDS = [
    "school", "hospital", "metro", "railway", "station", "highway", "nh-",
    "market", "bazaar", "temple", "mosque", "gurudwara", "bus stand",
    "airport", "flyover", "chowk", "crossing", "vidyalaya",
]

URGENCY_KEYWORDS = [
    "urgent", "emergency", "danger", "hazard", "burst", "flood", "severe",
    "crash", "immediately", "accident", "jaan", "khatra", "monsoon",
    "electrocute", "live wire", "open manhole", "collapse", "fire",
    "abhi", "turant", "serious", "life", "children", "school",
]

CRITICAL_KEYWORDS = [
    "emergency", "accident", "electrocute", "live wire", "open manhole",
    "transformer blast", "fire", "collapse", "life", "jaan", "fatal",
]
