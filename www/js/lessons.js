// Academy content. Each demo starts from `base` (whole-cube orientation), is set up by undoing `alg`,
// then plays `alg` so the learner watches the pieces go home. `mask` greys out pieces that don't matter yet.
// White starts on top and green in front; base 'z2' puts white on the bottom (green stays in front).

const W = 'z2';
const CROSS_FLIP = "F U' R U";
const L4_OLL = "2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2";
const L4_PLL = "2R2 U2 2R2 Uw2 2R2 2U2";
const PAIR = "Uw R U R' F R' F' R Uw'";
const CENTER = "Rw U Rw'";

export const TRACKS = [
  { id: '3', name: '3x3', N: 3, blurb: 'The classic. Learn the layer-by-layer method, then where to go next.' },
  { id: '2', name: '2x2', N: 2, blurb: 'Corners only. Three short steps using moves you’ll reuse on every cube.' },
  { id: '4', name: '4x4', N: 4, blurb: 'Build centers, pair edges, solve it like a 3x3, fix parity.' },
  { id: '5', name: '5x5', N: 5, blurb: 'Same plan as 4x4 with fixed centers and three-piece edges.' },
  { id: 'tips', name: 'Tips', N: 3, blurb: 'Finger tricks, look-ahead, cube care and what to learn next.' },
];

export const LESSONS = {
  '3': [
    { id: '3-notation', title: 'Read the moves', summary: 'Letters, primes and doubles.', practice: ['U', "U'", 'D', "D'", 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'"],
      body: [
        'Every move names a face: R right, L left, U up (top), D down (bottom), F front, B back.',
        'A letter alone is a quarter turn clockwise, as if you were looking straight at that face. A ′ (say “prime”) means counterclockwise. A 2 means a half turn.',
        'Watch L and R: R turns the right side away from you, L turns the left side toward you. Both are clockwise when you look at that side.',
        'Try the buttons below the cube to turn it yourself.' ],
      demos: [ { label: 'R', alg: 'R' }, { label: "R'", alg: "R'" }, { label: 'U', alg: 'U' }, { label: 'L', alg: 'L' }, { label: 'F', alg: 'F' }, { label: 'D', alg: 'D' }, { label: 'B', alg: 'B' } ] },
    { id: '3-pieces', title: 'Know the pieces', summary: 'Centers, edges and corners.',
      body: [
        'Centers never move relative to each other. White is always opposite yellow, so a center tells you the color of its whole face.',
        'Edges have two stickers (there are 12). Corners have three (there are 8).',
        'You never solve single stickers, only pieces. Every piece has exactly one home.' ],
      demos: [ { label: 'Centers', alg: '', mask: 'centers' }, { label: 'Edges', alg: '', mask: 'edges' }, { label: 'Corners', alg: '', mask: 'corners' }, { label: 'Pieces travel together', alg: "R U R' U'", mask: 'corners' } ] },
    { id: '3-cross', title: 'Step 1: White cross', summary: 'Four white edges around the white center.', keep: 'cross',
      body: [
        'Goal: a white plus sign on top, and each edge’s side color matching the center below it.',
        'Hold white on top. Place one edge at a time and leave finished edges alone.',
        'Edge on the bottom layer: turn the bottom until the edge sits under its matching center, then turn that face twice.',
        'Edge in the middle layer: turn the side it touches so the edge goes straight up into its spot.',
        'Edge in the right spot but flipped: F U′ R U.' ],
      demos: [ { label: 'From the bottom', alg: 'D F2', mask: 'cross' }, { label: 'From the middle', alg: 'R', mask: 'cross' }, { label: 'Flipped in place', alg: CROSS_FLIP, mask: 'cross' } ] },
    { id: '3-corners', title: 'Step 2: White corners', summary: 'One move pattern, repeated.', base: W,
      body: [
        'Turn the cube upside down so white is on the bottom. Keep green facing you.',
        'Find a corner with white in the top layer. Turn the top until the corner sits above its home: the front-right spot between the two centers that match its other colors.',
        'Repeat R U R′ U′ until it drops in with white on the bottom. It takes 1, 3 or 5 times depending on where the white sticker faces.',
        'Corner stuck in the bottom in the wrong spot? Hold it at front-right and do R U R′ U′ once to lift it out.' ],
      demos: [ { label: 'White facing right (1×)', alg: "R U R' U'", mask: 'layer1' }, { label: 'White facing up (3×)', alg: "R U R' U' R U R' U' R U R' U'", mask: 'layer1' }, { label: 'White facing you (5×)', alg: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'", mask: 'layer1' } ] },
    { id: '3-middle', title: 'Step 3: Middle layer', summary: 'Insert four side edges.', base: W,
      body: [
        'Keep white on the bottom. Find a top-layer edge that has no yellow.',
        'Turn the top until the edge’s front sticker matches the front center. It forms an upside-down T.',
        'If its top sticker matches the right center: U R U′ R′ U′ F′ U F. If it matches the left center: U′ L′ U L U F U′ F′.',
        'An edge stuck in the middle the wrong way round? Insert any top edge into that spot to pop it out, then place it properly.' ],
      demos: [ { label: 'Edge goes right', alg: "U R U' R' U' F' U F", mask: 'f2l' }, { label: 'Edge goes left', alg: "U' L' U L U F U' F'", mask: 'f2l' } ] },
    { id: '3-ycross', title: 'Step 4: Yellow cross', summary: 'F R U R′ U′ F′.', base: W,
      body: [
        'Only the yellow edges on top matter now. Ignore the corners.',
        'Line: hold it left to right and do F R U R′ U′ F′ once.',
        'L shape: hold it at the back-left (pointing to the back and to the left) and do it twice.',
        'Just a dot: do it once, turn the top to put the L at the back-left, then do it twice.' ],
      demos: [ { label: 'Line', alg: "F R U R' U' F'", mask: 'oll' }, { label: 'L shape', alg: "F R U R' U' F' F R U R' U' F'", mask: 'oll' }, { label: 'Dot', alg: "F R U R' U' F' U2 F R U R' U' F' F R U R' U' F'", mask: 'oll' } ] },
    { id: '3-yedges', title: 'Step 5: Match the yellow edges', summary: 'R U R′ U R U2 R′ U.', base: W,
      body: [
        'Turn the top until at least two edges match the centers below them.',
        'If the matching two are next to each other, hold them at the back and on the right. Do R U R′ U R U2 R′ U. The front and left edges swap.',
        'If they’re opposite each other, do the algorithm once from any side, then look again.' ],
      demos: [ { label: 'Swap front and left', alg: "R U R' U R U2 R' U", mask: 'llEdges' } ] },
    { id: '3-ycorners', title: 'Step 6: Place the yellow corners', summary: 'U R U′ L′ U R′ U′ L.', base: W,
      body: [
        'A corner is in place when its three colors match the three centers around it, even if it’s twisted.',
        'Find a corner that’s in place and hold it at front-right on top. Do U R U′ L′ U R′ U′ L. The other three corners rotate around.',
        'Repeat until all four are in place. If none are, do it once from any side first.' ],
      demos: [ { label: 'Cycle three corners', alg: "U R U' L' U R' U' L" } ] },
    { id: '3-twist', title: 'Step 7: Twist the yellow corners', summary: 'R′ D′ R D, the finish.', base: W,
      body: [
        'Hold yellow on top. Put an unsolved corner at front-right on top.',
        'Repeat R′ D′ R D until its yellow faces up (2 or 4 times). The lower layers will look scrambled. That’s expected.',
        'Turn only the top (U) to bring the next unsolved corner to front-right, and repeat. Never turn the whole cube during this step.',
        'After the last corner, everything comes back. Turn the top to finish.' ],
      demos: [ { label: 'Two corners', alg: "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'" } ] },
    { id: '3-next', title: 'Next: get faster with CFOP', summary: 'Pairs, triggers and 2-look last layer.', base: W,
      body: [
        'Most fast solvers use CFOP: Cross, F2L (first two layers together), OLL (make the top yellow), PLL (finish the top).',
        'F2L pairs a white corner with its middle edge in the top layer, then inserts both at once. The simplest case is U R U′ R′.',
        'Learn the 2-look last layer next: 3 algorithms make the top yellow, 6 more finish it. Sune (R U R′ U R U2 R′) is the first one to learn.' ],
      demos: [ { label: 'F2L pair', alg: "U R U' R'", mask: 'f2l' }, { label: 'Sune', alg: "R U R' U R U2 R'", mask: 'oll' } ] },
  ],
  '2': [
    { id: '2-intro', title: 'A cube of corners', summary: 'No centers, so you pick the top.', practice: ['U', "U'", 'R', "R'", 'F', "F'"],
      body: [
        'The 2x2 is a 3x3 without edges and centers. Moves use the same letters.',
        'There are no centers, so no face has a fixed color. You decide which color goes where by building the first layer.',
        'Every 2x2 algorithm here also works on the corners of a 3x3.' ],
      demos: [ { label: 'R', alg: 'R' }, { label: 'U', alg: 'U' }, { label: 'F', alg: 'F' } ] },
    { id: '2-layer', title: 'Step 1: White layer', summary: 'Four white corners on the bottom.', base: W,
      body: [
        'Pick one white corner, hold it on the bottom, and build the others around it so the side colors match.',
        'Hold the next corner above its spot (front-right) and repeat R U R′ U′ until it drops in. 1, 3 or 5 times.' ],
      demos: [ { label: 'White facing right (1×)', alg: "R U R' U'", mask: 'layer1' }, { label: 'White facing up (3×)', alg: "R U R' U' R U R' U' R U R' U'", mask: 'layer1' } ] },
    { id: '2-yellow', title: 'Step 2: Yellow on top', summary: 'Sune until the top is yellow.', base: W,
      body: [
        'Hold white on the bottom. Look at the top.',
        'If exactly one corner has yellow on top, hold it at front-left and do R U R′ U R U2 R′.',
        'Otherwise, turn the top so a yellow sticker faces you on the front-left corner’s left side, do the same algorithm, and look again.' ],
      demos: [ { label: 'Sune', alg: "R U R' U R U2 R'", mask: 'oll' } ] },
    { id: '2-swap', title: 'Step 3: Swap the last corners', summary: 'One algorithm finishes it.', base: W,
      body: [
        'Turn the top and look at the sides. If two corners on one side match (“headlights”), hold that side at the back.',
        'Do R U R′ U′ R′ F R2 U′ R′ U′ R U R′ F′. The two front corners swap.',
        'No headlights anywhere? Do it once from any side and you’ll get some.' ],
      demos: [ { label: 'Swap front corners', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" } ] },
  ],
  '4': [
    { id: '4-intro', title: 'How big cubes work', summary: 'Built centers and paired edges.', practice: ['R', "R'", 'Rw', "Rw'", '2R', "2R'", 'U', "U'", 'Uw', "Uw'"],
      body: [
        'A 4x4 has no fixed centers: each face has a 2x2 block of center pieces that you build yourself.',
        'Edges come in pairs. Two matching edge pieces side by side act like one 3x3 edge.',
        'New notation: Rw turns the right two layers together, 2R turns only the second layer from the right.' ],
      demos: [ { label: 'Centers', alg: '', mask: 'centers' }, { label: 'Edges', alg: '', mask: 'edges' }, { label: 'Rw', alg: 'Rw' }, { label: '2R', alg: '2R' } ] },
    { id: '4-centers', title: 'Step 1: Build the centers', summary: 'White, yellow, then the four sides.',
      body: [
        'Build the white center first: make a pair of white center pieces, then a second pair, and join them into a 2x2 block.',
        'Build yellow on the opposite side. Then build the four side centers in the right order: with white on top, going around the cube it’s green, red, blue, orange.',
        'A useful pattern: Rw U Rw′ lifts a center piece onto the top and puts the slice back.' ],
      demos: [ { label: 'Bring a piece up', alg: CENTER, mask: 'centers' } ] },
    { id: '4-edges', title: 'Step 2: Pair the edges', summary: 'Slice, swap in, slice back.',
      body: [
        'Find two matching edge pieces. Put one on the left and one on the right of the front face, at the same height.',
        'Turn Uw to line them up, take the finished pair out of the way with R U R′ F R′ F′ R, then turn Uw′ to put the centers back.',
        'Pair 8 edges this way, then the last 4 get easier because there’s little left to break.' ],
      demos: [ { label: 'Pair an edge', alg: PAIR, mask: 'edges' } ] },
    { id: '4-three', title: 'Step 3: Solve it like a 3x3', summary: 'Outer turns only.',
      body: [
        'With centers built and edges paired, the 4x4 behaves like a 3x3. Use the 3x3 steps you know.',
        'Only turn the outer layers (R, U, F, and so on). Turning an inner layer now breaks your centers.',
        'Two situations can’t happen on a 3x3. These are parity, and the next two lessons fix them.' ] },
    { id: '4-oll', title: 'Parity: one flipped edge', summary: 'The famous long algorithm.',
      body: [
        'At the yellow cross step you may see a single flipped edge, which is impossible on a 3x3.',
        'Hold the flipped edge at the front on top and do 2R2 B2 U2 2L U2 2R′ U2 2R U2 F2 2R F2 2L′ B2 2R2.',
        'Then continue with the 3x3 steps.' ],
      demos: [ { label: 'Flip one edge', alg: L4_OLL } ] },
    { id: '4-pll', title: 'Parity: two swapped edges', summary: 'Short and easy.',
      body: [
        'At the end you may find two opposite edges swapped (front and back). That’s PLL parity.',
        'Hold them at the front and back and do 2R2 U2 2R2 Uw2 2R2 2U2.',
        'If two corners look swapped instead, solve them with the 3x3 corner step and the edges will show this case.' ],
      demos: [ { label: 'Swap front and back edges', alg: L4_PLL } ] },
  ],
  '5': [
    { id: '5-intro', title: 'Meet the 5x5', summary: 'Fixed centers, three-piece edges.', practice: ['R', "R'", 'Rw', "Rw'", '2R', "2R'", '3R', "3R'", 'U', "U'"],
      body: [
        'A 5x5 has a real center piece on each face, so face colors are fixed like on a 3x3.',
        'Each face has a 3x3 block of center pieces to build. Each edge is three pieces: a middle and two wings.',
        '3R turns the middle layer. Rw turns the right two layers, 3Rw the right three.' ],
      demos: [ { label: 'Centers', alg: '', mask: 'centers' }, { label: 'Edges', alg: '', mask: 'edges' }, { label: '3R', alg: '3R' }, { label: 'Rw', alg: 'Rw' } ] },
    { id: '5-centers', title: 'Step 1: Build the centers', summary: 'Bars of three, then blocks.',
      body: [
        'Build each center as three bars of three. Start with white, then yellow, then the four sides.',
        'The same pattern as 4x4 works: Rw U Rw′ lifts pieces onto the top face.',
        'The middle center is fixed, so the side order is automatic.' ],
      demos: [ { label: 'Bring a piece up', alg: CENTER, mask: 'centers' } ] },
    { id: '5-edges', title: 'Step 2: Pair the edges', summary: 'Wings onto the middle piece.',
      body: [
        'Match both wings to each middle edge piece. Use the 4x4 trick: line up, Uw, swap out with R U R′ F R′ F′ R, Uw′.',
        'Work in groups: pair the first 8 edges freely, then use the free slots for the last 4.' ],
      demos: [ { label: 'Pair a wing', alg: PAIR, mask: 'edges' } ] },
    { id: '5-parity', title: 'Last edge parity', summary: 'When the final edge won’t pair.',
      body: [
        'Sometimes the very last edge has its wings swapped. Hold it at the front on top.',
        'Do 2R2 B2 U2 2L U2 2R′ U2 2R U2 F2 2R F2 2L′ B2 2R2. It swaps the two wings of that edge.',
        'After that, solve it like a 3x3 with outer turns only. A 5x5 has no PLL parity.' ],
      demos: [ { label: 'Swap two wings', alg: L4_OLL } ] },
  ],
  'tips': [
    { id: 'tip-fingers', title: 'Finger tricks', summary: 'Turn with fingers, not wrists.',
      body: [
        'Hold the cube with thumbs on the front and fingers on the back. Turn R with your right wrist, but flick U with your right index finger.',
        'U′ is a left index finger flick. F can be done with your right thumb pushing up.',
        'Practise R U R′ U′ (the most common pattern) until it flows without regrips.' ],
      demos: [ { label: "R U R' U'", alg: "R U R' U'" } ] },
    { id: 'tip-look', title: 'Look ahead', summary: 'Slow down to speed up.',
      body: [
        'Pauses cost more time than slow turns. Turn slower and keep your eyes on the next piece you need.',
        'Practise with a metronome: one move per beat, no pauses. Speed up the beat over time.' ] },
    { id: 'tip-cross', title: 'Cross on the bottom', summary: 'See your F2L sooner.',
      body: [
        'Fast solvers build the cross on the bottom from the start, so they never flip the cube and can see the next pieces.',
        'Plan the whole cross during the 15-second inspection. It takes 8 moves or fewer.' ] },
    { id: 'tip-triggers', title: 'Learn triggers', summary: 'Short patterns inside long algorithms.',
      body: [
        'Most algorithms are made of a few short patterns: R U R′ U′ (sexy move), R′ F R F′ (sledgehammer), R U R′ U R U2 R′ (Sune).',
        'Learn these as single gestures and long algorithms get much easier to remember.' ],
      demos: [ { label: 'Sledgehammer', alg: "R' F R F'" }, { label: 'Sune', alg: "R U R' U R U2 R'" } ] },
    { id: 'tip-care', title: 'Cube care', summary: 'Tension and lube.',
      body: [
        'A cube that pops or catches is often too loose or too tight. Most speedcubes have adjustable tension screws under the center caps.',
        'Silicone lube makes turning smoother. A drop on the core is enough; wipe off the excess.',
        'Keep stickers clean so the camera can read them.' ] },
    { id: 'tip-practice', title: 'Practise with the game', summary: 'Daily challenge and best times.',
      body: [
        'The Play tab has a daily challenge (same scramble for everyone that day) and best times for every size.',
        'Start on Easy to learn how pieces move, then try a full scramble.' ] },
  ],
};

export function lessonById(id) {
  for (const [track, list] of Object.entries(LESSONS)) { const l = list.find(x => x.id === id); if (l) return { track, lesson: l }; }
  return null;
}

// Which original stickers stay colored for a mask. geom: model geometry, M = N - 1.
export function maskFn(name, model) {
  const M = model.N - 1, k = i => model.kind(i), y = i => model.geom[i].p[1];
  const isDFace = i => ((i / model.per) | 0) === 3;
  switch (name) {
    case 'centers': return i => k(i) === 'center';
    case 'edges': return i => k(i) === 'edge';
    case 'corners': return i => k(i) === 'corner';
    case 'cross': return i => k(i) === 'center' || (k(i) === 'edge' && y(i) === M);
    case 'layer1': return i => (k(i) === 'center' && model.N % 2 === 1) || y(i) === M;
    case 'f2l': return i => k(i) === 'center' || y(i) > -M;
    case 'oll': return i => k(i) === 'center' || y(i) > -M || isDFace(i);
    case 'llEdges': return i => k(i) === 'center' || y(i) > -M || k(i) === 'edge';
    default: return () => true;
  }
}
