# Canoe Slalom — Project Kickoff & Technical Brief

**Project:** Canoe Slalom (working title)
**Status:** Pre-production / Initial implementation
**Primary platform:** Web browser (desktop-first)
**Development environment:** macOS
**Development approach:** AI-assisted engineering with Codex
**Core technology:** TypeScript + Babylon.js + Rust + WebAssembly
**Long-term possibility:** Native desktop version using Unreal Engine 5

---

# 1. Project Vision

Build a visually realistic, physics-driven 3D canoe slalom sports game inspired by the canoe slalom event in *London 2012: The Official Video Game*.

The game should combine accessible controls with meaningful whitewater physics, technical gate navigation, competitive racing, and eventually a complete international canoe slalom season experience.

The initial objective is not to create a fully realistic professional paddling simulator. It is to create a game that feels authentic, rewards skill, and remains enjoyable for players unfamiliar with canoe slalom.

The game should be easy to understand but difficult to master.

### Key principles

1. **Gameplay first:** Paddling, steering, drifting, and negotiating gates must feel satisfying.
2. **Believable physics:** River currents, momentum, eddies, and boat orientation must meaningfully influence gameplay.
3. **High visual quality:** Aim for realistic, modern sports-game graphics rather than a stylized or low-poly aesthetic.
4. **Browser-first:** The game must run directly in modern desktop browsers without installation.
5. **Performance-conscious:** Maintain responsive controls and smooth rendering, targeting 60 FPS.
6. **Modular architecture:** Keep physics, rendering, competition rules, and content independent wherever practical.
7. **Expandable design:** Support future venues, athletes, competitions, boat classes, and potentially a native Unreal Engine version.
8. **AI-assisted development:** Structure the codebase, tasks, and testing so Codex can implement features incrementally and reliably.

---

# 2. Product Roadmap

## Phase 1 — Technical Prototype

Create a small playable 3D whitewater environment to validate the technology and gameplay.

Scope:

- One K1 kayak.
- One controllable paddler, initially using placeholder assets.
- A short artificial whitewater channel.
- River currents and at least one eddy.
- Forward paddling, braking, turning, and drifting.
- Three slalom gates.
- Third-person chase camera.
- Keyboard and gamepad input.
- Basic water rendering, foam, and splashes.
- Physics debugging tools.
- Performance measurements.

**Success criteria:** The player can paddle through moving water, enter an eddy, negotiate an upstream gate, and return to the main current. Controls feel responsive and the simulation is stable.

## Phase 2 — Complete Single-Event Game

Expand the prototype into a complete canoe slalom event.

Scope:

- One fully modeled venue.
- Approximately 18–22 gates.
- Downstream and upstream gate judging.
- Timing and penalties.
- Start and finish sequences.
- Basic paddler animations.
- Improved water visuals.
- 10–30 simulated competitors.
- Results and rankings.
- Personal bests.
- Restart and practice modes.
- Adjustable difficulty and control assistance.
- Local save data.

**Success criteria:** A complete, replayable canoe slalom competition with believable opponent results.

## Phase 3 — Visual and Gameplay Polish

Improve presentation and simulation quality.

Scope:

- High-quality kayak and paddler models.
- Animation synchronized with paddle impulses.
- Improved water materials and hydraulic features.
- Foam, spray, wakes, and splashes.
- Better environment lighting and shadows.
- Spectator and venue details.
- Broadcast-style cameras.
- Sound effects and ambient audio.
- Replay and ghost systems.
- Performance optimization.

**Success criteria:** A visually convincing sports-game experience that runs smoothly on supported desktop browsers.

## Phase 4 — Multiple Venues and Athletes

Introduce content variety.

Potential venues:

- Lee Valley White Water Centre, United Kingdom.
- Prague-Troja, Czech Republic.
- Augsburg Eiskanal, Germany.
- Vaires-sur-Marne, France.

Scope:

- Reusable venue architecture.
- Multiple gate layouts per venue.
- Venue-specific currents and obstacles.
- Selectable fictional athletes.
- Athlete performance attributes.
- Nationalities and equipment variations.
- Difficulty differences between courses.

Real-world venue references will be used for research. Commercial use of names, branding, or accurately reproduced protected elements must be reviewed.

## Phase 5 — World Cup and Season Mode

Introduce a full competitive progression system.

Scope:

- Season calendar.
- Event registration.
- Qualifying rounds.
- Semifinals and finals where applicable.
- Simulated opponent performances.
- Event rankings.
- Championship points.
- Season standings.
- Athlete statistics.
- Persistent season progress.
- Configurable competition rules.

Competition formats and scoring rules must be data-driven to support different formats and future changes.

## Phase 6 — Advanced Features

Potential future additions:

- C1 canoe class.
- More advanced paddling controls.
- Physically simulated AI paddlers.
- Custom course editor.
- Online leaderboards.
- Replay sharing.
- More detailed water simulation.
- Native desktop builds.
- Possible Unreal Engine 5 implementation.

These features are outside the initial scope.

---

# 3. Technology Stack

## Primary stack

**TypeScript**
- Main application logic.
- Input handling.
- Game state.
- UI and menus.
- Rendering integration.
- Non-intensive gameplay systems.

**Babylon.js**
- 3D scene rendering.
- Camera management.
- Lighting and shadows.
- Physically based materials.
- Water shaders.
- Meshes and animation.
- Particles and post-processing.
- WebGL2 and WebGPU support.

**Rust**
- Computationally intensive simulation.
- Boat dynamics.
- River velocity sampling.
- Hydrodynamic forces.
- Fixed-timestep physics.
- Performance-critical collision calculations where beneficial.

**WebAssembly**
- Executes compiled Rust simulation code in the browser.
- Provides an interface between TypeScript and Rust.
- Allows simulation logic to remain independent of Babylon.js.
- Supports possible future native reuse.

**React**
- Main menus.
- Race HUD.
- Athlete selection.
- Competition screens.
- Settings.
- Season management.

**Vite**
- Development server.
- TypeScript application bundling.
- Fast development workflow.

**Vitest**
- TypeScript unit and integration testing.

**Rust cargo test**
- Physics and simulation testing.

**Playwright**
- Browser-based end-to-end testing.

## Rendering strategy

Prefer WebGPU where available, with a WebGL2 fallback.

Do not assume that every WebGPU feature works identically across browsers or GPUs.

The game must remain playable without WebGPU, potentially using reduced visual quality.

## Development environment

Primary development on macOS with:

- Rust toolchain.
- wasm-pack or an equivalent maintained WASM build workflow.
- Node.js LTS.
- TypeScript.
- Babylon.js.
- Visual Studio Code or another compatible editor.
- Codex.
- Git and Git LFS.
- Blender for 3D assets.

Windows is not required for initial development, although Windows browser testing will be necessary before release.

---

# 4. System Architecture

The architecture must separate rendering from simulation.

Babylon.js should display the world, but it should not be the authoritative source for boat movement or race physics.

The Rust simulation should calculate the physical state of the boat and river interaction.

TypeScript coordinates the simulation, input, UI, and rendering.

### Conceptual architecture

```text
Browser Application
│
├── React UI
│   ├── Main Menu
│   ├── Race HUD
│   ├── Results
│   ├── Athlete Selection
│   └── Competition Management
│
├── TypeScript Game Runtime
│   ├── Game State
│   ├── Input Manager
│   ├── Race Manager
│   ├── Audio Manager
│   ├── Camera Controller
│   └── Rendering Adapter
│
├── Babylon.js Rendering
│   ├── Scene
│   ├── Venue Geometry
│   ├── Water Rendering
│   ├── Boat and Athlete
│   ├── Gates
│   ├── Lighting
│   └── Visual Effects
│
├── Rust / WebAssembly Simulation
│   ├── Boat Physics
│   ├── Paddle Forces
│   ├── River Flow Fields
│   ├── Hydrodynamics
│   ├── Collision Queries
│   └── Fixed-Step Simulation
│
├── Race and Competition Systems
│   ├── Gate Judging
│   ├── Timing
│   ├── Penalties
│   ├── Opponent Simulation
│   ├── Rankings
│   └── Season Management
│
└── Shared Data
    ├── Boats
    ├── Athletes
    ├── Venues
    ├── Courses
    └── Competition Rules
```

### Important architectural rules

- Rust must not depend on Babylon.js or browser-specific APIs.
- TypeScript must not duplicate authoritative physics calculations.
- Rendering must consume simulation state rather than control it.
- The physics simulation must use a fixed timestep.
- Visual rendering must interpolate between simulation states.
- Game content must be data-driven.
- Simulation behavior should be reproducible from the same initial state and input sequence, within defined numerical tolerances.
- Core algorithms should be testable without starting the 3D application.
- Avoid excessive JavaScript-to-WASM calls. Prefer batched input and state exchange.
- Avoid introducing unnecessary abstraction before it is needed.

---

# 5. Physics Simulation

The most important engineering system is the interaction between the kayak and moving water.

## Boat model

Initially use a simplified rigid-body model with:

- Position.
- Orientation.
- Linear velocity.
- Angular velocity.
- Mass.
- Moment of inertia.
- Forward and lateral drag.
- Paddle impulse forces.
- Turning torque.
- River current influence.

Start with planar movement and yaw, while the rendered boat follows the water surface height and receives visual roll and pitch.

More detailed 3D dynamics can be added later.

## Relative water velocity

The simulation should calculate the boat's velocity relative to the surrounding water:

```text
relative_velocity =
    boat_velocity - local_water_velocity
```

Hydrodynamic drag must depend on relative velocity, not just world-space boat speed.

## Paddle physics

The initial model should support:

- Forward stroke.
- Reverse stroke.
- Turning or sweep stroke.
- Configurable stroke strength.
- Stroke duration.
- Acceleration and braking.
- Different force application points.

The force model should be compatible with future animated stroke timing.

## River simulation

Do not attempt full real-time computational fluid dynamics in the initial version.

Instead, implement a controllable velocity field.

Each water sample should provide:

```text
WaterSample
- flow_velocity
- surface_height
- turbulence
- wave_strength
- depth
```

Start with:

- Main downstream current.
- Slow water near banks.
- Fast current zones.
- Eddy / reverse-current zones.
- Local turbulence.
- Current transitions.

Use spline-based flow and configurable local flow regions initially.

Later, support baked velocity fields for individual venues.

## Numerical integration

Use a fixed simulation timestep, initially 1/120 second if performance allows.

Use a stable numerical integration approach appropriate to the chosen force model.

Test:

- Acceleration.
- Braking.
- Turning.
- Current drift.
- Eddy interaction.
- Collision response.
- Numerical stability.
- Consistency across different rendering frame rates.

Do not tie physics results to requestAnimationFrame timing.

---

# 6. Controls

The game should prioritize accessible controls while leaving room for advanced paddling mechanics.

## Initial control model

**Keyboard**

- W: Forward stroke / paddle.
- S: Reverse stroke / brake.
- A/D: Steer left/right.
- Space: Strong stroke or temporary paddle boost, subject to gameplay testing.
- R: Restart run.
- Escape: Pause.

**Gamepad**

- Left stick: Steering.
- Right trigger: Forward paddling.
- Left trigger: Reverse paddling.
- Right stick: Reserved for advanced paddle or lean control.

These mappings are provisional and must be playtested.

## Future control modes

**Arcade mode**

- Assisted paddling.
- Simplified steering.
- Automatic stroke timing.
- Reduced technical complexity.

**Advanced mode**

- Independent paddle strokes.
- Sweep strokes.
- Draw strokes.
- Lean and edging.
- More precise current management.

Both should use the same underlying physics engine.

---

# 7. Water Rendering

Water quality is a major visual priority.

The target is realistic whitewater rather than cartoon water.

The visual water system must remain separate from the authoritative physical flow simulation.

## Initial rendering requirements

- Animated water surface.
- Flow-aligned normal maps.
- PBR-compatible shading.
- Foam textures.
- Local wave displacement.
- Directional flow visualization.
- Reflections where practical.
- Splash particles.
- Kayak wake.
- Water contact effects.

## Advanced rendering

Later improvements may include:

- Hydraulic standing waves.
- Procedural foam generation.
- Depth-based water appearance.
- More accurate refraction.
- Spray and mist.
- Water interaction around rocks.
- Boat-water intersection effects.
- Screen-space and temporal techniques where supported.

Water visuals should be driven by the same authored flow information used by the physics simulation whenever possible.

Avoid visually depicting a current flowing in a different direction from the physical current.

## Visual target

Aim for realistic sports-broadcast presentation:

- Natural outdoor lighting.
- High-quality athlete and kayak materials.
- Detailed artificial whitewater channels.
- Convincing foam and turbulent water.
- Modern tone mapping.
- Good shadow quality.
- Restrained post-processing.

The target is to approach the visual impression of a modern desktop sports game within browser performance constraints, not to reproduce Unreal Engine 5's entire rendering feature set.

---

# 8. Gate and Race System

## Gate types

Support:

- Downstream gates.
- Upstream gates.

Each gate contains:

- Unique ID.
- Sequence number.
- Position.
- Orientation.
- Pole geometry.
- Crossing plane.
- Valid crossing direction.
- Collision information.

## Judging

The system must detect:

- Correct gate passage.
- Incorrect crossing direction.
- Pole contact.
- Missed gates.
- Out-of-order negotiation.
- Repeated gate contact.
- Completion of the full course.

Use configurable judging rules.

For the initial competition model:

- Clean gate: no penalty.
- Gate contact: two-second penalty.
- Missed or incorrectly negotiated gate: fifty-second penalty.

The detailed criteria must be validated against the ruleset being modeled, especially head and boat passage requirements.

The judging system should be independently testable and must not depend on visual mesh overlap alone.

## Race states

```text
Idle
→ Ready
→ Countdown
→ Racing
→ Finished
→ Results
```

The race manager should track:

- Start time.
- Elapsed time.
- Penalties.
- Gate progress.
- Final adjusted time.
- Completion status.
- Personal best.

---

# 9. Opponent Simulation

Initially, the player is the only physically controlled athlete.

Other competitors should be simulated statistically.

Each athlete has configurable attributes:

- Paddle power.
- Boat control.
- Gate accuracy.
- River reading.
- Consistency.
- Risk-taking tendency.

Results should be generated using:

- Athlete skill.
- Venue characteristics.
- Course difficulty.
- Performance variation.
- Penalty probability.
- Competition pressure, if added later.

The model should produce plausible times and rankings without simply assigning arbitrary random results.

It must support deterministic random seeds for testing and reproducibility.

Later, opponent simulation can be extended with:

- Recorded ghost runs.
- Generated trajectories.
- Physical AI-controlled boats.

Full physical AI is explicitly excluded from the first playable release.

---

# 10. Venue and Course Data

Venues and courses must be separate concepts.

A venue defines:

- Environment geometry.
- River channel.
- Obstacles.
- Flow field.
- Water surface.
- Start and finish regions.
- Lighting and atmosphere.

A course defines:

- Gate count.
- Gate positions.
- Gate orientations.
- Gate sequence.
- Upstream/downstream classification.
- Competition-specific configuration.

Multiple courses must be possible within the same venue.

Use versioned, validated JSON data initially.

Establish one canonical coordinate system, units convention, and angle convention shared by Rust, TypeScript, and Babylon.js. Implement conversion only at explicit system boundaries.

Avoid embedding venue-specific values directly in physics code.

---

# 11. Repository Structure

Proposed monorepo:

```text
canoe-slalom/
│
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   ├── game/
│       │   ├── rendering/
│       │   ├── input/
│       │   ├── ui/
│       │   └── audio/
│       ├── public/
│       └── package.json
│
├── crates/
│   └── simulation/
│       ├── src/
│       │   ├── boat/
│       │   ├── river/
│       │   ├── physics/
│       │   ├── collision/
│       │   └── lib.rs
│       ├── tests/
│       └── Cargo.toml
│
├── packages/
│   ├── wasm-bridge/
│   ├── competition/
│   ├── shared-types/
│   └── content-schema/
│
├── assets/
│   ├── boats/
│   ├── athletes/
│   ├── venues/
│   ├── water/
│   └── audio/
│
├── content/
│   ├── venues/
│   ├── courses/
│   ├── athletes/
│   └── rulesets/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── architecture/
│   ├── gameplay/
│   ├── physics/
│   └── development/
│
└── README.md
```

Rust will be used from the beginning for the simulation core, but not every computational task needs to be implemented in Rust.

Keep UI, menus, competition orchestration, and general application logic in TypeScript unless performance measurements justify moving them.

---

# 12. Codex Development Workflow

Codex will be the primary coding assistant.

The project should be organized for incremental implementation.

## Engineering rules

1. Do not generate the entire game in one task.
2. Implement small, independently testable features.
3. Compile and test after every meaningful change.
4. Maintain strict boundaries between simulation and rendering.
5. Keep physics parameters configurable.
6. Avoid hardcoded venue and course logic.
7. Add automated tests for important algorithms.
8. Document public APIs and major design decisions.
9. Prefer simple, maintainable solutions over premature optimization.
10. Do not introduce new dependencies without a clear justification.
11. Never claim a feature is working without testing it.
12. Preserve a runnable application throughout development.

## Codex responsibilities

Codex should:

- Scaffold the monorepo.
- Configure Rust/WASM integration.
- Implement TypeScript and Rust systems.
- Write unit and integration tests.
- Build debug visualization tools.
- Implement UI components.
- Create procedural prototype geometry.
- Maintain technical documentation.
- Assist with shader development.
- Run available tests and builds.
- Report implementation limitations and remaining manual steps.

## Human responsibilities

The developer should:

- Evaluate gameplay feel.
- Tune controls.
- Review architectural decisions.
- Test the game interactively.
- Select and refine art assets.
- Evaluate visual quality.
- Approve milestone completion.

Codex should not assume that compilation alone proves gameplay quality.

---

# 13. Initial Development Backlog

## Sprint 0 — Project Foundation

Deliverables:

- Initialize Git repository.
- Create Vite + TypeScript application.
- Integrate Babylon.js.
- Configure React.
- Create Rust simulation crate.
- Configure WASM compilation and loading.
- Implement TypeScript/Rust communication.
- Add unit test frameworks.
- Add browser smoke tests.
- Create development documentation.
- Create a minimal 3D scene.
- Display a simple object whose position is updated by Rust simulation state.

Acceptance criteria:

- Project builds on macOS.
- Browser application starts successfully.
- Rust compiles to WebAssembly.
- TypeScript can initialize and step the Rust simulation.
- Babylon.js renders the resulting state.
- Tests can run with documented commands.

## Sprint 1 — Boat Physics Sandbox

Deliverables:

- Boat state structure.
- Forward acceleration.
- Reverse acceleration.
- Turning torque.
- Linear and angular drag.
- Fixed-step simulation.
- Basic keyboard input.
- Chase camera.
- Debug velocity vectors.

Acceptance criteria:

- Boat responds consistently to controls.
- Movement is frame-rate independent within tolerance.
- The boat accelerates, turns, and slows naturally.
- Physics parameters can be adjusted without modifying core algorithms.

## Sprint 2 — River Currents

Deliverables:

- River flow interface.
- Uniform current region.
- Multiple flow zones.
- Eddy region.
- Flow interpolation.
- Boat-current interaction.
- Debug flow arrows.

Acceptance criteria:

- Boat drifts with the current.
- Entering an eddy changes boat behavior.
- Relative velocity affects drag.
- Flow transitions remain numerically stable.

## Sprint 3 — First Whitewater Scene

Deliverables:

- Procedural river channel.
- River banks.
- Water mesh.
- Animated surface materials.
- Basic foam.
- Rocks and obstacles.
- Collision boundaries.
- Initial lighting.

Acceptance criteria:

- The river visually communicates flow direction.
- The boat remains aligned with the water surface.
- The scene runs smoothly on the target development Mac.
- Water rendering can be improved without rewriting physics.

## Sprint 4 — Slalom Gates

Deliverables:

- Gate entities.
- Gate sequence.
- Gate crossing detection.
- Pole collision detection.
- Penalty logic.
- Three-gate practice course.
- Timer.
- HUD.

Acceptance criteria:

- Player can complete a short slalom run.
- Correct gate passage is recognized.
- Invalid passage and contact are penalized correctly.
- Gate judging passes automated tests.

## Sprint 5 — Playable Vertical Slice

Deliverables:

- Improved boat handling.
- One technical upstream gate.
- Better water feedback.
- Basic athlete and paddle visuals.
- Race start and finish.
- Results screen.
- Restart flow.
- Performance profiling.

Acceptance criteria:

- A complete short run is playable.
- The controls are enjoyable.
- The river meaningfully affects strategy.
- The game remains stable at the target frame rate.
- No major race-blocking defects remain.

---

# 14. Performance Requirements

Initial target:

- 1920 × 1080 rendering.
- 60 FPS on a defined midrange desktop/laptop target.
- Stable fixed-step physics.
- Low input latency.
- Reasonable browser memory usage.
- Fast restart and retry.
- No major garbage-collection pauses during a run.

Performance must be measured, not assumed.

Track:

- Rendering frame time.
- Simulation step time.
- WASM boundary overhead.
- Draw calls.
- GPU memory usage.
- Asset loading time.
- Main-thread stalls.

Use adaptive graphics settings if needed.

If simulation becomes expensive, consider a Web Worker with an appropriate state-transfer strategy. Do not introduce multithreaded WASM prematurely.

---

# 15. Testing Strategy

## Rust unit tests

Cover:

- Boat acceleration.
- Drag.
- Turning.
- Water-relative velocity.
- Current sampling.
- Numerical stability.
- Collision calculations.

## TypeScript tests

Cover:

- Input mapping.
- Race state transitions.
- Timing and penalties.
- Competition calculations.
- Data validation.
- Save and load behavior.

## Browser tests

Cover:

- Application startup.
- WASM initialization.
- Scene loading.
- Input responsiveness.
- Race restart.
- Results presentation.

## Manual gameplay tests

Evaluate:

- Paddling feel.
- Turning responsiveness.
- Current readability.
- Gate fairness.
- Camera comfort.
- Visual clarity.
- Difficulty balance.

Maintain a short manual test checklist for every milestone.

---

# 16. Main Risks

## Risk: Boat handling feels unnatural

Mitigation: Build a physics sandbox early, expose tuning parameters, and prioritize repeated playtesting.

## Risk: Whitewater looks unrealistic

Mitigation: Treat water rendering as a major independent technical workstream. Build representative rapids early rather than postponing them until the end.

## Risk: Rust/WASM integration becomes overly complex

Mitigation: Keep the WASM interface small and stable. Batch state transfers. Use TypeScript for non-critical logic.

## Risk: Browser performance is insufficient

Mitigation: Profile early on real hardware. Provide WebGL2 fallback and scalable graphics settings.

## Risk: Gate judging is inconsistent

Mitigation: Use geometric crossing logic, independent collision detection, configurable rules, and automated edge-case tests.

## Risk: Scope grows too quickly

Mitigation: Complete the single-boat, single-venue vertical slice before building athlete selection, season systems, or multiple venues.

## Risk: Future Unreal migration is expensive

Mitigation: Keep simulation algorithms and game content independent of the rendering engine. Treat a future Unreal version as a separate client or port, not an automatic conversion.

---

# 17. Definition of Done — First Prototype

The first technical prototype is complete when:

- The application launches in a desktop browser.
- Babylon.js renders a 3D river scene.
- Rust/WASM drives the authoritative boat movement.
- The player can paddle, brake, and steer.
- The boat responds to moving water.
- At least one eddy affects movement.
- Three gates can be negotiated.
- A timer and basic penalty system work.
- The player can restart the run.
- The chase camera is functional.
- Keyboard controls work.
- Gamepad controls work on at least one tested browser/controller combination.
- Automated simulation tests pass.
- Performance is measured and documented.
- The codebase remains modular and understandable.

The prototype does not require finished character art, a complete competition system, or photorealistic water.

---

# 18. Immediate Next Steps

Start by implementing Sprint 0.

The first Codex task should:

1. Inspect the development environment.
2. Scaffold the repository.
3. Configure TypeScript, Babylon.js, React, and Vite.
4. Create the Rust simulation crate.
5. Configure Rust-to-WASM compilation.
6. Implement a minimal simulation loop.
7. Render a moving test boat object in Babylon.js.
8. Add development and test scripts.
9. Run builds and tests.
10. Document how to start the application locally.

After Sprint 0, implement the boat physics sandbox before adding realistic water rendering.

**Do not begin World Cup systems, detailed venues, advanced AI, or asset-heavy production until the core boat movement and current interaction are validated.**

---

# 19. Long-Term Product Direction

The long-term ambition is a browser-based canoe slalom sports game with:

- Realistic 3D presentation.
- Satisfying kayak handling.
- Believable whitewater.
- Technical upstream and downstream gates.
- Multiple international venues.
- Selectable athletes.
- Competitive AI results.
- Complete World Cup seasons.
- Persistent statistics and progression.
- Optional advanced simulation controls.

The browser version should be treated as a potentially complete product, not merely a disposable Unreal Engine prototype.

The architecture should nevertheless preserve the possibility of reusing simulation code, algorithms, and content in a future native desktop game.

**Immediate priority: Build the smallest technically credible and genuinely enjoyable canoe slalom experience using TypeScript, Babylon.js, Rust, and WebAssembly.**
