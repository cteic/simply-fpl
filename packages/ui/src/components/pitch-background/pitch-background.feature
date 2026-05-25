Feature: Football-pitch hero background geometry

  The landing hero renders a football pitch as its background. A pure geometry
  builder produces the regulation markings so the SVG component stays a thin
  renderer and the layout can be unit-tested. These scenarios lock the layout:
  a full marking set, end-to-end mirroring, a centred kickoff, and gap-free
  mowing stripes that tile the full width.

  Scenario: The builder produces a full set of regulation markings
    When the pitch geometry is built
    Then it has an outer boundary, halfway line, centre circle and centre spot
    And it has a penalty area, goal area, penalty spot and penalty arc at each end
    And it has an arc in all four corners

  Scenario: Both ends of the pitch mirror each other
    When the pitch geometry is built
    Then the penalty areas are mirrored across the halfway line
    And the goal areas are mirrored across the halfway line
    And the penalty spots are mirrored across the halfway line

  Scenario: The kickoff markings sit on the centre of the pitch
    When the pitch geometry is built
    Then the centre circle, centre spot and halfway line share the pitch centre

  Scenario: Mowing stripes tile the full width without gaps
    When the pitch geometry is built
    Then the stripes cover the whole width edge to edge with no gaps
    And the stripes alternate between two shades
