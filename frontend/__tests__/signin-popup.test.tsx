// Import testing tools from React Testing Lib
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// import react
import React from "react";

//import testing component
import SignInPopup from "../app/components/signin-popup";

// Global mocks: 
// mock fetch so no real API calls are made - replaces real API calls with a fake func
global.fetch = jest.fn() as jest.Mock;

// mock alert too, to verify error handling
window.alert = jest.fn();

// Test constants
const mockOnClose = jest.fn();
const mockSetUser = jest.fn();
const mockSetRole = jest.fn();

// test setup
beforeEach(() => {
  // reset all mocks between tests
  jest.clearAllMocks();

  // mock localStorage func so no real browser storage used during tests
  // so we can verify that our code calls localStorage without all the data
  Storage.prototype.setItem = jest.fn();
  Storage.prototype.removeItem = jest.fn();

  // reset storage so tests don't leak data
  localStorage.clear();
});


// test suite - groups SignInPopup tests together so we don't have to call render every time
describe("SignInPopup", () => {

  // helper func to render component
  const renderComponent = () =>
    render(
      <SignInPopup
        onClose={mockOnClose}
        currentUser={null}
        setCurrentUser={mockSetUser}
        setUserRole={mockSetRole}
      />
    );

  // Test Case, mocks successful sign in, and it tests if frontend correctly calls API and updates user state on success
  it("signs in user successfully", async () => {

    // mock one successful backend /signin response
    (fetch as jest.Mock).mockResolvedValueOnce({
    
        // fake response object
      ok: true,
      json: async () => ({ role: "Student" }),
    });

    // render SignInPopup in a test env
    renderComponent();

    // simulate click sign in form
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // simulate filling username and password with fireEvent.change
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "colton" },
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123" },
    });

    // submit sign in form
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // verify successful flow with expect and toHaveBeenCalledWith/toHaveBeenCalled
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/signin", expect.any(Object));
      expect(mockSetUser).toHaveBeenCalledWith("colton");
      expect(mockSetRole).toHaveBeenCalledWith("Student");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Test case, mocks successful sign up and verifies user is created, state is updated, and popup closes correctly
  it("signs up user successfully", async () => {

    // mock one successful backend /signup response 
    (fetch as jest.Mock).mockResolvedValueOnce({
        
    // fake response object returned
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    // render SignInPopup component in a fresh test env
    renderComponent();

    // open sign up menu and click student
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    fireEvent.click(screen.getByRole("button", { name: "Student" }));

    // simulate filling username and pass inputs with fireevent.change
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "newuser" },
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123" },
    });

    // simulate submitting form and sign up with fireEvent.click
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    // verify successful flow with expect and toHaveBeenCalledWith/toHaveBeenCalled
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/signup", expect.any(Object));
      expect(mockSetUser).toHaveBeenCalledWith("newuser");
      expect(mockSetRole).toHaveBeenCalledWith("Student");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Test case, failed backend /signin response (invalid credentials)
  // verify frontend shows an alert and does not log the user in when signin fails
  it("shows alert on failed login", async () => {

    // mock backend rejecting login
    (fetch as jest.Mock).mockResolvedValueOnce({
      
      // mocked fetch response object for a failed /signin
        ok: false,
      json: async () => ({ detail: "Invalid login" }),
    });

    // render SignInPopup 
    renderComponent();

    // simulate click sign in button
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // simulate typing an incorrect username and password with fireevent.change
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "wrong" },
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });

    // simulate clicking sign in 
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // verify alert triggered with expect toHaveBeenCalled
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  // Test case, mocks a failed sign up, verifies if alert happens
  it("shows alert on failed signup", async () => {

    // mock failed backend /signup response (username already exists)
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Username already exists" }),
    });

    // render SignInPopup 
    renderComponent();

    // simulate clicking sign up and student with fireEvent.click
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    fireEvent.click(screen.getByRole("button", { name: "Student" }));

    // simulate typing existing username and password with fireevent.change
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "existinguser" },
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123" },
    });

    // simulate clicking sign up button
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    // verify if alert triggered, with toHaveBeenCalled
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  // Test case, mocks a failed /signin request, like a network crash, and verifies the frontend shows alert
  it("shows alert on sign in network error", async () => {

    // simulate network failure
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    // render SignInPopup
    renderComponent();

    // open sign in form with fireEvent.click
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // simulate username and password input with fireEvent.change
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "colton" },
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123" },
    });

    // simulate sign in button press with fireEvent.click
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // verify catch block triggers alert with expect toHaveBeenCalled
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  // Test case, mocks failed /signup request (network error), and verifies frontend shows alert
  it("shows alert on sign up network error", async () => {

    // mock fetch throwing network error instead of returning a response
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    // render SignInPopup component
    renderComponent();

    // simulate clicking sign up and student
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    fireEvent.click(screen.getByRole("button", { name: "Student" }));

    // simulate typing in a username and password
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "newuser" },
    });

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123" },
    });

    // simulate clicking sign up button
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    // verify catch block triggers alert
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

});