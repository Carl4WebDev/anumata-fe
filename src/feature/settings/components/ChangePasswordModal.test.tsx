import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangePasswordModal from "./ChangePasswordModal";
import { authApi } from "../../../shared/api/authApi";

vi.mock("../../../shared/api/authApi", () => ({
  authApi: { changePassword: vi.fn() },
}));

const api = vi.mocked(authApi);
const context = { email: "maria.santos@clinic.ph", names: ["MARIA", null, "SANTOS"] };

function renderModal() {
  const onChanged = vi.fn();
  render(<ChangePasswordModal context={context} onClose={vi.fn()} onChanged={onChanged} />);
  return onChanged;
}

beforeEach(() => vi.clearAllMocks());

describe("ChangePasswordModal", () => {
  test("changes the password once current is given and the new one is strong and confirmed", async () => {
    const user = userEvent.setup();
    api.changePassword.mockResolvedValue({ status: "success", message: "ok", data: { message: "ok" } });
    const onChanged = renderModal();

    const submit = screen.getByRole("button", { name: "Change password" });
    await user.type(screen.getByLabelText("Current password"), "Old#Secret9x");
    await user.type(screen.getByLabelText("New password"), "Kalamansi#Tree8");
    expect(submit).toBeDisabled(); // not confirmed yet
    await user.type(screen.getByLabelText("Confirm new password"), "Kalamansi#Tree8");
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(api.changePassword).toHaveBeenCalledWith("Old#Secret9x", "Kalamansi#Tree8");
    expect(onChanged).toHaveBeenCalled();
  });

  test("simple passwords can't be submitted", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText("Current password"), "Old#Secret9x");
    await user.type(screen.getByLabelText("New password"), "password123");
    await user.type(screen.getByLabelText("Confirm new password"), "password123");
    expect(screen.getByRole("button", { name: "Change password" })).toBeDisabled();
    expect(screen.getByText("Not a common password").closest("li")).toHaveClass("text-slate-400");
  });

  test("passwords containing the user's name are rejected", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText("New password"), "Santos#Rule8");
    expect(screen.getByText("Doesn't contain your name or email").closest("li")).toHaveClass("text-slate-400");
  });

  test("mismatched confirmation is flagged", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText("New password"), "Kalamansi#Tree8");
    await user.type(screen.getByLabelText("Confirm new password"), "Kalamansi#Tree9");
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
  });

  test("shows the server's error, e.g. wrong current password", async () => {
    const user = userEvent.setup();
    api.changePassword.mockRejectedValue(new Error("Current password is incorrect."));
    const onChanged = renderModal();
    await user.type(screen.getByLabelText("Current password"), "wrong");
    await user.type(screen.getByLabelText("New password"), "Kalamansi#Tree8");
    await user.type(screen.getByLabelText("Confirm new password"), "Kalamansi#Tree8");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
