# London gameplay reference — implementation notes

Reference: [Robert Plumley, London 2012 Olympics Kayak gameplay](https://www.youtube.com/watch?v=aBe8PVSObfo).
Inspected the introduction, start at ~25 s, mid-course at ~50/59/75 s, later gates
at ~100 s, and result at ~115 s, plus a continuous ~30–59 s passage.

Observed: low camera behind a large visible paddler, alternating double-blade
strokes, strong localized breakers around baffles, floating gate guidance,
immediate gate-completion feedback, course timer and separate penalty/total
result. The result shows 85.16 course time + 12 penalty = 97.16 total.
Physics coefficients, exact controller mapping and judging algorithms cannot
be recovered from video; those remain our implementation choices.

Milestone 1: procedural seated paddler with helmet/vest and jointed arms following
a double-blade paddle, effort-driven alternating strokes and reverse/turn pose.
Pointed 3.8 m K1 visual hull uses the existing conservative Rust capsule collider.
Camera is 4.6 m behind, 2.15 m above sampled water, with existing smoothed heading
and velocity look-ahead. Instrumentation takes less screen space.
Character geometry is a prototype, not a reproduction of the original assets.
