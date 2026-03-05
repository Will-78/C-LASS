import hashlib
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager

# ------------------------------
# Database tables
# ------------------------------
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)  # hashed password
    role = Column(String, default="Student")  # Student or Teacher


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, index=True)
    role = Column(String, nullable=False)  # user or assistant
    content = Column(String, nullable=False)


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

    # ------------------------------
    # Password hashing
    # ------------------------------
    def hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    # ------------------------------
    # User signup
    # ------------------------------
    def user_signup(self, username, password, role):
        try:
            with self.session_scope() as db:
                existing_user = db.query(User).filter(User.username == username).first()
                if existing_user:
                    return False

                hashed_pw = self.hash_password(password)

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

    # ------------------------------
    # User signin
    # ------------------------------
    def user_signin(self, username, password):
        with self.session_scope() as db:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                return None

            hashed_input = self.hash_password(password)
            if user.password != hashed_input:
                return None

            return user.role

    # ------------------------------
    # Log chat message
    # ------------------------------
    def log_message(self, role: str, content: str, chat_id: int):
        with self.session_scope() as db:
            message = ChatMessage(
                role=role,
                content=content,
                chat_id=chat_id
            )
            db.add(message)

    # ------------------------------
    # Retrieve chat history
    # ------------------------------
    def retrieve_history(self, chat_id: int):
        with self.session_scope() as db:
            messages = (
                db.query(ChatMessage)
                .filter(ChatMessage.chat_id == chat_id)
                .order_by(ChatMessage.id)
                .all()
            )

            return [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]