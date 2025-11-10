precision mediump float;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uPointer;

varying vec2 vUv;
varying float vDistortion;

float random(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float time = uTime * 0.2;

  float scanline = sin((uv.y + time * 0.35) * 120.0) * 0.0015;
  float glitch = sin((uv.x + time * 2.0) * 6.2831) * 0.002;

  float pointerFocus = 1.0 - smoothstep(0.0, 0.55, distance(uPointer, uv));

  vec2 offsetR = vec2(glitch + scanline * 1.2, 0.0);
  vec2 offsetB = vec2(-glitch + scanline * 0.8, 0.0);

  vec3 color;
  color.r = texture2D(uTexture, uv + offsetR * 1.5).r;
  color.g = texture2D(uTexture, uv).g;
  color.b = texture2D(uTexture, uv + offsetB * 1.8).b;

  float grain = (random(uv * (uTime * 0.07 + 1.0)) - 0.5) * 0.08;
  float lum = vDistortion * 0.9 + pointerFocus * 0.18;

  color += lum + grain;

  float vignette = smoothstep(1.25, 0.35, length(uv - 0.5));
  color *= mix(0.94, 1.06, vignette);

  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
