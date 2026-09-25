import { describe, expect, it, vi, beforeEach } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("resend", () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

describe("P0-6 shipped-email content — rendering only, never actually sent in this test", () => {
  beforeEach(() => {
    sendMock.mockClear();
    vi.resetModules();
    process.env.RESEND_API_KEY = "test_key_never_sent";
    process.env.NEXT_PUBLIC_APP_URL = "https://solo.snaplinkmedia.com";
  });

  it("gives actionable activation steps instead of the old dead-end 'tap to activate' line", async () => {
    const { notifications } = await import("@/lib/providers");
    await notifications.customerShipped({ orderNumber: "SL-TEST-0001", email: "buyer@example.com", tracking: "1Z999AA10123456784" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const text = sendMock.mock.calls[0][0].text as string;
    expect(text).toContain("Sign in to SnapLink");
    expect(text).toContain("My Hardware");
    expect(text).toContain("tap your SnapLink to begin activation");
    expect(text).toContain("1Z999AA10123456784");
  });

  it("uses the existing canonical NEXT_PUBLIC_APP_URL config, never a hardcoded host", async () => {
    const { notifications } = await import("@/lib/providers");
    await notifications.customerShipped({ orderNumber: "SL-TEST-0002", email: "buyer@example.com" });
    const text = sendMock.mock.calls[0][0].text as string;
    expect(text).toContain("https://solo.snaplinkmedia.com/app/hardware");
    expect(text).not.toMatch(/localhost/);
  });

  it("omits the app link entirely (rather than fabricating a host) when NEXT_PUBLIC_APP_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.resetModules();
    const { notifications } = await import("@/lib/providers");
    await notifications.customerShipped({ orderNumber: "SL-TEST-0003", email: "buyer@example.com" });
    const text = sendMock.mock.calls[0][0].text as string;
    expect(text).not.toMatch(/localhost/);
    expect(text).not.toMatch(/undefined/);
  });
});
