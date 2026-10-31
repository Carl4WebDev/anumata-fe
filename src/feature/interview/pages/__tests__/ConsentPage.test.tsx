import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConsentPage from "../ConsentPage";

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/interview/tok/consent"]}>
      <Routes>
        <Route path="/interview/:token/consent" element={<ConsentPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ConsentPage — live captions notice", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("by default, says the voice goes to Google or Microsoft for captions", () => {
    renderPage();
    expect(screen.getByText(/sends your voice to Google or Microsoft/i)).toBeInTheDocument();
  });

  test("with browser captions turned off, says the voice stays on Amumata's own server", () => {
    vi.stubEnv("VITE_CAPTION_ENGINE", "whisper");
    renderPage();
    expect(screen.getByText(/not sent to Google or Microsoft/i)).toBeInTheDocument();
    expect(screen.queryByText(/sends your voice to Google or Microsoft/i)).not.toBeInTheDocument();
  });
});
