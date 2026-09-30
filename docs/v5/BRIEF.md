# V5 visual and motion brief

Refinement of the established DeepGrid identity, authorized by the user on 2026-09-30. User requests semiconductor/DeepGrid-specific assets, more ambitious Three.js motion, design review, commit/push, and a new Pages endpoint. Engineering evaluation remains the audience and primary journey. Copper/ink and Newsreader/Inter/JetBrains remain authoritative. These are authored implementation decisions, not user quotations.

## Story and motion thesis

Product and enquiry stay visible first. Package cutaway exposes bond wires and labelled MAIN/CHECKER logic. A semiconductor package render from the DeepGrid GitHub showcase establishes the material world. The next interaction connects the fault mechanism to a motor bridge. Evidence follows and remains source-qualified. Variant comparison uses existing architecture diagrams. Readiness and enquiry close the page.

Peak: “It is the site where you can open the control chip and see a hardware fault stop the drive.”

Feeling curve: orientation (plain product promise) → discovery (open package) → material credibility (wafer/probe illustration) → understanding (controlled fault and motor stop) → confidence (evidence and variants) → action (contact).

Motion budget: two isolated Three.js scenes, lazy/offscreen gating, DPR <=1.5, shared/instanced geometry, no postprocessing stack, no full-page background canvas, no wheel interception. All scenes pause; reduced-motion renders static states on demand. HTML controls and explanatory text survive WebGL failure, with image fallbacks. The speed of animation is explanatory, never a claim about hardware timing.

Assets: official supplied DeepGrid wordmark; existing DG32 architecture SVGs; GitHub showcase semiconductor concept in 768/1536px WebP; existing SoC2, multi-die package and robotics concept imagery. The earlier AI-generated wafer/probe visual is retained in the archive and is no longer shown on the homepage. No invented lab photograph or foundry partnership. No new process-node or certification claim.

Devices: interactive 3D cutaway; editorial photographic interlude; causally controlled motor scene; quiet evidence register; two precise architecture plates. Separate mobile composition stacks text and uses 44px controls, no drag capture. HyperFrames entry evaluated: this request is interactive browser-native Three.js motion, not a video deliverable; no unnecessary video render/export pipeline.
