precision highp float;

uniform float uTime;
uniform vec2 uPointer;

varying vec2 vUv;
varying float vDistortion;

float hash(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p.x + p.y + p.z) * 43758.5453);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);

  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, u.x);
  float nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x);
  float nx11 = mix(n011, n111, u.x);

  float nxy0 = mix(nx00, nx10, u.y);
  float nxy1 = mix(nx01, nx11, u.y);

  return mix(nxy0, nxy1, u.z);
}

void main() {
  vUv = uv;

  float time = uTime * 0.35;
  float n1 = noise(vec3(position.xy * 1.35, time));
  float n2 = noise(vec3(position.yx * 2.1, time * 0.7));

  float pointerDist = distance(uPointer, vUv);
  float pointerInfluence = 1.0 - smoothstep(0.0, 0.6, pointerDist);

  float displacement = (n1 * 0.12 + n2 * 0.06 - 0.011) + pointerInfluence * 0.08;

  vDistortion = displacement;

  vec3 displacedPosition = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
