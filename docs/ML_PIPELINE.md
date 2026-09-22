# SentriDose Machine Learning Pipeline & Training Specification

## 1. Overview
The SentriDose ML engine is designed to classify exposure state and regress quantitative exposure values based on colorimetric features extracted from calibrated passive $H_2S$ dosimeter photographs.

---

## 2. Preventing Data Leakage

> [!CAUTION]
> A critical flaw in computer-vision dosimetry is splitting multiple photos of the **same physical dosimeter** across training and testing splits.

### Splitting Rule
All dataset splits MUST be grouped by `physical_dosimeter_id` or `batch_id` using **GroupKFold** or **GroupShuffleSplit**.
No photographs taken from the same physical strip or exposure session are allowed to coexist in both training and evaluation subsets.

---

## 3. Supported Machine Learning Models

### Classification Models
1. **Logistic Regression** (L2-regularized baseline)
2. **Support Vector Classifier (SVC)** (RBF kernel with probability estimation)
3. **Random Forest Classifier** (Ensemble of 100+ decision trees)
4. **XGBoost Classifier** (Gradient boosted decision trees)
5. **Multi-Layer Perceptron (MLP)** (Deep network for non-linear color space boundaries)

### Ensemble Strategy
When enabled, predictions are generated using soft-voting weighted probability averaging across Random Forest, XGBoost, and SVC:

$$P(y = c | X) = \frac{1}{\sum w_i} \sum_{i} w_i P_i(y = c | X)$$

---

## 4. Evaluation Metrics

### Classification Metrics
- **Accuracy**
- **Precision (Macro / Weighted)**
- **Recall (Macro / Weighted)**
- **F1-Score (Macro / Weighted)**
- **Confusion Matrix**
- **ROC-AUC (Multi-class One-vs-Rest)**

### Regression Metrics (Validated Mode Only)
- **Mean Absolute Error (MAE)**
- **Root Mean Squared Error (RMSE)**
- **Coefficient of Determination ($R^2$)**

---

## 5. Model Management Lifecycle

1. **Dataset Ingestion**: Safety officer or admin uploads experimental CSV containing color metrics and exposure ground truth.
2. **Preprocessing**: Group-aware feature normalization (StandardScaler / RobustScaler fitted ONLY on training set).
3. **Model Selection**: Automated grid search cross-validation across algorithms.
4. **Validation Gate**: Model metrics are saved to `model_versions` table.
5. **Activation**: Admin manually promotes selected model to production state.
