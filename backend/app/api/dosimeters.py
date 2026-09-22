from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.domain import Dosimeter, DosimeterBatch
from app.schemas.schemas import DosimeterOut, DosimeterBase
from app.auth.security import get_current_user, User

router = APIRouter(prefix="/dosimeters", tags=["Dosimeter Inventory"])

@router.get("", response_model=List[DosimeterOut])
def list_dosimeters(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Dosimeter).order_by(Dosimeter.dosimeter_code).all()

@router.post("", response_model=DosimeterOut)
def create_dosimeter(dosimeter_in: DosimeterBase, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Dosimeter).filter(Dosimeter.dosimeter_code == dosimeter_in.dosimeter_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Dosimeter code {dosimeter_in.dosimeter_code} already exists.")
    
    dosimeter = Dosimeter(**dosimeter_in.dict())
    db.add(dosimeter)
    db.commit()
    db.refresh(dosimeter)
    return dosimeter
