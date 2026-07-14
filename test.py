_SALT = "adwise_salt_v1"
 
def hash_password(password: str) -> str:
    return hashlib.sha256(f"{_SALT}{password}".encode()).hexdigest()

def verify_password(plain: str, stored: str) -> bool:
    return hash_password(plain) == stored
@app.post("/auth/login", tags=["Auth"])
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.username == creds.username).first()
    if not db_user or not verify_password(creds.password, db_user.password_hash):
        raise HTTPException(status_code=401,
                            detail="Invalid username or password.")
    return {
        "id": db_user.id, "username": db_user.username,
        "first_name": db_user.first_name, "is_admin": db_user.is_admin,
        "preferences": db_user.preferences,
    }
