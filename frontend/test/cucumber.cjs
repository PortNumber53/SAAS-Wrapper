const common = {
  requireModule: ['tsx/esm'],
  format: ['progress-bar'],
  formatOptions: { snippetInterface: 'async-await' },
};

module.exports = {
  default: {
    ...common,
    paths: ['test/unit/features/**/*.feature', 'test/integration/features/**/*.feature', 'test/e2e/features/**/*.feature'],
    require: ['test/**/steps/**/*.ts', 'test/**/support/**/*.ts'],
  },
  unit: {
    ...common,
    paths: ['test/unit/features/**/*.feature'],
    require: ['test/unit/steps/**/*.ts', 'test/unit/support/**/*.ts'],
  },
  integration: {
    ...common,
    paths: ['test/integration/features/**/*.feature'],
    require: ['test/integration/steps/**/*.ts', 'test/integration/support/**/*.ts'],
    tags: 'not @requires-db',
  },
  'integration:full': {
    ...common,
    paths: ['test/integration/features/**/*.feature'],
    require: ['test/integration/steps/**/*.ts', 'test/integration/support/**/*.ts'],
  },
  e2e: {
    ...common,
    paths: ['test/e2e/features/**/*.feature'],
    require: ['test/e2e/steps/**/*.ts', 'test/e2e/support/**/*.ts'],
  },
};
