// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  LOCALE_COOKIE,
  LOCALE_NAME_KEY,
  defaultLocale,
  locales,
  setLocaleCookie,
} from "./locale";

afterEach(() => {
  document.cookie = `${LOCALE_COOKIE}=; Max-Age=0; path=/`;
});

describe("locale config", () => {
  it("supports Assamese, Hindi and English with Assamese as default", () => {
    expect([...locales]).toEqual(["as", "hi", "en"]);
    expect(defaultLocale).toBe("as");
  });

  it("maps each locale to a screen-reader name key", () => {
    expect(LOCALE_NAME_KEY.as).toBe("assamese");
    expect(LOCALE_NAME_KEY.hi).toBe("hindi");
    expect(LOCALE_NAME_KEY.en).toBe("english");
  });

  it("persists the chosen locale via the shared cookie", () => {
    setLocaleCookie("hi");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=hi`);
  });
});
