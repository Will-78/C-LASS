#import pytest and fastapi for testing framework and API requests
import pytest
from fastapi.testclient import TestClient

# import FastAPI app and db manager
from app.main import app, db_manager
from app.db import Base, User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# define test database file
TEST_DB_URL = "sqlite:///./test_auth.db"

# create test db engine
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False}
)

# create a new session where you can connect to db for these tests
TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False
)

# override production db with test db
db_manager.engine = test_engine
db_manager.SessionLocal = TestingSessionLocal

# recreate tables fresh for testing

# delete everything in db
Base.metadata.drop_all(bind=test_engine)

# create all tables from db.py if they don't already exist
Base.metadata.create_all(bind=test_engine)

# create reusable test setup object
@pytest.fixture
def client():
    # create test client to send fake API requests
    with TestClient(app) as c:
        yield c

# Integration test 1: Testing if signup writes user to database
def test_signup_writes_user_to_db(client):
     # tests if API signup writes a new user record to the DB

    # simulate frontend sending a POST request to /signup endpoint
    response = client.post(
        "/signup",
        json={
            # make a test username, password, and role to be stored
            "username": "testuser",
            "password": "testpass",
            "role": "Student"
        }
    )

    # verify API response, fail if wrong
    assert response.status_code == 200
    assert response.json()["role"] == "Student"

    # check db to confirm user was actually saved by /signup
    with db_manager.session_scope() as db:
        # query users table for the test user just created
        user = (
            db.query(User)
            .filter(User.username == "testuser")
            .first()
        )

        # verify user record exists in the db
        assert user is not None

        # verify correct username
        assert user.username == "testuser"

        # verify correct role
        assert user.role == "Student"


# Integration test 2: # Testing if /signin correctly authenticates a user using credentials stored in the database
def test_signin_reads_user_from_db(client):
    # tests signin flow by creating a user in the db and verifying the API authenticates them correctly

    # create user directly in DB with username, hashed password(hash_password from db.py), and role
    with db_manager.session_scope() as db:
        user = User(
            username="loginuser",
            password=db_manager.hash_password("password123"),
            role="Teacher"
        )
        #add user record to db session
        db.add(user)

    # attempt login through API
    response = client.post(
        "/signin",
        json={
            "username": "loginuser",
            "password": "password123"
        }
    )

    # verify login success 

    # confirm that the signin request was successful (200 for okay)
    assert response.status_code == 200

    # verify that backend returned correct user role from the db
    assert response.json()["role"] == "Teacher"


# Integration test 3: # Testing if the /signup endpoint rejects duplicate usernames
def test_signup_rejects_duplicate_username(client):
    # Ensures duplicate usernames are rejected on signup

    # first signup should succeed
    response1 = client.post(
        "/signup",
        json={
            "username": "duplicateUser",
            "password": "pass123",
            "role": "Student"
        }
    )

    # confirm first user is created successfully, fail if wrong
    assert response1.status_code == 200

    # second signup with same username should be rejected by backend
    response2 = client.post(
        "/signup",
        json={
            "username": "duplicateUser",
            "password": "pass123",
            "role": "Student"
        }
    )

    # check that the request fails with a 400 error, if not, fail/stop test
    assert response2.status_code == 400

    # verify the API returns correct error message for duplicate usernames
    assert response2.json()["detail"] == "Username already exists"