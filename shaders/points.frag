precision mediump float;

varying vec3 vColor;

void main() {
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  float alpha = smoothstep(0.5, 0.0, dist);
  alpha *= alpha;

  if (alpha < 0.01) {
    discard;
  }

  vec3 color = vColor;
  gl_FragColor = vec4(color, alpha);
}
