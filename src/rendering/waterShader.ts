/**
 * V2 background: a pool of jade water seen from above, rendered in one
 * fragment shader. Everything is procedural (no textures):
 *   - depth: deep teal in the shade, sunlit jade shallows toward the lower right;
 *   - caustics: the moving net of light on the riverbed (animated Voronoi edges,
 *     domain-warped so the net never looks like a grid);
 *   - soft leaf shadows from branches overhead, drifting slowly;
 *   - raindrop ripples: rings travelling outward whose slope refracts the
 *     riverbed and catches the light;
 *   - a soft vignette and fine film grain.
 */

export const MAX_DROPS = 10

export const VERTEX = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
/* x, y (in aspect space: x in [0, aspect], y in [0, 1], origin bottom-left), start time, strength */
uniform vec4 uDrops[${MAX_DROPS}];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash2(vec2 p) {
  float n = hash(p);
  return vec2(n, hash(p + n + 17.0));
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

/* Light focused by the waves: bright along the edges of slowly moving cells. */
float causticLayer(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float f1 = 8.0, f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
  }
  return exp(-(f2 - f1) * 9.0);
}
float caustics(vec2 p, float t) {
  vec2 w = p + 0.55 * vec2(fbm(p * 0.7 + t * 0.05), fbm(p * 0.7 - t * 0.04 + 7.3));
  float a = causticLayer(w * 1.0, t * 0.55);
  float b = causticLayer(w * 1.7 + 3.1, t * 0.7 + 1.3);
  return a * 0.65 + a * b * 1.6 + b * 0.2;
}

/* Surface height: a faint swell plus the raindrop rings. */
float height(vec2 p) {
  float h = (fbm(p * 2.6 + vec2(uTime * 0.035, -uTime * 0.02)) - 0.5) * 0.004;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    vec4 d = uDrops[i];
    float age = uTime - d.z;
    if (age < 0.0 || age > 11.0 || d.w <= 0.0) continue;
    float dist = length(p - d.xy);
    float x = dist - age * 0.09;
    float width = 0.03 + age * 0.018;
    float env = exp(-(x * x) / (width * width)) * exp(-age * 0.3) * smoothstep(0.0, 0.25, age);
    h += sin(x * 110.0) * env * d.w * 0.0034 / (0.3 + dist * 2.0);
  }
  return h;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  /* Slope of the surface, by finite differences. */
  float e = 1.0 / uRes.y;
  float h0 = height(p);
  vec2 grad = vec2(height(p + vec2(e, 0.0)) - h0, height(p + vec2(0.0, e)) - h0) / e;

  /* The riverbed, seen through the moving surface. */
  vec2 bed = p + grad * 0.06;

  /* One light for the whole scene: shade in the upper left, sunlit shallows toward the lower right.
     Every layer below takes its strength from it, so they read as a single body of water. */
  vec2 sunAt = vec2(0.7 * aspect, 0.12);
  float sun = exp(-pow(length((p - sunAt) * vec2(0.8, 1.05)), 2.0) * 1.9);
  float glow = clamp(0.62 * (1.0 - uv.y) + 0.38 * uv.x, 0.0, 1.0);

  /* Depth: a smooth grade from deep teal through emerald to jade. */
  vec3 abyss   = vec3(0.028, 0.118, 0.122);
  vec3 teal    = vec3(0.055, 0.215, 0.205);
  vec3 emerald = vec3(0.125, 0.350, 0.275);
  vec3 jade    = vec3(0.430, 0.640, 0.455);
  vec3 col = mix(abyss, teal, smoothstep(0.0, 0.45, glow));
  col = mix(col, emerald, smoothstep(0.35, 0.95, glow) * 0.85);
  col = mix(col, jade, sun * 0.7);
  /* The bed is not flat: very broad, gentle variation only. */
  col *= 0.94 + 0.12 * fbm(bed * 0.9 + 4.0);

  /* Shadows of leaves overhead: broad and soft-edged, drifting slowly, mostly in the upper left. */
  vec2 sway = vec2(sin(t * 0.13), cos(t * 0.11)) * 0.02;
  float leaves = fbm(bed * 1.9 + sway + vec2(2.0, 5.0));
  float shade = smoothstep(0.4, 0.72, leaves) * (1.0 - glow * 0.8);
  col *= 1.0 - shade * 0.3;

  /* Caustics: a quiet net of light, gathered into slow soft patches rather than spread evenly. */
  float c = caustics(bed * 4.5, t);
  float patches = 0.35 + 0.65 * smoothstep(0.35, 0.75, fbm(bed * 0.7 + vec2(t * 0.012, -t * 0.009) + 9.0));
  float light = (0.15 + 0.85 * glow) * (0.6 + sun * 0.8) * (1.0 - shade * 0.7) * patches;
  col += c * light * vec3(0.78, 0.95, 0.74) * 0.22;

  /* Ripples catch the light on one side and fall into shadow on the other. */
  float lit = dot(grad, normalize(vec2(-0.55, 0.85)));
  col += lit * 0.5 * vec3(0.75, 0.95, 0.85) * (0.45 + sun);
  col += pow(max(lit, 0.0), 1.5) * 0.3 * vec3(0.9, 1.0, 0.92);

  /* Vignette: a soft, wide falloff that keeps the corners calm without crushing them. */
  float v = length((uv - vec2(0.55, 0.5)) * vec2(aspect * 0.7, 1.0));
  col *= mix(1.0, 0.62, smoothstep(0.3, 1.25, v));

  /* Grade: a gentle filmic shoulder, highlights warmed a touch, then fine grain. */
  col = col / (1.0 + col * 0.4);
  col = mix(col, col * vec3(1.03, 1.0, 0.95), smoothstep(0.25, 0.6, dot(col, vec3(0.33))));
  col += (hash(gl_FragCoord.xy + fract(t * 7.0) * 311.0) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}
`
