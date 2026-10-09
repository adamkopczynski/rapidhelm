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

Milestone 2: timed practice run starts when the boat crosses gate 1's longitudinal
plane. Ordered directional gate crossings are judged from every authoritative
120 Hz snapshot, rather than interpolated render frames. HUD and target ring give
the next gate, relative bearing, distance, course time, penalty and immediate
feedback. At 294 m the run closes remaining gates and shows course + penalty
= total; restart clears the race and restores the start pool.

Practice rules are authored in `content/rules/practice-slalom.json` and validated
with Zod. Touch adds 2 seconds once per gate; a miss or wrong-direction crossing
adds 50, replacing any earlier 2 seconds for that gate. These penalty values
follow the [ICF discipline overview](https://www.canoeicf.com/discipline/canoe-slalom).
A 14 m downstream recovery window prevents guidance remaining permanently on
an abandoned gate. That window is a game convenience, not an ICF rule.

Limitations: crossing uses the boat centre as an athlete proxy. Touches use a
swept planar capsule with a conservative margin, irrespective of pole height;
actual athlete/head/paddle mesh judging and full gate-negotiation rules are not
implemented. The character and strokes are procedural stand-ins. Boat forces
remain the Rust sandbox model; coefficients were not reverse-engineered from
the video. Paris geometry is retained; no London assets, branding, crowd art,
commentary or soundtrack were copied. Whitewater remains empirical.

Verification: pnpm check (typecheck, Vitest, Rust tests and production build).
Race cases cover direction, ordering, one penalty per gate, replacement on a
miss, fast rotated crossings, finish/result freeze, reset and recovery windows.
Real WASM race snapshots agree across 30/60/144 Hz with exactly 1,200 observed
physics ticks in 10 seconds. The existing full-course 150-second collision replay
remains enabled. Overlapping verification runs initially caused the long replay
to exceed its timeout; final verification uses a single check process.

Interactive in-app browser: inspected the closer paddler/hull framing and water,
paddled through the first fall, observed timer start, Gate 1 +50 and target
advancing to upstream Gate 2, then verified restart clears time/penalties. Vite
HMR briefly emitted hook errors during dependency re-optimization; full reload
restored the working scene. A clean human-controlled 20-gate run, the finished
results panel and target-GPU performance still require manual gameplay checking.
E2E/Playwright remains skipped. User Chrome was not controlled.

The first gate is centred in the entry flow to give the run a readable opening;
the earlier right offset put its approach close to the new bank baffle. This is
a practice-course change, not a claim about Paris's official competition layout.

Final fresh-load check after centring gate 1: holding W for 8 seconds produced
“Gate 1 complete · clean”, 1/20 gates, +0 penalties and guidance/ring advancing
to red upstream Gate 2. No console errors were captured on this fresh tab.
The shared-content cache dependency was also corrected: dry-run hashes for web
build, test and typecheck all change when a venue gate coordinate changes.
