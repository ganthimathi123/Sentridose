from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.domain import User
from app.schemas.schemas import SupervisorRegisterRequest, LoginRequest, LoginResponse, UserResponse
from app.core.auth import hash_password, verify_password, create_access_token, get_current_supervisor

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/has-supervisor")
def check_has_supervisor(db: Session = Depends(get_db)):
    """Check if a Supervisor account already exists in the system."""
    existing_sup = db.query(User).filter(User.role == "SUPERVISOR", User.is_active == True).first()
    return {"has_supervisor": existing_sup is not None}

@router.post("/register", response_model=LoginResponse)
def register_supervisor(request: SupervisorRegisterRequest, db: Session = Depends(get_db)):
    """
    First-Time Supervisor Registration.
    Constraint: Exactly ONE Supervisor account allowed.
    If a Supervisor account already exists, registration is rejected.
    """
    # 1. Single Supervisor Constraint Check
    existing_sup = db.query(User).filter(User.role == "SUPERVISOR", User.is_active == True).first()
    if existing_sup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supervisor account already exists. Please log in."
        )

    # 2. Validate Password Match
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    email_clean = request.email.strip().lower()

    # 3. Create Supervisor User
    new_user = User(
        name=request.name.strip(),
        email=email_clean,
        password_hash=hash_password(request.password),
        role="SUPERVISOR",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Generate JWT Token
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "id": new_user.id})

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=new_user.id,
            name=new_user.name,
            role=new_user.role
        )
    )

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Supervisor Login Endpoint.
    Verifies Email and Password against the active Supervisor account.
    """
    email_clean = request.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean, User.is_active == True).first()
    
    if not user:
        # Fallback query by role if single supervisor has different email format
        user = db.query(User).filter(User.role == "SUPERVISOR", User.is_active == True).first()
        if not user or user.email.lower() != email_clean:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="INVALID EMAIL OR PASSWORD — Access denied."
            )
            
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID EMAIL OR PASSWORD — Access denied."
        )
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            role=user.role
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_supervisor)):
    """Get authenticated supervisor profile."""
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        role=current_user.role
    )
