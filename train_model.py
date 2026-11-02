"""Train an India-aware civic complaint classifier (TF-IDF word+char n-grams)."""
import os
import re
import json
import random
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score

from india_config import CATEGORY_ALIASES, INDIAN_CITIES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "municipal_training_set_1100.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "category_model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "models", "metrics.json")

random.seed(42)

PLACES = []
for city in INDIAN_CITIES:
    for spot in city["spots"]:
        PLACES.append(f"{spot}, {city['city']}")


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9\u0900-\u097f ]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_label(label):
    label = str(label).strip().lower().replace(" ", "_")
    return CATEGORY_ALIASES.get(label, label)


INDIA_TEMPLATES = {
    "pothole": [
        "Bada gaddha hai {place} pe, two-wheelers gir rahe hain",
        "Deep pothole on the main road near {place} damaging car tyres",
        "Sadak toot gayi hai {place} ke paas, monsoon me paani bhar jata hai",
        "Multiple craters on the service road near {place} causing traffic jams",
        "Broken speed breaker and pothole cluster near {place} bus stop",
        "Huge pit in the middle of the intersection at {place}, accident risk",
        "Road caved in after rain near {place}, please send PWD immediately",
        "Uneven road and gaddha near school gate at {place}",
    ],
    "water_leakage": [
        "Jal board pipeline burst near {place}, road flooding and wasting water",
        "Nal ka paani leak ho raha hai {place} pe last 2 days se",
        "High pressure water leak in front of {place} creating a slippery pond",
        "Hydrant leaking gallons of water near {place} metro station",
        "Underground pipe seepage, low water pressure in colony near {place}",
        "Paani ka tank overflow and pipeline crack at {place}",
        "Urgent water main rupture beside the hospital at {place}",
        "Drinking water pipe broken, muddy water on street at {place}",
    ],
    "drainage": [
        "Nala jaam ho gaya hai {place} me, monsoon flooding started",
        "Open manhole without cover near {place}, children at risk",
        "Choked storm drain and sewage overflow outside {place}",
        "Gutter blocked with plastic, standing dirty water at {place}",
        "Sewer line collapsed, foul smell and mosquitoes at {place}",
        "Drainage cover missing on the main road at {place}",
        "Black water from nala entering houses near {place}",
        "Manhole overflowing after rain at {place} crossing",
    ],
    "streetlight": [
        "Streetlights out for 3 nights near {place}, very unsafe for women",
        "Bijli ka pole hanging wires at {place}, electrocution danger",
        "Entire gali dark, street light not working at {place}",
        "Transformer sparking near {place} market, urgent DISCOM visit needed",
        "Broken streetlight pole leaning onto the road at {place}",
        "Park lights fused after rain at {place}",
        "Overhead wire snapped and hanging at {place} bus stand",
        "Colony streetlights off since last week around {place}",
    ],
    "garbage": [
        "Kooda 3 din se nahi uthaya {place} me, bad smell and flies",
        "Overflowing municipal bins on the footpath at {place}",
        "Ghanta gadi missed collection this week in {place}",
        "Garbage dump attracting stray dogs near {place} school",
        "Kachra scattered after market hours at {place}",
        "Unhygienic waste pile beside the temple at {place}",
        "Safai not done, wet waste rotting in heat at {place}",
        "Community dustbin overflowing onto the road at {place}",
    ],
    "illegal_dumping": [
        "Construction malba dumped illegally near {place}",
        "C&D debris blocking the service lane at {place}",
        "Someone dumped old tyres and rubble in the nala at {place}",
        "Illegal dumping of furniture and appliances at {place}",
        "Builder debris left on public land near {place}",
        "Night dumping of construction waste at {place} park",
        "Rubble heap occupying the footpath at {place}",
        "Industrial scrap dumped beside residential lane at {place}",
    ],
    "illegal_parking": [
        "Autos parked on the footpath blocking pedestrians at {place}",
        "Cars double parked near {place} forcing buses onto opposite lane",
        "Illegal parking in front of hospital emergency gate at {place}",
        "No-parking zone filled with two-wheelers at {place} market",
        "Truck parked overnight blocking the colony gate at {place}",
        "Disabled ramp blocked by a parked SUV at {place}",
        "Traffic deadlock due to illegal parking on {place} main road",
        "Encroached parking on zebra crossing at {place}",
    ],
    "noise": [
        "Loudspeaker and DJ running past midnight near {place}",
        "Construction starting at 5 AM violating noise rules at {place}",
        "Continuous honking and shor from wedding procession at {place}",
        "Industrial humming from workshop next to apartments at {place}",
        "Temple loudspeaker too loud early morning at {place}",
        "Bar music blasting into residential gali at {place}",
        "Generator noise all night near {place}",
        "Dhol and crackers causing sleep disturbance at {place}",
    ],
    "graffiti": [
        "Political posters pasted all over the compound wall at {place}",
        "Graffiti and vulgar writing on the public toilet at {place}",
        "Illegal banners covering street name boards at {place}",
        "Vandalised bus shelter walls at {place}",
        "Wall painting defaced with party symbols at {place}",
        "Stickers and posters on metro pillar at {place}",
        "Public park wall vandalised at {place}",
        "School boundary wall covered with ads at {place}",
    ],
    "stray_animals": [
        "Pack of stray dogs chasing two-wheelers at {place}",
        "Stray cattle sitting on the highway near {place}",
        "Aggressive stray dog bite incident near {place} school",
        "Pigs rummaging through garbage at {place}",
        "Cow on the main road causing traffic near {place}",
        "Monkeys snatching food and attacking people at {place}",
        "Need animal control for rabies-risk dogs at {place}",
        "Herd of buffaloes blocking the flyover approach at {place}",
    ],
    "encroachment": [
        "Hawkers and thelas occupying the entire footpath at {place}",
        "Illegal shop extension onto the road at {place}",
        "Encroachment blocking fire-tender access at {place}",
        "Temporary stalls on the zebra crossing at {place}",
        "Illegal construction on municipal land near {place}",
        "Vendors blocking the metro exit at {place}",
        "Right of way taken over by commercial boards at {place}",
        "Footpath completely occupied, pedestrians on road at {place}",
    ],
    "other": [
        "Public toilet locked and unusable at {place}",
        "Broken park bench and damaged play equipment at {place}",
        "Missing street name board at the junction of {place}",
        "Dead tree about to fall on parked vehicles at {place}",
        "Public water ATM not working at {place}",
        "Damaged bus stop roof after storm at {place}",
        "Need mosquito fogging, dengue cases nearby {place}",
        "Broken railing on the foot-over-bridge at {place}",
    ],
}


def generate_india_samples(repeats=3):
    rows = []
    for _ in range(repeats):
        for label, templates in INDIA_TEMPLATES.items():
            for tmpl in templates:
                place = random.choice(PLACES)
                rows.append({"issue_description": tmpl.format(place=place), "issue_type": label})
    extra = [
        ("Sadak me bada gaddha hai, tyre puncture ho gaya", "pothole"),
        ("Paani leak ho raha hai pipeline se turant crew bhejo", "water_leakage"),
        ("Nala overflow monsoon flooding colony", "drainage"),
        ("Street light band hai raat me andhera khatra", "streetlight"),
        ("Kachra uga hua hai teen din se safai nahi hui", "garbage"),
        ("Malba dump kar diya park me illegally", "illegal_dumping"),
        ("Gaadi footpath pe khadi hai no parking", "illegal_parking"),
        ("Loud DJ shor midnight ke baad", "noise"),
        ("Wall pe posters aur graffiti", "graffiti"),
        ("Stray dogs attacking children near school", "stray_animals"),
        ("Hawker encroachment blocking footpath", "encroachment"),
        ("Park lights and swings broken", "other"),
        ("Open manhole cover missing near metro", "drainage"),
        ("Live wire hanging from electric pole", "streetlight"),
        ("Water logging due to choked drain after rain", "drainage"),
        ("Illegal parking of trucks on NH service lane", "illegal_parking"),
        ("Cattle on road near flyover accident risk", "stray_animals"),
        ("Builder debris dumped in nala", "illegal_dumping"),
        ("Low water pressure and leaking main", "water_leakage"),
        ("Potholes on ring road after monsoon", "pothole"),
    ]
    for text, label in extra:
        rows.append({"issue_description": text, "issue_type": label})
    return pd.DataFrame(rows)


def load_training_frame():
    frames = []
    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
        df = df.dropna(subset=["issue_description", "issue_type"])
        df["issue_type"] = df["issue_type"].map(normalize_label)
        frames.append(df[["issue_description", "issue_type"]])
    frames.append(generate_india_samples(repeats=4))
    combined = pd.concat(frames, ignore_index=True)
    combined["issue_description"] = combined["issue_description"].astype(str)
    combined["issue_type"] = combined["issue_type"].map(normalize_label)
    combined = combined[combined["issue_type"].notna()]
    combined = combined.drop_duplicates(subset=["issue_description"])
    return combined


def build_pipeline():
    return Pipeline([
        ("features", FeatureUnion([
            ("word", TfidfVectorizer(
                ngram_range=(1, 2),
                min_df=2,
                max_features=14000,
                sublinear_tf=True,
            )),
            ("char", TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(3, 5),
                min_df=3,
                max_features=8000,
                sublinear_tf=True,
            )),
        ])),
        ("clf", LogisticRegression(
            C=2.5,
            class_weight="balanced",
            max_iter=2000,
            solver="lbfgs",
        )),
    ])


def main():
    os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)
    df = load_training_frame()
    df["clean_text"] = df["issue_description"].map(clean_text)
    df = df[df["clean_text"].str.len() > 3]

    X = df["clean_text"]
    y = df["issue_type"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = build_pipeline()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="macro")
    report = classification_report(y_test, y_pred, output_dict=True)

    # Retrain on full data for production
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)

    metrics = {
        "holdout_accuracy": round(float(acc), 4),
        "holdout_macro_f1": round(float(f1), 4),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "total_rows": int(len(X)),
        "classes": sorted(y.unique().tolist()),
        "class_report": report,
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(classification_report(y_test, y_pred))
    print(f"Holdout accuracy={acc:.4f}  macro-F1={f1:.4f}")
    print(f"Saved model -> {MODEL_PATH}")
    print(f"Saved metrics -> {METRICS_PATH}")


if __name__ == "__main__":
    main()
