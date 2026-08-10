Feature: Dependency security version checks
  As a developer maintaining SAAS-Wrapper
  I want to verify that vulnerable dependencies are upgraded to patched versions
  So that known CVEs do not regress in future updates

  Scenario: react-router-dom is patched to at least 7.18.2
    Given I read the package-lock.json
    When I look up the version of "react-router-dom" under "node_modules/react-router-dom"
    Then the version should be at least "7.18.2"

  Scenario: react-router-dom is not the vulnerable 6.30.4
    Given I read the package-lock.json
    When I look up the version of "react-router-dom" under "node_modules/react-router-dom"
    Then the version should not equal "6.30.4"

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

  Scenario: brace-expansion in glob is patched to at least 5.0.9
    Given I read the package-lock.json
    When I look up the version of "brace-expansion" under "node_modules/glob/node_modules/brace-expansion"
    Then the version should be at least "5.0.9"

  Scenario: brace-expansion under glob is not the vulnerable 5.0.5
    Given I read the package-lock.json
    When I look up the version of "brace-expansion" under "node_modules/glob/node_modules/brace-expansion"
    Then the version should not equal "5.0.5"
