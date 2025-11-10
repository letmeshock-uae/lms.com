precision highp float;

uniform float uTime;
uniform float uPixelRatio;

attribute float aScale;
attribute float aSeed;
attribute float aPhase;
attribute vec3 color;

varying vec3 vColor;

void main() {
  vColor = color;

  float t = uTime * 0.45 + aSeed;

  vec3 displaced = position;
  displaced.x += sin(t) * 0.22;
  displaced.y += cos(t * 1.2) * 0.18;
  displaced.z += sin(t * 0.8) * 0.24;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

  float size = aScale + sin(uTime * 2.0 + aPhase) * 0.8;
  size = max(size, 6.0);

  gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
