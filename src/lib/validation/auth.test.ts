import { describe, expect, it } from "vitest";
import {
  requestPasswordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./auth";

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "short1",
      confirmPassword: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "password123",
      confirmPassword: "password456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});

describe("signInSchema", () => {
  it("accepts a valid sign-in", () => {
    const result = signInSchema.safeParse({
      email: "person@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({
      email: "person@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("requestPasswordResetSchema", () => {
  it("accepts a valid email", () => {
    expect(requestPasswordResetSchema.safeParse({ email: "person@example.com" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid email", () => {
    expect(requestPasswordResetSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    const result = updatePasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = updatePasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password124",
    });
    expect(result.success).toBe(false);
  });
});
