# SentriDose Architecture Specification

"Passive Exposure. Intelligent Quantification."

## 1. System Overview

SentriDose is an industrial safety platform designed for passive colorimetric exposure monitoring with AI-based smartphone quantification.

### Crucial Architectural Principles
1. **Passive Wristband**: The wearable dosimeter contains NO microcontrollers, NO batteries, NO Bluetooth/wireless components, and NO active electronic gas sensors.
2. **Laboratory Controlled Exposure**: All exposure to toxic gases ($H_2S$) takes place physically outside this software system.
3. **Post-Exposure Quantification**: Workers or safety officers photograph the dosimeter after a work shift in a safe ambient location.
4. **Strict Safety & Transparency Guardrails**: The software explicitly distinguishes between **DEMO/PROTOTYPE MODE** (synthetic classes: S0 Baseline to S4 High) and **VALIDATED MODE** (quantitative exposure estimation backed by controlled experimental calibration data).

---

## 2. End-to-End Architecture Data Flow

```
+-----------------------------------------------------------------------+
|                         PHYSICAL DOSIMETER                            |
|  [ QR Code ]  [ Validity Patch ]  [ Ref Color Scale ]  [ Sensing Strip ]|
+-----------------------------------------------------------------------+
                                  |
                                  | (Photograph via Smartphone Browser)
                                  v
+-----------------------------------------------------------------------+
|                   FRONTEND (React + TypeScript + Vite)                |
|  - HTML5 getUserMedia Camera Capture with Reticle Guidelines         |
|  - Real-time client-side blur / exposure / perspective checks         |
|  - Manual fallback ROI selector for difficult lighting conditions      |
+-----------------------------------------------------------------------+
                                  |
                                  | (Multipart HTTP Upload)
                                  v
+-----------------------------------------------------------------------+
|                      BACKEND API (FastAPI)                            |
|                                                                       |
|  1. Image Quality Engine (Blur, Brightness, Contrast, Clipping)       |
|  2. ROI Detection (QR code, contour matching, reference patches)     |
|  3. Color Calibration Engine (Affine & White-balance matrix shift)   |
|  4. Feature Extractor (RGB, HSV, CIELAB, Delta E, robust stats)       |
|  5. AI Inference Pipeline (Classifier + Regressor if validated)       |
|  6. Validity & Quality Gate (GOOD, WARNING, REJECT)                   |
+-----------------------------------------------------------------------+
                                  |
               +------------------+------------------+
               |                                     |
               v                                     v
+-----------------------------+       +-----------------------------+
|    SQL DATABASE (SQLite/PG) |       |  MODEL & REPORT STORAGE     |
| - Workers & Dosimeters      |       | - Analyzed image artifacts  |
| - Scans & Color Features    |       | - Trained joblib models     |
| - Audit logs & Versioning   |       | - Exported CSV / PDF        |
+-----------------------------+       +-----------------------------+
```

---

## 3. Computer Vision & Feature Extraction Engine

### 3.1 ROI Detection Hierarchy
1. **Primary**: QR Code / ArUco marker detection via OpenCV. Determines homography matrix $H$ to unwarp perspective distortion.
2. **Secondary**: Reference patch contour segmentation. Locates known RGB reference squares ($R_1 \dots R_N$) printed adjacent to the sensing strip.
3. **Tertiary / Fallback**: User-defined ROI coordinate bounding boxes passed from the frontend canvas.

### 3.2 Color Transformation & Correction
Let $C_{\text{obs}}$ be the observed vector of reference patch colors and $C_{\text{true}}$ be the factory-calibrated ground truth colors. We calculate the transformation matrix $M$ such that:

$$C_{\text{true}} = M \cdot C_{\text{obs}}$$

The sensing strip ROI colors are then corrected via $M$ prior to feature computation.

### 3.3 Extracted Feature Set
- **RGB Space**: $\mu_R, \mu_G, \mu_B, \sigma_R, \sigma_G, \sigma_B$
- **HSV Space**: $\mu_H, \mu_S, \mu_V$
- **CIELAB Space**: $L^*, a^*, b^*$
- **Ratios & Differences**: $R/G, G/B, R/B, \Delta L^*, \Delta a^*, \Delta b^*$
- **Delta E ($\Delta E^*_{ab}$)**:

$$\Delta E^*_{ab} = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$$

---

## 4. Operational Modes

| Feature | DEMO MODE | VALIDATED MODE |
|---|---|---|
| **Badge Banner** | `DEMONSTRATION MODE — NOT A VALIDATED H₂S MEASUREMENT` | `VALIDATED MODEL` |
| **Output Classes** | Relative classes (S0 Baseline, S1 Very Low, S2 Low, S3 Moderate, S4 High) | Laboratory calibrated quantitative estimation |
| **PPM Exposure Output** | **DISABLED / HIDDEN** | Displayed with uncertainty bounds ($\pm \sigma$) |
| **Model Status** | Synthetic Scikit-Learn / XGBoost baseline | High-performance ensemble evaluated on test set |

---

## 5. Security & Access Control

- **JWT Token Authentication** (OAuth2 password flow with Bearer token)
- **Role-Based Access Control (RBAC)**:
  - `Admin`: Model dataset upload, model training, activation, system configuration.
  - `Safety Officer`: View all workers, scan dosimeters, export PDF/CSV reports, inspect dashboard alerts.
  - `Worker`: View personal exposure history and active assigned dosimeter.
