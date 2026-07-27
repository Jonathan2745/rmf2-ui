export const SCENE_URL =
  'https://downloads.rmf-industrial.org/rmf2-ui/RMF2_SIM_20260611/scene.draco.glb';
// export const ROBOT_MODEL_URL = '/robot.glb';
export const AMR_URL =
  'https://downloads.rmf-industrial.org/rmf2-ui/RMF2_SIM_20260611/amr.glb';
export const FORKLIFT_URL =
  'https://downloads.rmf-industrial.org/rmf2-ui/RMF2_SIM_20260611/forklift.glb';

// const ROBOTS_CONFIG_URL = '/robots.json';

// replaced with API route
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8008';
export const ROBOTS_CONFIG_URL = `${API_BASE_URL}/api/robots`;

export const ROBOT_CONFIG_REFRESH_MS = 1000;
export const ROBOT_POSITION_POLL_MS = 100;
export const ROBOT_ARRIVAL_EPSILON = 0.05;
export const ROBOT_COLLISION_PADDING = 0.05;
export const STATIC_COLLISION_IGNORE_NAMES = new Set(['Box128', 'Box127']);
export const ROBOT_MODEL_HEADING_OFFSET = -Math.PI / 2; // model faces +X, but we want it to face +Y

// const SCENE_URL = '/scene.draco.glb';
export const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

export const INTRO_DURATION_MS = 500;
export const INTRO_START_DISTANCE_FACTOR = 1.5;

export const END_DISTANCE_FACTOR = 0.75;
export const END_VIEW_ANGLE = Math.PI / 4;

export const DEFAULT_ORGANISATION = 'ros-industrial';

export const ROBOT_TRAIL_Z_OFFSET = 0.08;
export const ROBOT_TRAIL_LINE_WIDTH = 0.2;
export const DEFAULT_ROBOT_COLOR = '#00A3FF';

export const INITIAL_SHOW_ROOF_SLICE = true;
export const INITIAL_ROOF_SLICE_HEIGHT = 3.4;

export const MOTION_DURATION_SECONDS = ROBOT_POSITION_POLL_MS / 1000;
