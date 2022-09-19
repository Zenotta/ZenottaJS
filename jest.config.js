module.exports = {
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(t|j)s$',
  "moduleDirectories": [
    "node_modules",
    "./src"
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
