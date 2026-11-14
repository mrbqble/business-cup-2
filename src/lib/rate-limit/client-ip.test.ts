import { describe, expect, it } from "vitest";

import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1", "x-real-ip": "10.0.0.2" });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing or blank", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers({ "x-forwarded-for": " ", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("returns \"unknown\" when neither header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
