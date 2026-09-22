# SentriDose Dataset Format Guide

## Required CSV Columns for Model Training

To train or activate a custom quantitative/classification model in SentriDose, the uploaded CSV dataset must include the following schema:

| Column Name | Type | Description | Example |
|---|---|---|---|
| `sample_id` | String | Unique identifier for image sample | `SMP-2026-001` |
| `dosimeter_id` | String | Physical dosimeter unit ID (Used for GroupKFold) | `DOS-8841` |
| `batch_id` | String | Manufacturing batch identifier | `BATCH-2026-A` |
| `exposure_class` | String | Categorical label (S0, S1, S2, S3, S4 or Baseline, Low, High) | `S2` |
| `ground_truth_exposure` | Float | Quantified exposure dose (ppm-hours or ppm) | `15.5` |
| `temperature` | Float | Ambient temperature (°C) during scanning | `22.5` |
| `humidity` | Float | Relative humidity (%) during scanning | `45.0` |
| `camera_id` | String | Smartphone model or camera identifier | `Pixel_7_Main` |
| `lighting_condition` | String | Ambient lighting (Daylight, LED, Fluorescent) | `LED_5000K` |
| `mean_r` | Float | Mean Red channel value (0-255) | `142.3` |
| `mean_g` | Float | Mean Green channel value (0-255) | `110.1` |
| `mean_b` | Float | Mean Blue channel value (0-255) | `85.6` |
| `std_r` | Float | Standard deviation of Red channel | `4.2` |
| `std_g` | Float | Standard deviation of Green channel | `3.8` |
| `std_b` | Float | Standard deviation of Blue channel | `3.1` |
| `h_val` | Float | Mean Hue value (0-360) | `24.5` |
| `s_val` | Float | Mean Saturation value (0-100) | `39.8` |
| `v_val` | Float | Mean Value/Brightness (0-100) | `55.8` |
| `lab_l` | Float | CIELAB $L^*$ lightness (0-100) | `50.2` |
| `lab_a` | Float | CIELAB $a^*$ green-red axis | `12.4` |
| `lab_b` | Float | CIELAB $b^*$ blue-yellow axis | `18.6` |
| `delta_e` | Float | Color difference $\Delta E^*_{ab}$ relative to unexposed baseline | `14.2` |
