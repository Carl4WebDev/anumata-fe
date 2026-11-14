import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./LoginPage";

const login = vi.fn();
let authError: string | null = null;
vi.mock("../../context/users/useUser", () => ({
  useUser: () => ({ login, loading: false, error: authError }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route path="/admin" element={<p>Admin page</p>} />
        <Route path="/register" element={<p>Register page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  login.mockReset();
  authError = null;
});

describe("LoginPage", () => {
  test("uses the Amumata name and the shared layout", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getAllByText("Amumata").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Anumata/)).not.toBeInTheDocument();
  });

  const signedIn = (role: string) => ({ ok: true, data: { token: "t", user: { id: 1, email: "ana@clinic.ph", name: "Ana", role, profileImage: null } } });

  test("logs in and goes to the dashboard", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(signedIn("THERAPIST"));
    renderPage();
    await user.type(screen.getByLabelText("Email"), "ana@clinic.ph");
    await user.type(screen.getByLabelText("Password"), "Kalamansi#Tree8");
    await user.click(screen.getByRole("button", { name: /Log in/ }));
    expect(login).toHaveBeenCalledWith("ana@clinic.ph", "Kalamansi#Tree8");
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  test("an admin goes to the admin page", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(signedIn("ADMIN"));
    renderPage();
    await user.type(screen.getByLabelText("Email"), "admin@amumata.ph");
    await user.type(screen.getByLabelText("Password"), "Kalamansi#Tree8");
    await user.click(screen.getByRole("button", { name: /Log in/ }));
    expect(await screen.findByText("Admin page")).toBeInTheDocument();
  });

  test("password can be shown", async () => {
    const user = userEvent.setup();
    renderPage();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });

  test("shows the server's error", () => {
    authError = "Invalid email or password";
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  test("links to account creation", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("link", { name: "Create a therapist account" }));
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });
});
