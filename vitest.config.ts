import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
        exclude: ["tests/e2e/**", "node_modules/**"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            include: ["lib/**/*.ts", "components/**/*.tsx"],
            exclude: ["**/*.d.ts", "node_modules/**"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
