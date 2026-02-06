import hashlib
from sqlalchemy import create_engine, Column, Integer, String, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from contextlib import contextmanager

# ------------------------------
# Password Encryption
# ------------------------------
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ------------------------------
# Database tables
# ------------------------------
Base = declarative_base()
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)  # now stores hashed password
    role = Column(String, default="Student")  # Student or Teacher


# ------------------------------
# Database manager
# ------------------------------
class DBManager:
    def __init__(self, database_url):
        # Initialize engine
        self.engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False}
        )
        
        self.SessionLocal = sessionmaker(
            bind=self.engine, 
            autocommit=False, 
            autoflush=False
        )

        # Create tables if they don't exist
        Base.metadata.create_all(bind=self.engine)

    # Yields db session, and commits after context scope ends
    @contextmanager
    def session_scope(self):
        db = self.SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    # Creates a new user if the username does not exist
    def user_signup(self, username, password, role):
        try:
            with self.session_scope() as db:
                # Check if user already exists
                existing_user = db.query(User).filter(User.username == username).first()
                if existing_user:
                    return False

                # Hash and Create
                hashed_pw = hash_password(password)
                db_user = User(
                    username=username,
                    password=hashed_pw,
                    role=role
                )

                db.add(db_user)
                
                return True

        except Exception as e:
            print(f"Database error during signup: {e}")
            return False
    
    # Validates credentials, returns the user role or None otherwise
    def user_signin(self, username, password):
        with self.session_scope() as db:
            # Check if user exists
            user = db.query(User).filter(User.username == username).first()
            if not user:
                return None

            # Check if hashed password matches
            hashed_input = hash_password(password)
            if user.password != hashed_input:
                return None

            return user.role