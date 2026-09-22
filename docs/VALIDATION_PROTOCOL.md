# SentriDose Validation Protocol & Safety Standard

## 1. Regulatory & Safety Disclaimer

> [!WARNING]
> SentriDose is a proof-of-concept software research platform for passive colorimetric exposure analysis.
> - SentriDose is **NOT** a substitute for certified active real-time $H_2S$ life-safety gas detectors or personal alarms.
> - SentriDose does NOT claim regulatory certification (such as OSHA, NIOSH, ATEX, or IECEx).
> - Experimental validation MUST be conducted in certified exposure chambers under strict industrial hygiene oversight.

---

## 2. Experimental Calibration Protocol

To transition SentriDose from **DEMO MODE** to **VALIDATED MODE**, the laboratory testing team must adhere to the following procedure:

1. **Controlled Gas Generation**: Dosimeter strips are exposed in a certified gas chamber with known gas concentration $C$ (ppm) and duration $t$ (hours), yielding total exposure dose $D = C \times t$ (ppm-hours).
2. **Environmental Control**: Temperature (15°C - 35°C) and Relative Humidity (30% - 80%) must be monitored and recorded.
3. **Multi-Camera Acquisition**: Dosimeter samples must be imaged using at least three distinct smartphone models under varied illumination sources (Natural daylight, 5000K LED, 3000K Warm Light).
4. **Data Verification**: Upload the formatted CSV dataset to SentriDose via `/admin/models`.
5. **Model Evaluation & Review**: Ensure that the evaluated test accuracy, F1-score, and regression MAE/RMSE meet target safety tolerances before promoting the model version to **Active Production**.
