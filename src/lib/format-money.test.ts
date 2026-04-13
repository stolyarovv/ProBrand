import { describe, expect, it } from "vitest";
import { formatMoney } from "./format-money";

describe("formatMoney (UI-формат сумм)", () => {
  it("null — тире", () => {
    expect(formatMoney(null, "BYN")).toBe("—");
  });

  it("число и валюта — ru-RU", () => {
    const s = formatMoney(30000, "BYN");
    expect(s).toContain("BYN");
    expect(s).toMatch(/30/);
  });
});
