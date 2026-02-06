import "@testing-library/dom";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Reset modules before each test to ensure clean mocking
beforeEach(() => {
    vi.resetModules();
});

// Mock Next.js modules
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        prefetch: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
}));

// Mock next/cache
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

// Mock Clerk - always return authenticated user
vi.mock("@clerk/nextjs/server", () => ({
    auth: vi.fn().mockResolvedValue({ userId: "test-user-id" }),
    currentUser: vi.fn().mockResolvedValue({
        id: "test-user-id",
        firstName: "Test",
        lastName: "User",
    }),
}));

vi.mock("@clerk/nextjs", () => ({
    auth: vi.fn().mockResolvedValue({ userId: "test-user-id" }),
    currentUser: vi.fn().mockResolvedValue({
        id: "test-user-id",
        firstName: "Test",
        lastName: "User",
        emailAddresses: [{ emailAddress: "test@example.com" }],
    }),
    SignIn: () => null,
    SignUp: () => null,
    useAuth: () => ({
        isLoaded: true,
        isSignedIn: true,
        userId: "test-user-id",
    }),
    useUser: () => ({
        isLoaded: true,
        isSignedIn: true,
        user: {
            id: "test-user-id",
            firstName: "Test",
            lastName: "User",
        },
    }),
}));

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.OPENROUTER_API_KEY = "test-api-key";
process.env.OCR_SPACE_API_KEY = "test-ocr-key";
process.env.R2_ACCOUNT_ID = "test-account-id";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
