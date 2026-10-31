import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { notificationsApi, type AppNotification, type Inbox } from "../api/notificationsApi";
import { INTERVIEW_UPDATE_EVENT, timeAgo } from "../hooks/useNotifications";

vi.mock("../api/notificationsApi", () => ({
  notificationsApi: { inbox: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));
const toast = { info: vi.fn(), error: vi.fn(), success: vi.fn(), toast: vi.fn() };
vi.mock("../context/ToastContext", () => ({ useToast: () => toast }));

const api = vi.mocked(notificationsApi);

function note(overrides: Partial<AppNotification>): AppNotification {
  return {
    notification_id: 1,
    type: "interview_finished",
    title: "MARIA SANTOS finished the interview",
    message: "Their answers are being analysed.",
    link: "/patients/9",
    patient_id: 9,
    interview_link_id: 7,
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function inbox(items: AppNotification[]): Inbox {
  return { items, unread_count: items.filter((n) => !n.read_at).length };
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
}

function renderBell() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <NotificationBell />
      <Routes>
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route path="/sessions/:id" element={<p>Session review</p>} />
        <Route path="/patients/:id" element={<p>Patient page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.clearAllMocks();
  api.markRead.mockResolvedValue({ read: true });
  api.markAllRead.mockResolvedValue({ updated: 1 });
});
afterEach(() => vi.useRealTimers());

describe("NotificationBell", () => {
  test("shows the unread count; existing notifications don't pop toasts", async () => {
    api.inbox.mockResolvedValue(inbox([note({})]));
    renderBell();
    await flush();
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument();
    expect(toast.info).not.toHaveBeenCalled();
  });

  test("a patient finishing while you work → toast, badge, and lists refresh", async () => {
    api.inbox.mockResolvedValue(inbox([]));
    const onUpdate = vi.fn();
    window.addEventListener(INTERVIEW_UPDATE_EVENT, onUpdate);
    renderBell();
    await flush();

    api.inbox.mockResolvedValue(inbox([note({})]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000); // next poll
    });
    expect(toast.info).toHaveBeenCalledWith("MARIA SANTOS finished the interview");
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalled();
    window.removeEventListener(INTERVIEW_UPDATE_EVENT, onUpdate);
  });

  test("failed analysis is shown as an error toast", async () => {
    api.inbox.mockResolvedValue(inbox([]));
    renderBell();
    await flush();
    api.inbox.mockResolvedValue(inbox([note({ notification_id: 2, type: "analysis_failed", title: "Analysis didn't finish for MARIA SANTOS" })]));
    await act(async () => {
      window.dispatchEvent(new Event("focus")); // checks right away when you come back to the tab
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(toast.error).toHaveBeenCalledWith("Analysis didn't finish for MARIA SANTOS");
  });

  test("clicking a notification marks it read and opens its page", async () => {
    api.inbox.mockResolvedValue(inbox([note({ notification_id: 5, type: "results_ready", title: "Results ready for MARIA SANTOS", link: "/sessions/42" })]));
    renderBell();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(screen.getByText("Results ready for MARIA SANTOS"));
    await flush();
    expect(api.markRead).toHaveBeenCalledWith(5);
    expect(screen.getByText("Session review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument(); // badge cleared
  });

  test("mark all as read clears the badge", async () => {
    api.inbox.mockResolvedValue(inbox([note({ notification_id: 1 }), note({ notification_id: 2 })]));
    renderBell();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Notifications, 2 unread" }));
    fireEvent.click(screen.getByRole("button", { name: /Mark all as read/ }));
    await flush();
    expect(api.markAllRead).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  test("empty state explains what will appear", async () => {
    api.inbox.mockResolvedValue(inbox([]));
    renderBell();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText(/when a patient finishes an interview/)).toBeInTheDocument();
  });
});

describe("timeAgo", () => {
  test("formats recent times", () => {
    const now = new Date("2026-10-31T10:00:00Z");
    expect(timeAgo("2026-10-31T09:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-31T09:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-10-31T07:00:00Z", now)).toBe("3 h ago");
  });
});
