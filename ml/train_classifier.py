import pandas as pd
import numpy as np
import joblib
from typing import Dict, Any, List
from sklearn.model_selection import GroupKFold, GridSearchCV
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
import xgboost as xgb

def train_and_compare_classifiers(
    train_df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str = "exposure_class",
    group_col: str = "dosimeter_id"
) -> Dict[str, Any]:
    """
    Trains and compares multiple classifiers using GroupKFold to evaluate physical dosimeter generalization.
    """
    X = train_df[feature_cols].values
    y = train_df[target_col].values
    groups = train_df[group_col].values

    gkf = GroupKFold(n_splits=5)

    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000),
        "SVC": SVC(probability=True),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": xgb.XGBClassifier(random_state=42)
    }

    results = {}
    best_model = None
    best_score = -1.0
    best_name = ""

    for name, model in models.items():
        scores = []
        for train_i, val_i in gkf.split(X, y, groups):
            X_tr, y_tr = X[train_i], y[train_i]
            X_va, y_va = X[val_i], y[val_i]
            
            # Map string classes if XGBoost
            if name == "XGBoost":
                labels = np.unique(y)
                label_map = {lbl: idx for idx, lbl in enumerate(labels)}
                y_tr = np.array([label_map[item] for item in y_tr])
                y_va = np.array([label_map[item] for item in y_va])

            model.fit(X_tr, y_tr)
            preds = model.predict(X_va)
            acc = accuracy_score(y_va, preds)
            scores.append(acc)

        mean_acc = float(np.mean(scores))
        results[name] = {"cv_accuracy_mean": mean_acc, "cv_accuracy_std": float(np.std(scores))}

        if mean_acc > best_score:
            best_score = mean_acc
            best_model = model
            best_name = name

    # Fit best model on full training set
    best_model.fit(X, y)

    return {
        "comparison": results,
        "best_model_name": best_name,
        "best_model": best_model,
        "best_score": best_score
    }
