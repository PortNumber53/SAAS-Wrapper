Feature: Dependency security version checks
  As a developer maintaining SAAS-Wrapper
  I want to verify that vulnerable dependencies are upgraded to patched versions
  So that known CVEs do not regress in future updates

  Scenario: @remix-run/router is patched to at least 1.23.3
    Given I read the package-lock.json
    When I look up the version of "@remix-run/router" under "node_modules/@remix-run/router"
    Then the version should be at least "1.23.3"

  Scenario: @remix-run/router is not the vulnerable 1.23.2
    Given I read the package-lock.json
    When I look up the version of "@remix-run/router" under "node_modules/@remix-run/router"
    Then the version should not equal "1.23.2"
