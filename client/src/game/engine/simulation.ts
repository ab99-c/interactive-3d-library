export type Spring = { value: number; velocity: number; target: number; stiffness: number; damping: number };

export function createSpring(value = 0, stiffness = 180, damping = 24): Spring {
  return { value, velocity: 0, target: value, stiffness, damping };
}

export function stepSpring(spring: Spring, dt: number) {
  const acceleration = (spring.target - spring.value) * spring.stiffness - spring.velocity * spring.damping;
  spring.velocity += acceleration * dt;
  spring.value += spring.velocity * dt;
  if (Math.abs(spring.target - spring.value) < 0.0005 && Math.abs(spring.velocity) < 0.0005) {
    spring.value = spring.target;
    spring.velocity = 0;
  }
  return spring.value;
}

export function damp(current: number, target: number, sharpness: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-sharpness * dt));
}
