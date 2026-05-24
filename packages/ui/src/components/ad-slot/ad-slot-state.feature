Feature: Ad slot state resolution

  Scenario: Both flags off — slot is hidden
    Given both NEXT_PUBLIC_FEATURE_ADS and NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS are unset
    When resolveAdSlotState is called
    Then the state is "hidden"

  Scenario: Placeholder flag on, ads flag off — spacer shown
    Given NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS is "true" and NEXT_PUBLIC_FEATURE_ADS is unset
    When resolveAdSlotState is called
    Then the state is "placeholder"

  Scenario: Ads flag on — slot is active
    Given NEXT_PUBLIC_FEATURE_ADS is "true"
    When resolveAdSlotState is called
    Then the state is "active"
