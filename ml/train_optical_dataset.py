import os
import json
import cv2
import math
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, List, Tuple

from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
import xgboost as xgb

# 12 Optical Reference Color Dataset (Dual Theoretical & Physical Measured Swatches)
REFERENCE_DATASET = [
    # BASE Class
    {"class": "BASE", "shade": "LIGHT", "hex": "#F8F4EA", "rgb": (248, 244, 234), "card_rgb": (237, 230, 217)},
    {"class": "BASE", "shade": "ORIGINAL", "hex": "#F3EDE0", "rgb": (243, 237, 224), "card_rgb": (226, 216, 202)},
    {"class": "BASE", "shade": "DARK", "hex": "#E5DCCB", "rgb": (229, 220, 203), "card_rgb": (213, 198, 178)},

    # LOW Class
    {"class": "LOW", "shade": "LIGHT", "hex": "#F3E7B5", "rgb": (243, 231, 181), "card_rgb": (239, 220, 165)},
    {"class": "LOW", "shade": "ORIGINAL", "hex": "#E8D9A8", "rgb": (232, 217, 168), "card_rgb": (227, 203, 146)},
    {"class": "LOW", "shade": "DARK", "hex": "#D8C17A", "rgb": (216, 193, 122), "card_rgb": (214, 180, 106)},

    # MEDIUM Class
    {"class": "MEDIUM", "shade": "LIGHT", "hex": "#E3A66F", "rgb": (227, 166, 111), "card_rgb": (219, 150, 98)},
    {"class": "MEDIUM", "shade": "ORIGINAL", "hex": "#C98A4A", "rgb": (201, 138, 74), "card_rgb": (202, 127, 70)},
    {"class": "MEDIUM", "shade": "DARK", "hex": "#A96532", "rgb": (169, 101, 50), "card_rgb": (177, 104, 53)},

    # HIGH Class
    {"class": "HIGH", "shade": "LIGHT", "hex": "#70408A", "rgb": (112, 64, 138), "card_rgb": (114, 65, 138)},
    {"class": "HIGH", "shade": "ORIGINAL", "hex": "#4B245C", "rgb": (75, 36, 92), "card_rgb": (84, 43, 106)},
    {"class": "HIGH", "shade": "DARK", "hex": "#35183F", "rgb": (53, 24, 63), "card_rgb": (52, 21, 68)},
]

def extract_pixels_from_uploaded_card(img_path: str) -> List[Dict[str, Any]]:
    """Extracts raw pixel color samples directly from the uploaded reference card image."""
    img = cv2.imread(img_path)
    if img is None:
        return []
    
    h, w, _ = img.shape
    cols = [
        {"name": "BASE", "x1": int(w * 0.03), "x2": int(w * 0.15)},
        {"name": "LOW", "x1": int(w * 0.28), "x2": int(w * 0.40)},
        {"name": "MEDIUM", "x1": int(w * 0.54), "x2": int(w * 0.65)},
        {"name": "HIGH", "x1": int(w * 0.79), "x2": int(w * 0.91)},
    ]

    rows = [
        {"name": "LIGHT", "y1": int(h * 0.23), "y2": int(h * 0.43)},
        {"name": "ORIGINAL", "y1": int(h * 0.48), "y2": int(h * 0.68)},
        {"name": "DARK", "y1": int(h * 0.73), "y2": int(h * 0.93)},
    ]

    pixel_samples = []

    for c_info in cols:
        for r_info in rows:
            cls = c_info["name"]
            shade = r_info["name"]
            
            crop = img[r_info["y1"]:r_info["y2"], c_info["x1"]:c_info["x2"]]
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            ch, cw = crop_rgb.shape[:2]
            inner_crop = crop_rgb[int(ch*0.15):int(ch*0.85), int(cw*0.15):int(cw*0.85)]
            
            for y_idx in range(0, inner_crop.shape[0], 2):
                for x_idx in range(0, inner_crop.shape[1], 2):
                    r_val = float(inner_crop[y_idx, x_idx, 0])
                    g_val = float(inner_crop[y_idx, x_idx, 1])
                    b_val = float(inner_crop[y_idx, x_idx, 2])
                    pixel_samples.append({
                        "class": cls,
                        "shade": shade,
                        "rgb": (r_val, g_val, b_val)
                    })
    return pixel_samples

def rgb_to_multi_color_spaces(r: float, g: float, b: float) -> Dict[str, float]:
    rgb_arr = np.uint8([[[int(r), int(g), int(b)]]])
    
    # CIELAB
    lab_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2LAB)[0][0]
    lab_l = float(lab_arr[0]) / 255.0 * 100.0
    lab_a = float(lab_arr[1]) - 128.0
    lab_b = float(lab_arr[2]) - 128.0

    # LCH
    lch_c = math.sqrt(lab_a**2 + lab_b**2)
    lch_h = (math.atan2(lab_b, lab_a) * 180.0 / math.pi) % 360.0

    # LUV
    luv_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2LUV)[0][0]
    luv_l = float(luv_arr[0]) / 255.0 * 100.0
    luv_u = float(luv_arr[1]) - 128.0
    luv_v = float(luv_arr[2]) - 128.0

    # HSV
    hsv_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2HSV)[0][0]
    h_val = float(hsv_arr[0]) * 2.0
    s_val = float(hsv_arr[1]) / 255.0 * 100.0
    v_val = float(hsv_arr[2]) / 255.0 * 100.0

    # YCrCb
    ycrcb_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2YCrCb)[0][0]
    y_val = float(ycrcb_arr[0])
    cr_val = float(ycrcb_arr[1])
    cb_val = float(ycrcb_arr[2])

    return {
        "lab_l": lab_l, "lab_a": lab_a, "lab_b": lab_b,
        "lch_c": lch_c, "lch_h": lch_h,
        "luv_l": luv_l, "luv_u": luv_u, "luv_v": luv_v,
        "h_val": h_val, "s_val": s_val, "v_val": v_val,
        "y_val": y_val, "cr_val": cr_val, "cb_val": cb_val
    }

def compute_reference_distances(r: float, g: float, b: float) -> List[float]:
    cs = rgb_to_multi_color_spaces(r, g, b)
    l1, a1, b1 = cs["lab_l"], cs["lab_a"], cs["lab_b"]
    distances = []
    for ref in REFERENCE_DATASET:
        rr, rg, rb = ref["card_rgb"]
        ref_cs = rgb_to_multi_color_spaces(rr, rg, rb)
        l2, a2, b2 = ref_cs["lab_l"], ref_cs["lab_a"], ref_cs["lab_b"]
        de = math.sqrt((l1 - l2)**2 + (a1 - a2)**2 + (b1 - b2)**2)
        distances.append(de)
    return distances

def build_authentic_training_dataset(card_img_path: str, samples_per_ref: int = 4000) -> pd.DataFrame:
    """
    Builds a hybrid dataset combining real physical card pixel extractions with augmented lighting models.
    """
    print(f"Extracting physical pixels from uploaded card image: {card_img_path}...", flush=True)
    real_pixels = extract_pixels_from_uploaded_card(card_img_path)
    print(f"Extracted {len(real_pixels)} authentic pixel samples from user reference card.", flush=True)

    np.random.seed(42)
    rows = []
    dosimeter_counter = 1

    # 1. Add authentic physical card samples directly
    for sample in real_pixels:
        cls_name = sample["class"]
        shade_name = sample["shade"]
        r, g, b = sample["rgb"]
        dosimeter_id = f"CARD-PIXEL-{dosimeter_counter:06d}"
        dosimeter_counter += 1

        std_r = float(np.random.uniform(0.5, 2.0))
        std_g = float(np.random.uniform(0.5, 2.0))
        std_b = float(np.random.uniform(0.5, 2.0))

        cs = rgb_to_multi_color_spaces(r, g, b)

        total_rgb = r + g + b + 1e-5
        chroma_x = r / total_rgb
        chroma_y = g / total_rgb

        rg_ratio = r / (g + 1e-5)
        gb_ratio = g / (b + 1e-5)
        rb_ratio = r / (b + 1e-5)

        log_rg = math.log((r + 1e-5) / (g + 1e-5))
        log_gb = math.log((g + 1e-5) / (b + 1e-5))
        log_rb = math.log((r + 1e-5) / (b + 1e-5))

        delta_e_base = math.sqrt((cs["lab_l"] - 85.0)**2 + (cs["lab_a"] - (-2.0))**2 + (cs["lab_b"] - 5.0)**2)
        ref_dists = compute_reference_distances(r, g, b)

        row = {
            "dosimeter_id": dosimeter_id,
            "exposure_class": cls_name,
            "shade": shade_name,
            "mean_r": r, "mean_g": g, "mean_b": b,
            "std_r": std_r, "std_g": std_g, "std_b": std_b,
            "lab_l": cs["lab_l"], "lab_a": cs["lab_a"], "lab_b": cs["lab_b"],
            "lch_c": cs["lch_c"], "lch_h": cs["lch_h"],
            "luv_l": cs["luv_l"], "luv_u": cs["luv_u"], "luv_v": cs["luv_v"],
            "h_val": cs["h_val"], "s_val": cs["s_val"], "v_val": cs["v_val"],
            "y_val": cs["y_val"], "cr_val": cs["cr_val"], "cb_val": cs["cb_val"],
            "chroma_x": chroma_x, "chroma_y": chroma_y,
            "rg_ratio": rg_ratio, "gb_ratio": gb_ratio, "rb_ratio": rb_ratio,
            "log_rg": log_rg, "log_gb": log_gb, "log_rb": log_rb,
            "delta_e_base": delta_e_base
        }

        for idx, dist in enumerate(ref_dists):
            row[f"dist_ref_{idx}"] = dist

        rows.append(row)

    # 2. Add augmented lighting variations based on physical measured card RGBs
    for ref in REFERENCE_DATASET:
        base_r, base_g, base_b = ref["card_rgb"]
        cls_name = ref["class"]
        shade_name = ref["shade"]

        num_dosimeters = samples_per_ref // 10

        for d in range(num_dosimeters):
            dosimeter_id = f"AUG-DOS-{dosimeter_counter:06d}"
            dosimeter_counter += 1

            strip_bias_r = np.random.normal(0, 1.5)
            strip_bias_g = np.random.normal(0, 1.5)
            strip_bias_b = np.random.normal(0, 1.5)

            for s in range(10):
                gain = np.random.uniform(0.72, 1.28)
                temp_shift_r = np.random.uniform(0.93, 1.07)
                temp_shift_b = np.random.uniform(0.93, 1.07)
                gamma = np.random.uniform(0.88, 1.12)

                noise_r = np.random.normal(0, 1.8)
                noise_g = np.random.normal(0, 1.8)
                noise_b = np.random.normal(0, 1.8)

                raw_r = float(np.clip((base_r + strip_bias_r) * gain * temp_shift_r + noise_r, 0, 255))
                raw_g = float(np.clip((base_g + strip_bias_g) * gain + noise_g, 0, 255))
                raw_b = float(np.clip((base_b + strip_bias_b) * gain * temp_shift_b + noise_b, 0, 255))

                r = float(np.clip(255.0 * ((raw_r / 255.0) ** gamma), 0, 255))
                g = float(np.clip(255.0 * ((raw_g / 255.0) ** gamma), 0, 255))
                b = float(np.clip(255.0 * ((raw_b / 255.0) ** gamma), 0, 255))

                std_r = float(np.random.uniform(1.0, 3.5))
                std_g = float(np.random.uniform(1.0, 3.5))
                std_b = float(np.random.uniform(1.0, 3.5))

                cs = rgb_to_multi_color_spaces(r, g, b)

                total_rgb = r + g + b + 1e-5
                chroma_x = r / total_rgb
                chroma_y = g / total_rgb

                rg_ratio = r / (g + 1e-5)
                gb_ratio = g / (b + 1e-5)
                rb_ratio = r / (b + 1e-5)

                log_rg = math.log((r + 1e-5) / (g + 1e-5))
                log_gb = math.log((g + 1e-5) / (b + 1e-5))
                log_rb = math.log((r + 1e-5) / (b + 1e-5))

                delta_e_base = math.sqrt((cs["lab_l"] - 85.0)**2 + (cs["lab_a"] - (-2.0))**2 + (cs["lab_b"] - 5.0)**2)
                ref_dists = compute_reference_distances(r, g, b)

                row = {
                    "dosimeter_id": dosimeter_id,
                    "exposure_class": cls_name,
                    "shade": shade_name,
                    "mean_r": r, "mean_g": g, "mean_b": b,
                    "std_r": std_r, "std_g": std_g, "std_b": std_b,
                    "lab_l": cs["lab_l"], "lab_a": cs["lab_a"], "lab_b": cs["lab_b"],
                    "lch_c": cs["lch_c"], "lch_h": cs["lch_h"],
                    "luv_l": cs["luv_l"], "luv_u": cs["luv_u"], "luv_v": cs["luv_v"],
                    "h_val": cs["h_val"], "s_val": cs["s_val"], "v_val": cs["v_val"],
                    "y_val": cs["y_val"], "cr_val": cs["cr_val"], "cb_val": cs["cb_val"],
                    "chroma_x": chroma_x, "chroma_y": chroma_y,
                    "rg_ratio": rg_ratio, "gb_ratio": gb_ratio, "rb_ratio": rb_ratio,
                    "log_rg": log_rg, "log_gb": log_gb, "log_rb": log_rb,
                    "delta_e_base": delta_e_base
                }

                for idx, dist in enumerate(ref_dists):
                    row[f"dist_ref_{idx}"] = dist

                rows.append(row)

    return pd.DataFrame(rows)

def train_and_evaluate_models():
    card_img_path = r"C:/Users/ganthimathi/.gemini/antigravity/brain/ef41cf93-1248-421c-9c4f-24c7eb6ec3a0/.user_uploaded/media_1790011804792.png"
    df = build_authentic_training_dataset(card_img_path, samples_per_ref=4000)
    print(f"Total Dataset Built: {len(df)} samples across {df['dosimeter_id'].nunique()} physical dosimeter groups.", flush=True)

    base_feature_cols = [
        "mean_r", "mean_g", "mean_b", "std_r", "std_g", "std_b",
        "lab_l", "lab_a", "lab_b", "lch_c", "lch_h",
        "luv_l", "luv_u", "luv_v", "h_val", "s_val", "v_val",
        "y_val", "cr_val", "cb_val", "chroma_x", "chroma_y",
        "rg_ratio", "gb_ratio", "rb_ratio", "log_rg", "log_gb", "log_rb", "delta_e_base"
    ]
    ref_dist_cols = [f"dist_ref_{i}" for i in range(12)]
    feature_cols = base_feature_cols + ref_dist_cols
    
    target_col = "exposure_class"
    group_col = "dosimeter_id"

    X = df[feature_cols].values
    y = df[target_col].values
    groups = df[group_col].values

    classes = ["BASE", "LOW", "MEDIUM", "HIGH"]
    class_map = {c: i for i, c in enumerate(classes)}
    y_encoded = np.array([class_map[item] for item in y])

    # Fit Scaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    models = {
        "RandomForest Classifier (500 Trees)": RandomForestClassifier(n_estimators=500, max_depth=25, min_samples_split=2, random_state=42, n_jobs=-1),
        "ExtraTrees Classifier (500 Trees)": ExtraTreesClassifier(n_estimators=500, max_depth=25, min_samples_split=2, random_state=42, n_jobs=-1),
        "XGBoost Gradient Boosting": xgb.XGBClassifier(n_estimators=400, learning_rate=0.03, max_depth=8, random_state=42, eval_metric="mlogloss", n_jobs=-1),
        "HistGradientBoosting": HistGradientBoostingClassifier(max_iter=300, max_depth=10, random_state=42)
    }

    gkf = GroupKFold(n_splits=5)
    best_model_name = ""
    best_score = -1.0
    best_model_obj = None

    comparison_results = {}

    print("\n--- Multi-Model Training & 5-Fold GroupKFold Cross-Validation ---", flush=True)
    for name, model in models.items():
        scores = []
        all_y_true = []
        all_y_pred = []

        for train_idx, test_idx in gkf.split(X_scaled, y_encoded, groups=groups):
            X_tr, y_tr = X_scaled[train_idx], y_encoded[train_idx]
            X_te, y_te = X_scaled[test_idx], y_encoded[test_idx]

            model.fit(X_tr, y_tr)
            preds = model.predict(X_te)

            acc = accuracy_score(y_te, preds)
            scores.append(acc)

            all_y_true.extend(y_te)
            all_y_pred.extend(preds)

        mean_acc = float(np.mean(scores))
        prec, rec, f1, _ = precision_recall_fscore_support(all_y_true, all_y_pred, average="weighted")
        cm = confusion_matrix(all_y_true, all_y_pred).tolist()

        comparison_results[name] = {
            "cv_accuracy": round(mean_acc, 6),
            "precision": round(float(prec), 6),
            "recall": round(float(rec), 6),
            "f1_score": round(float(f1), 6),
            "confusion_matrix": cm
        }

        print(f"Model: {name:<40} | CV Accuracy: {mean_acc*100:.4f}% | F1-Score: {f1:.6f}", flush=True)

        if mean_acc > best_score:
            best_score = mean_acc
            best_model_name = name
            best_model_obj = model

    print(f"\n==================================================", flush=True)
    print(f"ULTRA BEST MODEL SELECTED: {best_model_name}", flush=True)
    print(f"CROSS-VALIDATION ACCURACY: {best_score*100:.4f}%", flush=True)
    print(f"==================================================", flush=True)

    # Fit best model on full dataset
    print("\nFitting best model on full dataset...", flush=True)
    best_model_obj.fit(X_scaled, y_encoded)

    # Export Model Artifacts
    models_dirs = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "app", "models")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    ]

    metrics_payload = {
        "best_model_name": best_model_name,
        "best_cv_accuracy": round(best_score, 6),
        "classes": classes,
        "feature_cols": feature_cols,
        "num_samples": len(df),
        "num_dosimeter_groups": df["dosimeter_id"].nunique(),
        "model_comparison": comparison_results
    }

    for models_dir in models_dirs:
        os.makedirs(models_dir, exist_ok=True)
        model_path = os.path.join(models_dir, "sentridose_optical_classifier.joblib")
        scaler_path = os.path.join(models_dir, "sentridose_scaler.joblib")
        metrics_path = os.path.join(models_dir, "model_metrics.json")

        joblib.dump(best_model_obj, model_path)
        joblib.dump(scaler, scaler_path)

        with open(metrics_path, "w") as f:
            json.dump(metrics_payload, f, indent=2)

        print(f"Model artifacts exported to: {models_dir}", flush=True)

if __name__ == "__main__":
    train_and_evaluate_models()
