import { ROBOT_MODEL_HEADING_OFFSET } from '../constants';

export function movementHeadingToModelHeading(heading: number) {
  return heading + ROBOT_MODEL_HEADING_OFFSET;
}

export function modelHeadingToMovementHeading(modelHeading: number) {
  return modelHeading - ROBOT_MODEL_HEADING_OFFSET;
}

export function getInitialModelHeading(rotationZ?: number) {
  return (rotationZ ?? 0) + ROBOT_MODEL_HEADING_OFFSET;
}
