import { setDefaultTimeout } from '@cucumber/cucumber';

// E2E steps involve page navigation — 5s default is too tight
setDefaultTimeout(30_000);
