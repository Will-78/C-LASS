import pytest
from fastapi.testclient import TestClient
from app.main import app, db_manager


# Create reusable test client that starts a fresh FastAPI instance for each test
@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

# Test case for successful signup, mocks db to return true verifies API returns success response
def test_signup_success(client, monkeypatch):
    def mock_user_signup(username, password, role):
        return True  # pretend signup worked

    # replace real DB call with mock
    monkeypatch.setattr(db_manager, "user_signup", mock_user_signup)

    # Send a POST request to /signup endpoint with user credentials to test API response
    response = client.post(
        "/signup",
        json={
            "username": "testuser",
            "password": "123",
            "role": "Student"
        }
    )

    # verify unauthorized response
    assert response.status_code == 200

    # parse response JSON and verify correct error message
    data = response.json()
    assert data["message"] == "User signed up successfully"
    assert data["role"] == "Student"

# Test case for signup failure, mocks db to return false (user already exists), verifies API returns 400 error with message
def test_signup_failure(client, monkeypatch):

    # mock DB function to pretend signup fails
    def mock_user_signup(username, password, role):
        return False  # simulate duplicate user

    # replace real DB call with mock
    monkeypatch.setattr(db_manager, "user_signup", mock_user_signup)

    # send signup request
    response = client.post(
        "/signup",
        json={
            "username": "testuser",
            "password": "123",
            "role": "Student"
        }
    )

    #check API returns correct error status
    assert response.status_code == 400

    # parse response and verify correct error message
    data = response.json()
    assert data["detail"] == "Username already exists"

# Test case verifying that if no role is provided, the role defaults to "Student"
def test_signup_default_role_logic(client, monkeypatch):

    # stores the role passed from the backend into the mocked db to verify later
    captured_role = None

    # mock db function and capture role passed into it
    def mock_user_signup(username, password, role):
        nonlocal captured_role
        captured_role = role
        return True

    # replace db func with mock
    monkeypatch.setattr(db_manager, "user_signup", mock_user_signup)

    # signup request without role field
    response = client.post(
        "/signup",
        json={
            "username": "defaultRoleUser",
            "password": "123"
        }
    )

    # see if request succeeded
    assert response.status_code == 200

    # parse response
    data = response.json()

    # check the role
    assert data["role"] == "Student"

    # check backend actually passed default role into db
    assert captured_role == "Student"


# Test case for sign in success. Mocks db returning student role and verifies successful login response
def test_signin_success(client, monkeypatch):

    # mock DB signin to return a role
    def mock_user_signin(username, password):
        return "Student"

    # replace real db call
    monkeypatch.setattr(db_manager, "user_signin", mock_user_signin)

    # send signin request
    response = client.post(
        "/signin",
        json={
            "username": "testuser",
            "password": "123"
        }
    )

    # check if API returned success
    assert response.status_code == 200

    # parse response and verify role and success message
    data = response.json()
    assert data["role"] == "Student"
    assert data["message"] == "Signed in successfully"

# Test case for sign in failure, mocks db returning None, and verifies if API returns 401 (unauthorized)
def test_signin_failure(client, monkeypatch):

    # mock db signin to return None
    def mock_user_signin(username, password):
        return None

    # replace real db call
    monkeypatch.setattr(db_manager, "user_signin", mock_user_signin)

    # send signin request with wrong username and password
    response = client.post(
        "/signin",
        json={
            "username": "wrong",
            "password": "wrong"
        }
    )

    # check if API returns unauthorized error
    assert response.status_code == 401

    # parse response and verify correct error message
    data = response.json()
    assert data["detail"] == "Invalid username or password"