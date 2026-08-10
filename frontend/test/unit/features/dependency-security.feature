Feature: Dependency security version checks
  As a developer maintaining SAAS-Wrapper
  I want to verify that vulnerable dependencies are upgraded to patched versions
  So that known CVEs do not regress in future updates

  Scenario: undici is patched to at least 7.29.0
    Given I read the package-lock.json
    When I look up the version of "undici" under "node_modules/undici"
    Then the version should be at least "7.29.0"

  Scenario: undici is not the vulnerable 7.18.2
    Given I read the package-lock.json
    When I look up the version of "undici" under "node_modules/undici"
    Then the version should not equal "7.18.2"
