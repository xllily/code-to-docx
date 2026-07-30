module.exports = {
    testEnvironment: "node",
    moduleFileExtensions: ["js", "mjs"],
    testMatch: [
        "**/__tests__/**/*.[jt]s?(x)",
        "**/?(*.)+(spec|test).[tj]s?(x)",
        "**/?(*.)+(spec|test).mjs",
    ],
    collectCoverageFrom: ["src/utils/**/*.mjs"],
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 65,
            functions: 90,
            lines: 80,
        },
    },
    transform: {},
};
