import hashlib
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
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
    password = Column(String)
    role = Column(String, default="Student")

    # One to Many relationship of User -> ChatRecord
    chats = relationship("ChatRecord", back_populates="user")


class ChatRecord(Base):
    __tablename__ = "chatRecords"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="chats")
    messages = relationship("ChatMetadata", back_populates="chat", cascade="all, delete-orphan")


class ChatMetadata(Base):
    __tablename__ = "chatMetadata"

    id = Column(Integer, primary_key=True)
    role = Column(String)  # user or ai
    content = Column(String)

    chat_id = Column(Integer, ForeignKey("chatRecords.id"), nullable=False)
    chat = relationship("ChatRecord", back_populates="messages")


# ------------------------------
# Database manager
# ------------------------------
class DBManager:
    def __init__(self, database_url):
        self.engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False}
        )

        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autocommit=False,
            autoflush=False
        )

        Base.metadata.create_all(bind=self.engine)

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

    def get_user_by_username(self, username):
        with self.session_scope() as db:
            return db.query(User).filter(User.username == username).first()

    def user_signup(self, username, password, role):
        try:
            with self.session_scope() as db:
                existing_user = db.query(User).filter(User.username == username).first()
                if existing_user:
                    return False

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

    def user_signin(self, username, password):
        with self.session_scope() as db:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                return None

            hashed_input = hash_password(password)
            if user.password != hashed_input:
                return None

            return user.role
