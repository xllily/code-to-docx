module.exports = {
    testEnvironment: "node",
    moduleFileExtensions: ["js", "mjs"],
    testMatch: [
        "**/__tests__/**/*.[jt]s?(x)",
        "**/?(*.)+(spec|test).[tj]s?(x)",
        "**/?(*.)+(spec|test).mjs",
    ],
    transform: {
        "^.+\\.(m?js)$": "babel-jest",
    },
};
