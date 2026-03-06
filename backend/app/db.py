import hashlib
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager
from openai import OpenAI

TITLE_PROMPT_TEMPLATE = """
### INSTRUCTIONS:
Act as a title generator.
Summarize the following user query into a concise, descriptive title of 5 words or less. 
Do not use punctuation, do not use quotes, and do not prefix the response with 'Title:'.
Provide only the title text.

---
### QUESTION:
{question}

---
### RESPONSE:
"""


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

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String, default="New Chat")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), index=True)
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

        self.client = OpenAI()

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
    # Retrieve some number of most recent chat history
    # if num_chats is blank, get all chats
    # ------------------------------
    def retrieve_history(self, chat_id: int, num_chats: int = None):
        if num_chats and num_chats <= 0:
            return []

        with self.session_scope() as db:
            query = (
                db.query(ChatMessage)
                .filter(ChatMessage.chat_id == chat_id)
                .order_by(ChatMessage.id.desc())
            )

            if num_chats is not None:
                query = query.limit(num_chats)

            messages = query.all()

            return [
                {"role": msg.role, "content": msg.content}
                for msg in reversed(messages)
            ]
        
    # ------------------------------
    # Retrieve chats for a user (newest first)
    # ------------------------------
    def retrieve_chats(self, username: str):
        with self.session_scope() as db:
            existing_user = db.query(User).filter(User.username == username).first()
            if not existing_user:
                return []
            user_id = existing_user.id

            chats = (
                db.query(Chat.id, Chat.title)
                .filter(Chat.user_id == user_id)
                .order_by(Chat.id.desc())
                .all()
            )

            return [(chat_id, chat_title) for chat_id, chat_title in chats]

    # ------------------------------
    # Create a new chat
    # ------------------------------
    def create_chat(self, username: str, message: str):
        try:
            with self.session_scope() as db:
                user = db.query(User).filter(User.username == username).first()
                if not user:
                    return None

                title_response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": TITLE_PROMPT_TEMPLATE.format(
                        question=message
                    )}],
                    temperature=0
                )
                chat_title = (title_response.choices[0].message.content or "New Chat").strip()

                new_chat = Chat(
                    user_id=user.id,
                    title=chat_title
                )
                db.add(new_chat)
                db.flush()
                chat_id = new_chat.id
                
            return chat_id
        except Exception as e:
            print(f"Database error during chat creation: {e}")
            return None