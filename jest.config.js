module.exports = {
    setupFilesAfterEnv: [
        './src/__test__/setup_jest.js'
    ],
    moduleNameMapper: {
        '@/(.*)': '<rootDir>/src/$1'
    }
};
