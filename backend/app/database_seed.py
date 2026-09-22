import datetime
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base, SessionLocal
from app.models.domain import Worker, WorkerDevice, Scan
from app.auth.security import hash_device_token

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Re-seeding database tables for Worker Web Application...")
        db.query(Scan).delete()
        db.query(WorkerDevice).delete()
        db.query(Worker).delete()
        db.commit()

        # Create Demo Worker Accounts
        workers_info = [
            ("Arun Kumar", "WRK001", "Production", "+1-555-0101", "demo_dev_tok_arun"),
            ("Priya", "WRK002", "Maintenance", "+1-555-0102", "demo_dev_tok_priya"),
            ("Ganthimathi", "WRK003", "Chemical Processing", "+1-555-0103", "demo_dev_tok_ganthi"),
        ]

        worker_models = []
        device_models = []

        for name, code, dept, phone, tok in workers_info:
            worker = Worker(
                name=name,
                worker_code=code,
                department=dept,
                phone=phone,
                is_active=True
            )
            db.add(worker)
            db.commit()
            db.refresh(worker)

            dev = WorkerDevice(
                worker_id=worker.id,
                device_id=f"device-{code.lower()}",
                device_token_hash=hash_device_token(tok),
                platform="web",
                is_active=True
            )
            db.add(dev)
            db.commit()
            db.refresh(dev)

            worker_models.append(worker)
            device_models.append(dev)

        # Create Sample Historical Scans
        now = datetime.datetime.utcnow()
        scans_data = [
            # Arun Kumar (WRK001)
            (worker_models[0].id, device_models[0].id, "LOW", "LIGHT", "#CEE5DB", "#D1E7DD", 96.4, 99.7, 1.24, "MATCH", now - datetime.timedelta(minutes=15)),
            (worker_models[0].id, device_models[0].id, "BASE", "ORIGINAL", "#F3EDE0", "#F3EDE0", 98.1, 99.8, 0.35, "MATCH", now - datetime.timedelta(hours=2)),
            (worker_models[0].id, device_models[0].id, "LOW", "LIGHT", "#F3E7B5", "#F3E7B5", 97.2, 99.6, 0.85, "MATCH", now - datetime.timedelta(days=1)),

            # Priya (WRK002)
            (worker_models[1].id, device_models[1].id, "HIGH", "ORIGINAL", "#4B245C", "#4B245C", 94.1, 99.2, 1.85, "MOVE TO SAFER PLACE", now - datetime.timedelta(minutes=10)),
            (worker_models[1].id, device_models[1].id, "LOW", "LIGHT", "#F3E7B5", "#F3E7B5", 97.0, 99.6, 0.80, "MATCH", now - datetime.timedelta(days=1)),

            # Ganthimathi (WRK003)
            (worker_models[2].id, device_models[2].id, "LOW", "LIGHT", "#CEE5DB", "#D1E7DD", 96.4, 99.7, 1.24, "MATCH", now - datetime.timedelta(minutes=20)),
            (worker_models[2].id, device_models[2].id, "BASE", "ORIGINAL", "#F3EDE0", "#F3EDE0", 98.2, 99.8, 0.45, "MATCH", now - datetime.timedelta(hours=3)),
        ]

        for w_id, d_id, exp, shade, s_hex, r_hex, conf, ml_conf, de, msg, ts in scans_data:
            scan = Scan(
                worker_id=w_id,
                device_id=d_id,
                timestamp=ts,
                exposure_class=exp,
                nearest_shade=shade,
                scanned_hex=s_hex,
                reference_hex=r_hex,
                confidence=conf,
                ml_confidence=ml_conf,
                delta_e=de,
                model_used="RandomForest",
                message=msg,
                scientific_notice="SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.",
                image_path="/uploads/sample_scan.jpg",
                created_at=ts
            )
            db.add(scan)

        db.commit()
        print("Database successfully seeded for Worker Web Application!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
