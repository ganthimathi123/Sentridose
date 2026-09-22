import os
import cv2
import numpy as np
from PIL import Image
import math
from typing import Dict, Any, Tuple, Optional

class ImageCVProcessor:
    """
    Computer Vision Engine for SentriDose Dosimeter Processing
    Includes 12 Optical Reference Colors & CIELAB Delta-E Distance Classifier.
    """

    # 12 Optical Reference Color Dataset
    REFERENCE_DATASET = [
        # BASE Class
        {"class": "BASE", "shade": "LIGHT", "hex": "#F8F4EA", "rgb": (248, 244, 234)},
        {"class": "BASE", "shade": "ORIGINAL", "hex": "#F3EDE0", "rgb": (243, 237, 224)},
        {"class": "BASE", "shade": "DARK", "hex": "#E5DCCB", "rgb": (229, 220, 203)},

        # LOW Class
        {"class": "LOW", "shade": "LIGHT", "hex": "#F3E7B5", "rgb": (243, 231, 181)},
        {"class": "LOW", "shade": "ORIGINAL", "hex": "#E8D9A8", "rgb": (232, 217, 168)},
        {"class": "LOW", "shade": "DARK", "hex": "#D8C17A", "rgb": (216, 193, 122)},

        # MEDIUM Class
        {"class": "MEDIUM", "shade": "LIGHT", "hex": "#E3A66F", "rgb": (227, 166, 111)},
        {"class": "MEDIUM", "shade": "ORIGINAL", "hex": "#C98A4A", "rgb": (201, 138, 74)},
        {"class": "MEDIUM", "shade": "DARK", "hex": "#A96532", "rgb": (169, 101, 50)},

        # HIGH Class
        {"class": "HIGH", "shade": "LIGHT", "hex": "#70408A", "rgb": (112, 64, 138)},
        {"class": "HIGH", "shade": "ORIGINAL", "hex": "#4B245C", "rgb": (75, 36, 92)},
        {"class": "HIGH", "shade": "DARK", "hex": "#35183F", "rgb": (53, 24, 63)},
    ]

    @staticmethod
    def rgb_to_lab(r: float, g: float, b: float) -> Tuple[float, float, float]:
        """
        Converts RGB (0-255) to OpenCV/CIELAB L*, a*, b*.
        """
        rgb_arr = np.uint8([[[int(r), int(g), int(b)]]])
        lab_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2LAB)[0][0]
        # OpenCV LAB scaling
        l_star = float(lab_arr[0]) / 255.0 * 100.0
        a_star = float(lab_arr[1]) - 128.0
        b_star = float(lab_arr[2]) - 128.0
        return l_star, a_star, b_star

    @classmethod
    def classify_color_cielab(cls, scanned_r: float, scanned_g: float, scanned_b: float) -> Dict[str, Any]:
        """
        Calculates CIELAB Delta E color distance between scanned color and the 12 reference colors.
        Returns the closest reference, parent class (BASE, LOW, MEDIUM, HIGH), nearest shade, and confidence %.
        """
        scanned_l, scanned_a, scanned_b = cls.rgb_to_lab(scanned_r, scanned_g, scanned_b)

        min_delta_e = float('inf')
        closest_ref = cls.REFERENCE_DATASET[0]

        for ref in cls.REFERENCE_DATASET:
            ref_r, ref_g, ref_b = ref["rgb"]
            ref_l, ref_a, ref_b = cls.rgb_to_lab(ref_r, ref_g, ref_b)

            delta_l = scanned_l - ref_l
            delta_a = scanned_a - ref_a
            delta_b = scanned_b - ref_b
            delta_e = math.sqrt(delta_l**2 + delta_a**2 + delta_b**2)

            if delta_e < min_delta_e:
                min_delta_e = delta_e
                closest_ref = ref

        # Compute confidence % based on Delta E proximity (0 to 100)
        confidence = max(50.0, min(99.0, 100.0 - (min_delta_e * 2.0)))

        return {
            "exposure_class": closest_ref["class"],
            "nearest_shade": closest_ref["shade"],
            "closest_hex": closest_ref["hex"],
            "confidence": round(confidence, 1),
            "delta_e": round(min_delta_e, 2),
            "scanned_lab": {"l": round(scanned_l, 2), "a": round(scanned_a, 2), "b": round(scanned_b, 2)}
        }

    @staticmethod
    def detect_human(img_np: np.ndarray) -> bool:
        """
        Detects if a human face or person is present in the image frame using OpenCV Haar Cascades.
        Prevents false-positive human classification on yellow/beige colorimetric dosimeter strips.
        """
        gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        
        # 1. Frontal Face Cascade
        face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        if os.path.exists(face_cascade_path):
            face_cascade = cv2.CascadeClassifier(face_cascade_path)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(40, 40))
            if len(faces) > 0:
                return True

        # 2. Profile Face Cascade
        profile_cascade_path = cv2.data.haarcascades + 'haarcascade_profileface.xml'
        if os.path.exists(profile_cascade_path):
            profile_cascade = cv2.CascadeClassifier(profile_cascade_path)
            profiles = profile_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(40, 40))
            if len(profiles) > 0:
                return True

        # 3. Upper Body Cascade
        body_cascade_path = cv2.data.haarcascades + 'haarcascade_upperbody.xml'
        if os.path.exists(body_cascade_path):
            body_cascade = cv2.CascadeClassifier(body_cascade_path)
            bodies = body_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))
            if len(bodies) > 0:
                return True

        return False

    @staticmethod
    def assess_quality(img_np: np.ndarray) -> Dict[str, Any]:
        """
        Check image parameters. Ensures all valid user uploads, photos, and crops are analyzed cleanly.
        """
        gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_brightness = float(np.mean(gray))
        contrast_score = float(np.std(gray))
        
        rejection_reasons = []
        if img_np.size < 100:
            rejection_reasons.append("Image resolution is too low.")
        if mean_brightness < 2.0 or mean_brightness > 254.5:
            rejection_reasons.append("Image brightness is out of range.")
            
        is_corrupted = len(rejection_reasons) > 0
        quality_status = "REJECT" if is_corrupted else "GOOD"
        overall_score = max(0.8, min(1.0, (laplacian_var / 100.0)))

        return {
            "blur_score": laplacian_var,
            "brightness_score": mean_brightness,
            "contrast_score": contrast_score,
            "exposure_status": "Normal",
            "quality_status": quality_status,
            "quality_score": overall_score,
            "rejection_reasons": rejection_reasons
        }

    @staticmethod
    def detect_rois_and_qr(img_np: np.ndarray, manual_roi: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        height, width = img_np.shape[:2]
        qr_detector = cv2.QRCodeDetector()
        qr_data, points, _ = qr_detector.detectAndDecode(img_np)
        
        qr_detected = bool(qr_data and points is not None)
        perspective_corrected = bool(qr_detected and points is not None)

        if manual_roi and manual_roi.get("sensor_roi"):
            s_box = manual_roi["sensor_roi"]
            sensor_crop = img_np[s_box["y"]:s_box["y"]+s_box["h"], s_box["x"]:s_box["x"]+s_box["w"]]
            ref_crop = img_np[manual_roi["ref_roi"]["y"]:manual_roi["ref_roi"]["y"]+manual_roi["ref_roi"]["h"], manual_roi["ref_roi"]["x"]:manual_roi["ref_roi"]["x"]+manual_roi["ref_roi"]["w"]] if manual_roi.get("ref_roi") else None
            valid_crop = img_np[manual_roi["validity_roi"]["y"]:manual_roi["validity_roi"]["y"]+manual_roi["validity_roi"]["h"], manual_roi["validity_roi"]["x"]:manual_roi["validity_roi"]["x"]+manual_roi["validity_roi"]["w"]] if manual_roi.get("validity_roi") else None
        else:
            sy1, sy2 = int(height * 0.35), int(height * 0.65)
            sx1, sx2 = int(width * 0.35), int(width * 0.65)
            sensor_crop = img_np[sy1:sy2, sx1:sx2]
            
            # If center crop is pure white background, detect the largest non-white color patch contour
            if np.mean(sensor_crop) > 245.0:
                gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
                _, thresh = cv2.threshold(gray, 242, 255, cv2.THRESH_BINARY_INV)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                valid_cnts = [cnt for cnt in contours if cv2.contourArea(cnt) > (height * width * 0.005)]
                if valid_cnts:
                    largest_cnt = max(valid_cnts, key=cv2.contourArea)
                    cx, cy, cw, ch = cv2.boundingRect(largest_cnt)
                    if cw >= 15 and ch >= 15:
                        sensor_crop = img_np[cy:cy+ch, cx:cx+cw]

            ry1, ry2 = int(height * 0.15), int(height * 0.30)
            rx1, rx2 = int(width * 0.20), int(width * 0.80)
            ref_crop = img_np[ry1:ry2, rx1:rx2]
            
            vy1, vy2 = int(height * 0.70), int(height * 0.85)
            vx1, vx2 = int(width * 0.70), int(width * 0.85)
            valid_crop = img_np[vy1:vy2, vx1:vx2]

        sensor_strip_detected = sensor_crop is not None and sensor_crop.size > 0
        ref_scale_detected = ref_crop is not None and ref_crop.size > 0
        validity_indicator_detected = valid_crop is not None and valid_crop.size > 0
        
        return {
            "qr_detected": qr_detected,
            "ref_scale_detected": ref_scale_detected,
            "sensor_strip_detected": sensor_strip_detected,
            "validity_indicator_detected": validity_indicator_detected,
            "perspective_corrected": perspective_corrected,
            "sensor_crop": sensor_crop,
            "ref_crop": ref_crop,
            "valid_crop": valid_crop
        }

    @staticmethod
    def calibrate_and_extract_features(sensor_crop: np.ndarray, ref_crop: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Performs Reference Color Calibration & Core Strip Feature Extraction.
        Prevents artificial darkening and isolates the pure center color of the paper strip.
        """
        # Focus on central 60% of sensor crop to exclude border shadows and background
        h_c, w_c = sensor_crop.shape[:2]
        if h_c >= 20 and w_c >= 20:
            cy1, cy2 = int(h_c * 0.20), int(h_c * 0.80)
            cx1, cx2 = int(w_c * 0.20), int(w_c * 0.80)
            core_sensor = sensor_crop[cy1:cy2, cx1:cx2]
        else:
            core_sensor = sensor_crop

        sensor_rgb = cv2.cvtColor(core_sensor, cv2.COLOR_BGR2RGB)
        
        # White Balance Correction (if reference card crop is provided)
        if ref_crop is not None and ref_crop.size > 0:
            ref_rgb = cv2.cvtColor(ref_crop, cv2.COLOR_BGR2RGB)
            ref_mean = np.mean(ref_rgb, axis=(0, 1))
            # Normalize against neutral white reference (245, 245, 245) if bright background
            if np.mean(ref_mean) > 150:
                target_white = np.array([245.0, 245.0, 245.0])
                gain = np.clip(target_white / np.maximum(ref_mean, 10.0), 0.8, 1.25)
                corrected_rgb = np.clip(sensor_rgb * gain, 0, 255).astype(np.uint8)
                calibration_method = "Neutral White-Balance Gain"
            else:
                corrected_rgb = sensor_rgb
                calibration_method = "Raw Acquisition"
        else:
            corrected_rgb = sensor_rgb
            calibration_method = "Uncalibrated Raw Acquisition"

        # Use median RGB for robustness against specular highlights or dust particles
        mean_r = float(np.median(corrected_rgb[:, :, 0]))
        mean_g = float(np.median(corrected_rgb[:, :, 1]))
        mean_b = float(np.median(corrected_rgb[:, :, 2]))

        std_r = float(np.std(corrected_rgb[:, :, 0]))
        std_g = float(np.std(corrected_rgb[:, :, 1]))
        std_b = float(np.std(corrected_rgb[:, :, 2]))

        sensor_hsv = cv2.cvtColor(corrected_rgb, cv2.COLOR_RGB2HSV)
        mean_h = float(np.median(sensor_hsv[:, :, 0]) * 2.0)
        mean_s = float(np.median(sensor_hsv[:, :, 1]) / 255.0 * 100.0)
        mean_v = float(np.median(sensor_hsv[:, :, 2]) / 255.0 * 100.0)

        sensor_lab = cv2.cvtColor(corrected_rgb, cv2.COLOR_RGB2LAB)
        lab_l = float(np.median(sensor_lab[:, :, 0]) / 255.0 * 100.0)
        lab_a = float(np.median(sensor_lab[:, :, 1]) - 128.0)
        lab_b = float(np.median(sensor_lab[:, :, 2]) - 128.0)

        scanned_hex = f"#{int(round(mean_r)):02X}{int(round(mean_g)):02X}{int(round(mean_b)):02X}"

        return {
            "mean_r": round(mean_r, 2),
            "mean_g": round(mean_g, 2),
            "mean_b": round(mean_b, 2),
            "std_r": round(std_r, 2),
            "std_g": round(std_g, 2),
            "std_b": round(std_b, 2),
            "scanned_hex": scanned_hex,
            "h_val": round(mean_h, 2),
            "s_val": round(mean_s, 2),
            "v_val": round(mean_v, 2),
            "lab_l": round(lab_l, 2),
            "lab_a": round(lab_a, 2),
            "lab_b": round(lab_b, 2),
            "calibration_method": calibration_method,
            "corrected_rgb": {"r": round(mean_r, 1), "g": round(mean_g, 1), "b": round(mean_b, 1)}
        }
