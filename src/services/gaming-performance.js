import { byId } from './build.js';

/*
 * A deliberately small, versioned estimate model — not a benchmark database.
 *
 * GPU indices use the catalogue's curated `scores.gaming` value (falling back to
 * its documented tier). The result is calibrated around an 80-point GPU and
 * 78-point CPU at 1440p / Medium. The relative approach follows the resolution
 * testing principle used by independent review suites such as Tom's Hardware's
 * GPU hierarchy: compare consistent settings, several games and several runs,
 * rather than treating a single result as a guarantee.
 * Source/methodology reference: https://www.tomshardware.com/reviews/gpu-hierarchy,4388.html
 *
 * The game baselines below are maintained estimates for the clearly stated
 * settings. They intentionally exclude upscaling, frame generation and ray
 * tracing. Add a per-GPU override here only after reviewing repeatable public
 * benchmark data for the same game, resolution and settings.
 */
const RESOLUTION = {
  '1080p': { gpu: 1.30, cpu: 1.08 },
  '1440p': { gpu: 1, cpu: 1 },
  '4K': { gpu: 0.52, cpu: 0.86 }
};

const GAMES = [
  { id:'fortnite', name:'Fortnite', note:'Medium · native resolution', fps:105, cpuWeight:.28 },
  { id:'cs2', name:'Counter-Strike 2', note:'Medium · native resolution', fps:178, cpuWeight:.55 },
  { id:'minecraft', name:'Minecraft (Java, no shaders)', note:'Medium / typical settings · no shaders', fps:190, cpuWeight:.62 },
  { id:'valorant', name:'Valorant', note:'Medium · native resolution', fps:235, cpuWeight:.68 }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const scoreFor = part => part?.scores?.gaming ?? part?.specs?.tier ?? 50;
const partIn = (ids, category) => byId(ids.find(id => byId(id)?.category === category));

export function estimateGamingPerformance(ids, resolution = '1440p') {
  const selectedResolution = RESOLUTION[resolution] ? resolution : '1440p';
  const gpu = partIn(ids, 'gpu');
  const cpu = partIn(ids, 'cpu');
  if (!gpu || !cpu) return null;

  const gpuRatio = clamp(scoreFor(gpu) / 80, .42, 1.32);
  const cpuRatio = clamp(scoreFor(cpu) / 78, .60, 1.25);
  const resolutionFactor = RESOLUTION[selectedResolution];

  return {
    resolution: selectedResolution,
    settings: 'Medium',
    gpu: gpu.name,
    cpu: cpu.name,
    games: GAMES.map(game => {
      // Esports and Java Minecraft are more CPU-sensitive than GPU-heavy games.
      const cpuFactor = 1 + ((cpuRatio * resolutionFactor.cpu) - 1) * game.cpuWeight;
      const estimate = Math.max(30, Math.round(game.fps * gpuRatio * resolutionFactor.gpu * cpuFactor));
      const spread = Math.max(8, Math.round(estimate * .14));
      return {
        ...game,
        min: Math.max(20, estimate - spread),
        max: estimate + spread
      };
    })
  };
}

