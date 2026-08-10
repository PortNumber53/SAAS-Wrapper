Feature: Dependency security version checks
  As a developer maintaining SAAS-Wrapper
  I want to verify that vulnerable dependencies are upgraded to patched versions
  So that known CVEs do not regress in future updates

  Scenario: ip-address is patched to at least 10.4.0
    Given I read the package-lock.json
    When I look up the version of "ip-address" under "node_modules/ip-address"
    Then the version should be at least "10.4.0"

  Scenario: ip-address is not the vulnerable 10.1.0
    Given I read the package-lock.json
    When I look up the version of "ip-address" under "node_modules/ip-address"
    Then the version should not equal "10.1.0"
