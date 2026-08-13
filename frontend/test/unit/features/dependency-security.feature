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

  Scenario: ip-address is patched to at least 10.4.0
    Given I read the package-lock.json
    When I look up the version of "ip-address" under "node_modules/ip-address"
    Then the version should be at least "10.4.0"

  Scenario: ip-address is not the vulnerable 10.1.0
    Given I read the package-lock.json
    When I look up the version of "ip-address" under "node_modules/ip-address"
    Then the version should not equal "10.1.0"

  Scenario: undici is patched to at least 7.29.0
    Given I read the package-lock.json
    When I look up the version of "undici" under "node_modules/undici"
    Then the version should be at least "7.29.0"

  Scenario: undici is not the vulnerable 7.18.2
    Given I read the package-lock.json
    When I look up the version of "undici" under "node_modules/undici"
    Then the version should not equal "7.18.2"
