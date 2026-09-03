var e=`#ifndef ZED_OCTAHEDRAL_INCLUDED
#define ZED_OCTAHEDRAL_INCLUDED
#ifndef PI
#define PI 3.14159265358979323846
#endif
vec2 zoct_signNotZero(vec2 v) {
return vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
}
vec2 octEncode(vec3 dir) {
vec2 p = dir.xy / (abs(dir.x) + abs(dir.y) + abs(dir.z));
return (dir.z < 0.0) ? (1.0 - abs(p.yx)) * zoct_signNotZero(p) : p;
}
vec3 octDecode(vec2 e) {
vec3 dir = vec3(e.x, e.y, 1.0 - abs(e.x) - abs(e.y));
if (dir.z < 0.0) dir.xy = (1.0 - abs(dir.yx)) * zoct_signNotZero(dir.xy);
return normalize(dir);
}
vec2 dirToUV(vec3 dir) { return octEncode(dir) * 0.5 + 0.5; }
vec3 uvToDir(vec2 uv)  { return octDecode(uv * 2.0 - 1.0); }
vec3 sampleOctEnv(highp sampler2D envMap, vec3 dir, vec2 texelSize) {
vec2 uv = dirToUV(dir);
uv = clamp(uv, 0.5 * texelSize, 1.0 - 0.5 * texelSize);
return texture(envMap, uv).rgb;
}
vec3 sampleOctEnvLod(highp sampler2D envMap, vec3 dir, vec2 texelSize, float lod) {
vec2 mipTexel = texelSize * exp2(lod + 1.0);
vec2 uv = clamp(dirToUV(dir), 0.5 * mipTexel, 1.0 - 0.5 * mipTexel);
return textureLod(envMap, uv, lod).rgb;
}
ivec2 zoct_wrapTexel(ivec2 t, ivec2 sz) {
ivec2 wrapped = ((t % sz) + sz) % sz;
bool mirror = ((((abs(t.x / sz.x) + int(t.x < 0)) ^
(abs(t.y / sz.y) + int(t.y < 0))) & 1) != 0);
return mirror ? (sz - (wrapped + ivec2(1))) : wrapped;
}
vec3 zoct_bilinearLod(highp sampler2D envMap, vec2 uv, int lod) {
ivec2 sz = textureSize(envMap, lod);
vec2 p = uv * vec2(sz) - 0.5;
vec2 f = fract(p);
ivec2 i = ivec2(floor(p));
vec3 c00 = texelFetch(envMap, zoct_wrapTexel(i + ivec2(0, 0), sz), lod).rgb;
vec3 c10 = texelFetch(envMap, zoct_wrapTexel(i + ivec2(1, 0), sz), lod).rgb;
vec3 c01 = texelFetch(envMap, zoct_wrapTexel(i + ivec2(0, 1), sz), lod).rgb;
vec3 c11 = texelFetch(envMap, zoct_wrapTexel(i + ivec2(1, 1), sz), lod).rgb;
return mix(mix(c00, c10, f.x), mix(c01, c11, f.x), f.y);
}
vec3 sampleOctEnvSeamless(highp sampler2D envMap, vec3 dir) {
return zoct_bilinearLod(envMap, dirToUV(dir), 0);
}
vec3 sampleOctEnvLodSeamless(highp sampler2D envMap, vec3 dir, float lod) {
float maxLod = log2(float(textureSize(envMap, 0).x));
lod = clamp(lod, 0.0, maxLod);
vec2 uv = dirToUV(dir);
int l0 = int(floor(lod));
int l1 = min(l0 + 1, int(maxLod));
return mix(zoct_bilinearLod(envMap, uv, l0),
zoct_bilinearLod(envMap, uv, l1), lod - float(l0));
}
float zoct_radicalInverse_VdC(uint bits) {
bits = (bits << 16u) | (bits >> 16u);
bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
return float(bits) * 2.3283064365386963e-10;
}
vec2 hammersley(uint i, uint n) {
return vec2(float(i) / float(n), zoct_radicalInverse_VdC(i));
}
float distributionGGX(float NdotH, float roughness) {
float a = roughness * roughness;
float a2 = a * a;
float d = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
return a2 / max(PI * d * d, 1e-7);
}
vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
float a = roughness * roughness;
float phi = 2.0 * PI * Xi.x;
float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
vec3 h = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
vec3 tangent = normalize(cross(up, N));
vec3 bitangent = cross(N, tangent);
return normalize(tangent * h.x + bitangent * h.y + N * h.z);
}
float geometrySchlickGGX_IBL(float NdotV, float roughness) {
float a = roughness;
float k = (a * a) / 2.0;
return NdotV / (NdotV * (1.0 - k) + k);
}
float geometrySmith_IBL(float NdotV, float NdotL, float roughness) {
return geometrySchlickGGX_IBL(NdotV, roughness) * geometrySchlickGGX_IBL(NdotL, roughness);
}
#endif`,t=`#ifndef ZED_SDF_COMMON_INCLUDED
#define ZED_SDF_COMMON_INCLUDED
#ifndef ZSDF_POLY_MAX
#define ZSDF_POLY_MAX 16
#endif
vec2 sdScreenCoord(vec2 fragCoord, vec2 resolution) {
return (2.0 * fragCoord - resolution) / resolution.y;
}
float _zsdf_dot2(vec2 v) { return dot(v, v); }
float _zsdf_dot2(vec3 v) { return dot(v, v); }
float _zsdf_ndot(vec2 a, vec2 b) { return a.x * b.x - a.y * b.y; }
#endif`,n=`#ifndef ZED_SDF_OPS_INCLUDED
#define ZED_SDF_OPS_INCLUDED
float opUnion(float a, float b)     { return min(a, b); }
float opSubtract(float a, float b)  { return max(-a, b); }
float opIntersect(float a, float b) { return max(a, b); }
float opXor(float a, float b)       { return max(min(a, b), -max(a, b)); }
vec2 opUnion(vec2 a, vec2 b)     { return a.x < b.x ? a : b; }
vec2 opSubtract(vec2 a, vec2 b)  { return vec2(max(-a.x, b.x), b.y); }
vec2 opIntersect(vec2 a, vec2 b) { return vec2(max(a.x, b.x), b.y); }
float opSmoothUnion(float a, float b, float k) {
float kk = max(k, 1e-6);
float h = clamp(0.5 + 0.5 * (b - a) / kk, 0.0, 1.0);
return mix(b, a, h) - kk * h * (1.0 - h);
}
float opSmoothSubtract(float a, float b, float k) {
float kk = max(k, 1e-6);
float h = clamp(0.5 - 0.5 * (b + a) / kk, 0.0, 1.0);
return mix(b, -a, h) + kk * h * (1.0 - h);
}
float opSmoothIntersect(float a, float b, float k) {
float kk = max(k, 1e-6);
float h = clamp(0.5 - 0.5 * (b - a) / kk, 0.0, 1.0);
return mix(b, a, h) + kk * h * (1.0 - h);
}
vec2 opSmoothUnionBlend(float a, float b, float k) {
float kk = max(k, 1e-6);
float h = clamp(0.5 + 0.5 * (b - a) / kk, 0.0, 1.0);
return vec2(mix(b, a, h) - kk * h * (1.0 - h), h);
}
vec2 opSmoothUnion(vec2 a, vec2 b, float k) {
vec2 r = opSmoothUnionBlend(a.x, b.x, k);
return vec2(r.x, r.y > 0.5 ? a.y : b.y);
}
float opChamferUnion(float a, float b, float r) {
return min(min(a, b), (a - r + b) * 0.70710678);
}
float opChamferIntersect(float a, float b, float r) {
return max(max(a, b), (a + r + b) * 0.70710678);
}
float opChamferSubtract(float a, float b, float r) {
return opChamferIntersect(-a, b, r);
}
float opRound(float d, float r)         { return d - r; }
float opOnion(float d, float thickness) { return abs(d) - thickness; }
float opExtrude(float d2, float pz, float h) {
vec2 w = vec2(d2, abs(pz) - h);
return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}
vec2 opRevolve(vec3 p, float offset) {
return vec2(length(p.xz) - offset, p.y);
}
vec2 opRotate(vec2 p, float angle) {
float c = cos(angle);
float s = sin(angle);
return vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
}
vec3 opRotateX(vec3 p, float angle) {
float c = cos(angle);
float s = sin(angle);
return vec3(p.x, c * p.y + s * p.z, -s * p.y + c * p.z);
}
vec3 opRotateY(vec3 p, float angle) {
float c = cos(angle);
float s = sin(angle);
return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}
vec3 opRotateZ(vec3 p, float angle) {
float c = cos(angle);
float s = sin(angle);
return vec3(c * p.x + s * p.y, -s * p.x + c * p.y, p.z);
}
vec3 opRotateAxis(vec3 p, vec3 axis, float angle) {
float c = cos(angle);
float s = sin(angle);
return p * c - cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}
vec2 opRepeat(vec2 p, vec2 spacing) {
vec2 s = max(spacing, vec2(0.0));
return p - s * round(p / max(s, vec2(1e-6)));
}
vec3 opRepeat(vec3 p, vec3 spacing) {
vec3 s = max(spacing, vec3(0.0));
return p - s * round(p / max(s, vec3(1e-6)));
}
vec2 opRepeat(vec2 p, vec2 spacing, out vec2 cellId) {
vec2 s = max(spacing, vec2(0.0));
cellId = round(p / max(s, vec2(1e-6))) * step(vec2(1e-6), s);
return p - s * cellId;
}
vec3 opRepeat(vec3 p, vec3 spacing, out vec3 cellId) {
vec3 s = max(spacing, vec3(0.0));
cellId = round(p / max(s, vec3(1e-6))) * step(vec3(1e-6), s);
return p - s * cellId;
}
vec2 opRepeatLim(vec2 p, float spacing, vec2 limit) {
float s = max(spacing, 1e-6);
return p - s * clamp(round(p / s), -limit, limit);
}
vec3 opRepeatLim(vec3 p, float spacing, vec3 limit) {
float s = max(spacing, 1e-6);
return p - s * clamp(round(p / s), -limit, limit);
}
vec2 opRepeatPolar(vec2 p, float sectors) {
float n = max(sectors, 1.0);
float sector = TWO_PI / n;
float a = atan(p.y, p.x);
float b = a - sector * floor((a + sector * 0.5) / sector);
return length(p) * vec2(cos(b), sin(b));
}
vec2 opRepeatPolar(vec2 p, float sectors, out float sectorId) {
float n = max(sectors, 1.0);
float sector = TWO_PI / n;
float a = atan(p.y, p.x);
float raw = floor((a + sector * 0.5) / sector);
float b = a - raw * sector;
sectorId = mod(raw, n);
return length(p) * vec2(cos(b), sin(b));
}
vec4 opElongate(vec3 p, vec3 h) {
vec3 q = abs(p) - h;
return vec4(max(q, 0.0), min(max(q.x, max(q.y, q.z)), 0.0));
}
vec3 opTwist(vec3 p, float k) {
float c = cos(k * p.y);
float s = sin(k * p.y);
return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
vec3 opBend(vec3 p, float k) {
float c = cos(k * p.x);
float s = sin(k * p.x);
return vec3(c * p.x + s * p.y, -s * p.x + c * p.y, p.z);
}
#endif`,r=`#ifndef ZED_SDF_2D_INCLUDED
#define ZED_SDF_2D_INCLUDED
float sdCircle(vec2 p, float r) {
return length(p) - r;
}
float sdBox(vec2 p, vec2 halfSize) {
vec2 d = abs(p) - halfSize;
return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float sdRoundedBox(vec2 p, vec2 halfSize, vec4 radii) {
vec2 r = (p.x > 0.0) ? radii.xy : radii.zw;
r.x = (p.y > 0.0) ? r.x : r.y;
vec2 q = abs(p) - halfSize + r.x;
return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}
float sdSegment(vec2 p, vec2 a, vec2 b) {
vec2 pa = p - a;
vec2 ba = b - a;
float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0);
return length(pa - ba * h);
}
float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
vec2 e0 = b - a, e1 = c - b, e2 = a - c;
vec2 v0 = p - a, v1 = p - b, v2 = p - c;
vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / max(_zsdf_dot2(e0), 1e-12), 0.0, 1.0);
vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / max(_zsdf_dot2(e1), 1e-12), 0.0, 1.0);
vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / max(_zsdf_dot2(e2), 1e-12), 0.0, 1.0);
float s = sign(e0.x * e2.y - e0.y * e2.x);
vec2 d = min(min(vec2(_zsdf_dot2(pq0), s * (v0.x * e0.y - v0.y * e0.x)),
vec2(_zsdf_dot2(pq1), s * (v1.x * e1.y - v1.y * e1.x))),
vec2(_zsdf_dot2(pq2), s * (v2.x * e2.y - v2.y * e2.x)));
return -sqrt(d.x) * sign(d.y);
}
float sdEquilateralTriangle(vec2 p, float r) {
const float k = 1.73205081;
vec2 q = vec2(abs(p.x) - r, p.y + r / k);
if (q.x + k * q.y > 0.0) q = vec2(q.x - k * q.y, -k * q.x - q.y) / 2.0;
q.x -= clamp(q.x, -2.0 * r, 0.0);
return -length(q) * sign(q.y);
}
float sdNgon(vec2 p, float r, float sides) {
float n = max(sides, 3.0);
float an = PI / n;
vec2 acs = vec2(cos(an), sin(an));
float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
vec2 q = length(p) * vec2(cos(bn), abs(sin(bn)));
q -= r * acs;
q.y += clamp(-q.y, 0.0, r * acs.y);
return length(q) * sign(q.x);
}
float sdPolygon(vec2 p, vec2 verts[ZSDF_POLY_MAX], int count) {
int n = clamp(count, 3, ZSDF_POLY_MAX);
float d = _zsdf_dot2(p - verts[0]);
float s = 1.0;
for (int i = 0, j = n - 1; i < n; j = i, i++) {
vec2 e = verts[j] - verts[i];
vec2 w = p - verts[i];
vec2 b = w - e * clamp(dot(w, e) / max(dot(e, e), 1e-12), 0.0, 1.0);
d = min(d, dot(b, b));
bvec3 c = bvec3(p.y >= verts[i].y, p.y < verts[j].y, e.x * w.y > e.y * w.x);
if (all(c) || all(not(c))) s = -s;
}
return s * sqrt(d);
}
float sdPentagon(vec2 p, float r) {
const vec3 k = vec3(0.809016994, 0.587785252, 0.726542528);
vec2 q = vec2(abs(p.x), p.y);
q -= 2.0 * min(dot(vec2(-k.x, k.y), q), 0.0) * vec2(-k.x, k.y);
q -= 2.0 * min(dot(vec2( k.x, k.y), q), 0.0) * vec2( k.x, k.y);
q -= vec2(clamp(q.x, -r * k.z, r * k.z), r);
return length(q) * sign(q.y);
}
float sdHexagon(vec2 p, float r) {
const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
vec2 q = abs(p);
q -= 2.0 * min(dot(k.xy, q), 0.0) * k.xy;
q -= vec2(clamp(q.x, -k.z * r, k.z * r), r);
return length(q) * sign(q.y);
}
float sdStar5(vec2 p, float r, float innerRatio) {
const vec2 k1 = vec2(0.809016994375, -0.587785252292);
const vec2 k2 = vec2(-k1.x, k1.y);
vec2 q = vec2(abs(p.x), p.y);
q -= 2.0 * max(dot(k1, q), 0.0) * k1;
q -= 2.0 * max(dot(k2, q), 0.0) * k2;
q = vec2(abs(q.x), q.y - r);
vec2 ba = innerRatio * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
float h = clamp(dot(q, ba) / _zsdf_dot2(ba), 0.0, r);
return length(q - ba * h) * sign(q.y * ba.x - q.x * ba.y);
}
float sdStar(vec2 p, float r, int points, float m) {
float n = max(float(points), 2.0);
float an = PI / n;
float en = PI / clamp(m, 2.0, n);
vec2 acs = vec2(cos(an), sin(an));
vec2 ecs = vec2(cos(en), sin(en));
float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
vec2 q = length(p) * vec2(cos(bn), abs(sin(bn)));
q -= r * acs;
q += ecs * clamp(-dot(q, ecs), 0.0, r * acs.y / ecs.y);
return length(q) * sign(q.x);
}
float sdArc(vec2 p, float halfAperture, float radius, float thickness) {
vec2 sc = vec2(sin(halfAperture), cos(halfAperture));
vec2 q = vec2(abs(p.x), p.y);
return ((sc.y * q.x > sc.x * q.y) ? length(q - sc * radius)
: abs(length(q) - radius)) - thickness;
}
float sdPie(vec2 p, float halfAperture, float r) {
vec2 c = vec2(sin(halfAperture), cos(halfAperture));
vec2 q = vec2(abs(p.x), p.y);
float l = length(q) - r;
float m = length(q - c * clamp(dot(q, c), 0.0, r));
return max(l, m * sign(c.y * q.x - c.x * q.y));
}
float sdRhombus(vec2 p, vec2 halfDiagonals) {
vec2 q = abs(p);
vec2 b = halfDiagonals;
float h = clamp(_zsdf_ndot(b - 2.0 * q, b) / max(dot(b, b), 1e-12), -1.0, 1.0);
float d = length(q - 0.5 * b * vec2(1.0 - h, 1.0 + h));
return d * sign(q.x * b.y + q.y * b.x - b.x * b.y);
}
float sdTrapezoid(vec2 p, float r1, float r2, float halfHeight) {
vec2 k1 = vec2(r2, halfHeight);
vec2 k2 = vec2(r2 - r1, 2.0 * halfHeight);
vec2 q = vec2(abs(p.x), p.y);
vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - halfHeight);
vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / max(_zsdf_dot2(k2), 1e-12), 0.0, 1.0);
float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
return s * sqrt(min(_zsdf_dot2(ca), _zsdf_dot2(cb)));
}
float sdVesica(vec2 p, float r, float d) {
vec2 q = abs(p);
float b = sqrt(max(r * r - d * d, 0.0));
return ((q.y - b) * d > q.x * b) ? length(q - vec2(0.0, b)) * sign(d)
: length(q - vec2(-d, 0.0)) - r;
}
float sdMoon(vec2 p, float d, float ra, float rb) {
vec2 q = vec2(p.x, abs(p.y));
float a = (ra * ra - rb * rb + d * d) / (2.0 * d);
float b = sqrt(max(ra * ra - a * a, 0.0));
if (d * (q.x * b - q.y * a) > d * d * max(b - q.y, 0.0)) {
return length(q - vec2(a, b));
}
return max(length(q) - ra, -(length(q - vec2(d, 0.0)) - rb));
}
float sdCross(vec2 p, vec2 arm, float r) {
vec2 q = abs(p);
q = (q.y > q.x) ? q.yx : q.xy;
vec2 d = q - arm;
float k = max(d.y, d.x);
vec2 w = (k > 0.0) ? d : vec2(arm.y - q.x, -k);
return sign(k) * length(max(w, 0.0)) + r;
}
float sdEllipse(vec2 p, vec2 radii) {
vec2 q = abs(p);
vec2 ab = radii;
if (q.x > q.y) { q = q.yx; ab = ab.yx; }
float l = ab.y * ab.y - ab.x * ab.x;
if (abs(l) < 1e-8) return length(q) - ab.x;
float m = ab.x * q.x / l;  float m2 = m * m;
float n = ab.y * q.y / l;  float n2 = n * n;
float c = (m2 + n2 - 1.0) / 3.0;
float c3 = c * c * c;
float qq = c3 + m2 * n2 * 2.0;
float d = c3 + m2 * n2;
float g = m + m * n2;
float co;
if (d < 0.0) {
float h = acos(clamp(qq / c3, -1.0, 1.0)) / 3.0;
float s = cos(h);
float t = sin(h) * 1.73205081;
float rx = sqrt(max(-c * (s + t + 2.0) + m2, 0.0));
float ry = sqrt(max(-c * (s - t + 2.0) + m2, 0.0));
co = (ry + sign(l) * rx + abs(g) / max(rx * ry, 1e-12) - m) / 2.0;
} else {
float h = 2.0 * m * n * sqrt(d);
float s = sign(qq + h) * pow(abs(qq + h), 1.0 / 3.0);
float u = sign(qq - h) * pow(abs(qq - h), 1.0 / 3.0);
float rx = -s - u - c * 4.0 + 2.0 * m2;
float ry = (s - u) * 1.73205081;
float rm = sqrt(rx * rx + ry * ry);
co = (ry / sqrt(max(rm - rx, 0.0) + 1e-12) + 2.0 * g / max(rm, 1e-12) - m) / 2.0;
}
float cc = clamp(co, -1.0, 1.0);
vec2 r = ab * vec2(cc, sqrt(max(1.0 - cc * cc, 0.0)));
return length(r - q) * sign(q.y - r.y);
}
float sdHeart(vec2 p) {
vec2 q = vec2(abs(p.x), p.y);
if (q.y + q.x > 1.0) {
return sqrt(_zsdf_dot2(q - vec2(0.25, 0.75))) - 0.35355339;
}
float t = max(q.x + q.y, 0.0);
return sqrt(min(_zsdf_dot2(q - vec2(0.0, 1.0)),
_zsdf_dot2(q - 0.5 * vec2(t, t)))) * sign(q.x - q.y);
}
float sdEgg(vec2 p, float ra, float rb) {
const float k = 1.73205081;
vec2 q = vec2(abs(p.x), p.y);
float r = ra - rb;
return ((q.y < 0.0)         ? length(vec2(q.x, q.y)) - r :
(k * (q.x + r) < q.y) ? length(vec2(q.x, q.y - k * r)) :
length(vec2(q.x + r, q.y)) - 2.0 * r) - rb;
}
float sdBezier(vec2 p, vec2 A, vec2 B, vec2 C) {
vec2 a = B - A;
vec2 b = A - 2.0 * B + C;
vec2 c = a * 2.0;
vec2 d = A - p;
float bb = dot(b, b);
if (bb < 1e-12) return sdSegment(p, A, C);
float kk = 1.0 / bb;
float kx = kk * dot(a, b);
float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
float kz = kk * dot(d, a);
float res;
float pp = ky - kx * kx;
float p3 = pp * pp * pp;
float qq = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
float h = qq * qq + 4.0 * p3;
if (h >= 0.0) {
h = sqrt(h);
vec2 x = (vec2(h, -h) - qq) / 2.0;
vec2 rt = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
float t = clamp(rt.x + rt.y - kx, 0.0, 1.0);
res = _zsdf_dot2(d + (c + b * t) * t);
} else {
float z = sqrt(-pp);
float v = acos(clamp(qq / (pp * z * 2.0), -1.0, 1.0)) / 3.0;
float mm = cos(v);
float nn = sin(v) * 1.73205081;
vec2 t = clamp(vec2(mm + mm, -nn - mm) * z - kx, 0.0, 1.0);
res = min(_zsdf_dot2(d + (c + b * t.x) * t.x),
_zsdf_dot2(d + (c + b * t.y) * t.y));
}
return sqrt(res);
}
#endif`,i=`#ifndef ZED_SDF_3D_INCLUDED
#define ZED_SDF_3D_INCLUDED
float sdSphere(vec3 p, float r) {
return length(p) - r;
}
float sdBox(vec3 p, vec3 halfSize) {
vec3 q = abs(p) - halfSize;
return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRoundBox(vec3 p, vec3 halfSize, float r) {
vec3 q = abs(p) - halfSize + r;
return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdBoxFrame(vec3 p, vec3 halfSize, float edge) {
vec3 a = abs(p) - halfSize;
vec3 q = abs(a + edge) - edge;
return min(min(
length(max(vec3(a.x, q.y, q.z), 0.0)) + min(max(a.x, max(q.y, q.z)), 0.0),
length(max(vec3(q.x, a.y, q.z), 0.0)) + min(max(q.x, max(a.y, q.z)), 0.0)),
length(max(vec3(q.x, q.y, a.z), 0.0)) + min(max(q.x, max(q.y, a.z)), 0.0));
}
float sdPlane(vec3 p, vec3 n, float h) {
return dot(p, n) + h;
}
float sdTorus(vec3 p, float major, float minor) {
vec2 q = vec2(length(p.xz) - major, p.y);
return length(q) - minor;
}
float sdCappedTorus(vec3 p, float halfAperture, float major, float minor) {
vec2 sc = vec2(sin(halfAperture), cos(halfAperture));
vec3 q = vec3(abs(p.x), p.y, p.z);
float k = (sc.y * q.x > sc.x * q.y) ? dot(q.xy, sc) : length(q.xy);
return sqrt(max(dot(q, q) + major * major - 2.0 * major * k, 0.0)) - minor;
}
float sdLink(vec3 p, float halfLength, float major, float minor) {
vec3 q = vec3(p.x, max(abs(p.y) - halfLength, 0.0), p.z);
return length(vec2(length(q.xy) - major, q.z)) - minor;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
vec3 pa = p - a;
vec3 ba = b - a;
float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0);
return length(pa - ba * h) - r;
}
float sdVerticalCapsule(vec3 p, float h, float r) {
vec3 q = vec3(p.x, p.y - clamp(p.y, 0.0, h), p.z);
return length(q) - r;
}
float sdCylinder(vec3 p, vec3 a, vec3 b, float r) {
vec3 ba = b - a;
vec3 pa = p - a;
float baba = max(dot(ba, ba), 1e-12);
float paba = dot(pa, ba);
float x = length(pa * baba - ba * paba) - r * baba;
float y = abs(paba - baba * 0.5) - baba * 0.5;
float x2 = x * x;
float y2 = y * y * baba;
float d = (max(x, y) < 0.0) ? -min(x2, y2)
: (((x > 0.0) ? x2 : 0.0) + ((y > 0.0) ? y2 : 0.0));
return sign(d) * sqrt(abs(d)) / baba;
}
float sdCappedCylinder(vec3 p, float h, float r) {
vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdRoundedCylinder(vec3 p, float r, float edgeR, float h) {
vec2 d = vec2(length(p.xz) - 2.0 * r + edgeR, abs(p.y) - h);
return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - edgeR;
}
float sdCone(vec3 p, float halfAngle, float h) {
vec2 c = vec2(sin(halfAngle), cos(halfAngle));
vec2 q = h * vec2(c.x / max(c.y, 1e-6), -1.0);
vec2 w = vec2(length(p.xz), p.y);
vec2 a = w - q * clamp(dot(w, q) / max(dot(q, q), 1e-12), 0.0, 1.0);
vec2 b = w - q * vec2(clamp(w.x / max(q.x, 1e-12), 0.0, 1.0), 1.0);
float k = sign(q.y);
float d = min(dot(a, a), dot(b, b));
float s = max(k * (w.x * q.y - w.y * q.x), k * (w.y - q.y));
return sqrt(d) * sign(s);
}
float sdCappedCone(vec3 p, float h, float r1, float r2) {
vec2 q = vec2(length(p.xz), p.y);
vec2 k1 = vec2(r2, h);
vec2 k2 = vec2(r2 - r1, 2.0 * h);
vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / max(_zsdf_dot2(k2), 1e-12), 0.0, 1.0);
float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
return s * sqrt(min(_zsdf_dot2(ca), _zsdf_dot2(cb)));
}
float sdRoundCone(vec3 p, float r1, float r2, float h) {
float b = (r1 - r2) / max(h, 1e-6);
float a = sqrt(max(1.0 - b * b, 0.0));
vec2 q = vec2(length(p.xz), p.y);
float k = dot(q, vec2(-b, a));
if (k < 0.0)     return length(q) - r1;
if (k > a * h)   return length(q - vec2(0.0, h)) - r2;
return dot(q, vec2(a, b)) - r1;
}
float sdSolidAngle(vec3 p, float halfAngle, float r) {
vec2 c = vec2(sin(halfAngle), cos(halfAngle));
vec2 q = vec2(length(p.xz), p.y);
float l = length(q) - r;
float m = length(q - c * clamp(dot(q, c), 0.0, r));
return max(l, m * sign(c.y * q.x - c.x * q.y));
}
float sdCutSphere(vec3 p, float r, float h) {
float w = sqrt(max(r * r - h * h, 0.0));
vec2 q = vec2(length(p.xz), p.y);
float s = max((h - r) * q.x * q.x + w * w * (h + r - 2.0 * q.y), h * q.x - w * q.y);
return (s < 0.0) ? length(q) - r :
(q.x < w) ? h - q.y
: length(q - vec2(w, h));
}
float sdCutHollowSphere(vec3 p, float r, float h, float thickness) {
float w = sqrt(max(r * r - h * h, 0.0));
vec2 q = vec2(length(p.xz), p.y);
return ((h * q.x < w * q.y) ? length(q - vec2(w, h))
: abs(length(q) - r)) - thickness;
}
float sdEllipsoid(vec3 p, vec3 radii) {
float k0 = length(p / radii);
float k1 = length(p / (radii * radii));
return k0 * (k0 - 1.0) / max(k1, 1e-12);
}
float sdHexPrism(vec3 p, vec2 h) {
const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
vec3 a = abs(p);
vec2 xy = a.xy - 2.0 * min(dot(k.xy, a.xy), 0.0) * k.xy;
vec2 d = vec2(
length(xy - vec2(clamp(xy.x, -k.z * h.x, k.z * h.x), h.x)) * sign(xy.y - h.x),
a.z - h.y);
return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdTriPrism(vec3 p, vec2 h) {
vec3 q = abs(p);
return max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5);
}
float sdOctahedron(vec3 p, float s) {
vec3 a = abs(p);
float m = a.x + a.y + a.z - s;
vec3 q;
if (3.0 * a.x < m) q = a.xyz;
else if (3.0 * a.y < m) q = a.yzx;
else if (3.0 * a.z < m) q = a.zxy;
else return m * 0.57735027;
float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
return length(vec3(q.x, q.y - s + k, q.z - k));
}
float sdPyramid(vec3 p, float h) {
float m2 = h * h + 0.25;
vec2 xz = abs(p.xz);
xz = (xz.y > xz.x) ? xz.yx : xz.xy;
xz -= 0.5;
vec3 q = vec3(xz.y, h * p.y - 0.5 * xz.x, h * xz.x + 0.5 * p.y);
float s = max(-q.x, 0.0);
float t = clamp((q.y - 0.5 * xz.y) / (m2 + 0.25), 0.0, 1.0);
float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) + (q.y - m2 * t) * (q.y - m2 * t);
float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a, b);
return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}
#endif`,a=`#ifndef ZED_SDF_2D_DRAW_INCLUDED
#define ZED_SDF_2D_DRAW_INCLUDED
float sdFillMask(float d) {
float w = max(fwidth(d), 1e-6);
return 1.0 - smoothstep(-w * 0.5, w * 0.5, d);
}
float sdFillMask(float d, float aaWidth) {
float w = max(aaWidth, 1e-6);
return 1.0 - smoothstep(-w * 0.5, w * 0.5, d);
}
float sdStrokeMask(float d, float width) {
return sdFillMask(abs(d) - width * 0.5);
}
float sdGlow(float d, float radius, float falloff) {
float t = 1.0 - clamp(d / max(radius, 1e-6), 0.0, 1.0);
return pow(t, max(falloff, 1e-3));
}
vec3 sdFieldViz(float d, float bandSpacing) {
vec3 col = (d > 0.0) ? vec3(0.90, 0.60, 0.30) : vec3(0.65, 0.85, 1.00);
col *= 1.0 - exp(-6.0 * abs(d));
col *= 0.8 + 0.2 * cos(d * TWO_PI / max(bandSpacing, 1e-4));
float w = max(fwidth(d), 1e-6);
return mix(col, vec3(1.0), 1.0 - smoothstep(0.0, w * 1.5, abs(d)));
}
vec3 sdFieldViz(float d) {
return sdFieldViz(d, 0.05);
}
#endif`,o=[t,n].join(`
`),s=[t,n,r].join(`
`),c=[t,n,i].join(`
`),l=[t,a].join(`
`),u=[t,n,r,i,a].join(`
`),d=`#ifndef ZED_RM_CONFIG_INCLUDED
#define ZED_RM_CONFIG_INCLUDED
#if !defined(ZRM_FAST) && (defined(IS_MOBILE) || !defined(HAS_FRAGMENT_HIGHP))
#define ZRM_FAST 1
#endif
#endif`,f=`#ifndef ZED_RM_CAMERA_INCLUDED
#define ZED_RM_CAMERA_INCLUDED
struct RMRay { vec3 ro; vec3 rd; };
RMRay rmRayFromMatrices(vec2 uv01, mat4 invProjView, vec3 camPos) {
highp vec2 ndc = uv01 * 2.0 - 1.0;
highp vec4 pNear = invProjView * vec4(ndc, ZED_NDC_NEAR, 1.0);
highp vec4 pFar  = invProjView * vec4(ndc, ZED_NDC_FAR, 1.0);
RMRay r;
r.ro = camPos;
r.rd = normalize(pFar.xyz / pFar.w - pNear.xyz / pNear.w);
return r;
}
mat3 rmLookAt(vec3 ro, vec3 target, float roll) {
vec3 d = target - ro;
vec3 fwd = (dot(d, d) > 1e-12) ? normalize(d) : vec3(0.0, 0.0, 1.0);
vec3 upHint = vec3(sin(roll), cos(roll), 0.0);
vec3 r = cross(fwd, upHint);
if (dot(r, r) < 1e-8) r = cross(fwd, vec3(0.0, 0.0, 1.0));
if (dot(r, r) < 1e-8) r = vec3(1.0, 0.0, 0.0);
vec3 right = normalize(r);
vec3 up = cross(right, fwd);
return mat3(right, up, fwd);
}
vec3 rmCameraRay(mat3 basis, vec2 sc, float focal) {
return normalize(basis * vec3(sc, focal));
}
float rmFragDepth(vec3 worldPos, mat4 projView) {
highp vec4 clip = projView * vec4(worldPos, 1.0);
if (clip.w <= 1e-6) return ZED_DEPTH_FAR;
return clamp(ZED_NDC_TO_DEPTH(clip.z / clip.w), 0.0, 1.0);
}
#endif`,p=`#ifndef ZED_RM_INCLUDED
#define ZED_RM_INCLUDED
#ifndef ZRM_MAP
#define ZRM_MAP map
#endif
#ifndef ZRM_MAX_STEPS
#ifdef ZRM_FAST
#define ZRM_MAX_STEPS 96
#else
#define ZRM_MAX_STEPS 256
#endif
#endif
#ifndef ZRM_TNEAR
#define ZRM_TNEAR 0.01
#endif
#ifndef ZRM_TFAR
#define ZRM_TFAR 100.0
#endif
#ifndef ZRM_EPS_REL
#ifdef ZRM_FAST
#define ZRM_EPS_REL 0.002
#else
#define ZRM_EPS_REL 0.001
#endif
#endif
#ifndef ZRM_STEP_SCALE
#define ZRM_STEP_SCALE 1.0
#endif
#ifndef ZRM_NORMAL_EPS
#define ZRM_NORMAL_EPS 0.0005
#endif
#ifndef ZRM_SHADOW_STEPS
#ifdef ZRM_FAST
#define ZRM_SHADOW_STEPS 24
#else
#define ZRM_SHADOW_STEPS 64
#endif
#endif
#ifndef ZRM_SHADOW_EPS
#define ZRM_SHADOW_EPS 0.001
#endif
#ifndef ZRM_AO_TAPS
#ifdef ZRM_FAST
#define ZRM_AO_TAPS 3
#else
#define ZRM_AO_TAPS 5
#endif
#endif
vec2 ZRM_MAP(vec3 p);
struct RMHit { float t; float id; int steps; };
bool rmHitValid(RMHit h) { return h.id >= 0.0; }
RMHit rmMarch(vec3 ro, vec3 rd, float tNear, float tFar, int maxSteps,
float epsRel, float stepScale) {
RMHit h;
h.id = -1.0;
h.steps = 0;
highp float t = tNear;
for (int i = 0; i < maxSteps; i++) {
h.steps = i + 1;
vec2 s = ZRM_MAP(ro + rd * t);
if (s.x < epsRel * t) { h.id = s.y; break; }
t += s.x * stepScale;
if (t > tFar) break;
}
h.t = min(t, tFar);
return h;
}
RMHit rmMarch(vec3 ro, vec3 rd) {
return rmMarch(ro, rd, ZRM_TNEAR, ZRM_TFAR, ZRM_MAX_STEPS, ZRM_EPS_REL, ZRM_STEP_SCALE);
}
vec3 rmNormal(vec3 p, float eps) {
vec3 n = vec3(0.0);
for (int i = 0; i < 4; i++) {
vec3 e = 0.5773 * (2.0 * vec3(float((i + 3) >> 1 & 1),
float((i >> 1) & 1),
float(i & 1)) - 1.0);
n += e * ZRM_MAP(p + e * eps).x;
}
return normalize(n);
}
vec3 rmNormal(vec3 p) {
return rmNormal(p, ZRM_NORMAL_EPS);
}
vec3 rmNormalCentral(vec3 p, float eps) {
vec2 e = vec2(eps, 0.0);
return normalize(vec3(
ZRM_MAP(p + e.xyy).x - ZRM_MAP(p - e.xyy).x,
ZRM_MAP(p + e.yxy).x - ZRM_MAP(p - e.yxy).x,
ZRM_MAP(p + e.yyx).x - ZRM_MAP(p - e.yyx).x));
}
float rmSoftShadow(vec3 ro, vec3 rd, float tNear, float tFar, float softness,
int maxSteps) {
float res = 1.0;
highp float t = tNear;
float ph = 1e20;
for (int i = 0; i < maxSteps; i++) {
float h = ZRM_MAP(ro + rd * t).x;
if (h < ZRM_SHADOW_EPS) return 0.0;
#ifdef ZRM_FAST
res = min(res, softness * h / max(t, 1e-4));
#else
float y = h * h / (2.0 * ph);
float d = sqrt(max(h * h - y * y, 0.0));
res = min(res, softness * d / max(t - y, 1e-4));
ph = h;
#endif
t += h;
if (res < 0.004 || t > tFar) break;
}
return clamp(res, 0.0, 1.0);
}
float rmSoftShadow(vec3 ro, vec3 rd, float tNear, float tFar, float softness) {
return rmSoftShadow(ro, rd, tNear, tFar, softness, ZRM_SHADOW_STEPS);
}
float rmHardShadow(vec3 ro, vec3 rd, float tNear, float tFar, int maxSteps) {
highp float t = tNear;
for (int i = 0; i < maxSteps; i++) {
float h = ZRM_MAP(ro + rd * t).x;
if (h < ZRM_SHADOW_EPS) return 0.0;
t += h;
if (t > tFar) break;
}
return 1.0;
}
float rmHardShadow(vec3 ro, vec3 rd, float tNear, float tFar) {
return rmHardShadow(ro, rd, tNear, tFar, ZRM_SHADOW_STEPS);
}
float rmAO(vec3 p, vec3 n, float radius, int taps) {
float occ = 0.0;
float sca = 1.0;
float denom = float(max(taps, 1));
for (int i = 0; i < taps; i++) {
float step_ = 0.01 + radius * float(i) / denom;
float d = ZRM_MAP(p + n * step_).x;
occ += (step_ - d) * sca;
sca *= 0.95;
if (occ > 0.35) break;
}
return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}
float rmAO(vec3 p, vec3 n) {
return rmAO(p, n, 0.12, ZRM_AO_TAPS);
}
#endif`,m=`#ifndef ZED_RM_SHADE_INCLUDED
#define ZED_RM_SHADE_INCLUDED
float rmFogExp(float dist, float density) {
return exp(-max(dist, 0.0) * max(density, 0.0));
}
float rmFogHeight(vec3 ro, vec3 rd, float dist, float baseHeight, float falloff,
float density) {
float b = max(falloff, 1e-4);
float base = exp(clamp(-(ro.y - baseHeight) * b, -60.0, 60.0));
float amount;
if (abs(rd.y) < 1e-4) {
amount = density * base * max(dist, 0.0);
} else {
float e = clamp(-max(dist, 0.0) * rd.y * b, -60.0, 60.0);
amount = density * base * (1.0 - exp(e)) / (rd.y * b);
}
return exp(-max(amount, 0.0));
}
vec3 rmSky(vec3 rd, vec3 sunDir, vec3 zenithColour, vec3 horizonColour) {
float h = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
vec3 col = mix(horizonColour, zenithColour, pow(h, 0.6));
float sun = clamp(dot(rd, sunDir), 0.0, 1.0);
col += vec3(1.00, 0.85, 0.60) * (pow(sun, 64.0) * 0.5 + pow(sun, 8.0) * 0.12);
col += vec3(1.00, 0.95, 0.85) * pow(sun, 512.0) * 3.0;
return col;
}
vec3 rmSky(vec3 rd, vec3 sunDir) {
return rmSky(rd, sunDir, vec3(0.22, 0.42, 0.75), vec3(0.68, 0.78, 0.92));
}
float rmCheckerFiltered(vec2 q) {
vec2 w = fwidth(q) + 0.001;
vec2 i = 2.0 * (abs(fract((q - 0.5 * w) * 0.5) - 0.5)
- abs(fract((q + 0.5 * w) * 0.5) - 0.5)) / w;
return 0.5 - 0.5 * i.x * i.y;
}
float rmGridFiltered(vec2 q, float lineWidth) {
vec2 w = fwidth(q) + 1e-4;
vec2 d = abs(q - round(q));
vec2 m = 1.0 - smoothstep(vec2(0.0), w, d - lineWidth * 0.5);
return max(m.x, m.y);
}
vec3 rmPalette(float x, vec3 a, vec3 b, vec3 c, vec3 d) {
return a + b * cos(TWO_PI * (c * x + d));
}
vec2 rmMatcapUV(vec3 n, vec3 viewDir) {
vec3 r = reflect(viewDir, n);
float m = 2.0 * sqrt(max(r.x * r.x + r.y * r.y + (r.z + 1.0) * (r.z + 1.0), 1e-8));
return r.xy / m + 0.5;
}
#endif`,h=`#ifndef ZED_RM_TERRAIN_INCLUDED
#define ZED_RM_TERRAIN_INCLUDED
#ifndef ZRM_TERRAIN
#define ZRM_TERRAIN terrainHeight
#endif
#ifndef ZRM_TERRAIN_STEPS
#ifdef ZRM_FAST
#define ZRM_TERRAIN_STEPS 128
#else
#define ZRM_TERRAIN_STEPS 300
#endif
#endif
#ifndef ZRM_TERRAIN_REFINE
#ifdef ZRM_FAST
#define ZRM_TERRAIN_REFINE 4
#else
#define ZRM_TERRAIN_REFINE 8
#endif
#endif
#ifndef ZRM_TERRAIN_SHADOW_STEPS
#ifdef ZRM_FAST
#define ZRM_TERRAIN_SHADOW_STEPS 24
#else
#define ZRM_TERRAIN_SHADOW_STEPS 64
#endif
#endif
float ZRM_TERRAIN(vec2 xz);
float rmTerrainMarch(vec3 ro, vec3 rd, float tNear, float tFar, int maxSteps,
int refineSteps) {
highp float t = tNear;
float tPrev = tNear;
float hPrev = (ro.y + rd.y * tNear) - ZRM_TERRAIN(ro.xz + rd.xz * tNear);
for (int i = 0; i < maxSteps; i++) {
vec3 p = ro + rd * t;
float h = p.y - ZRM_TERRAIN(p.xz);
if (h < 0.0) {
float lo = tPrev, hi = t, hLo = hPrev, hHi = h;
for (int j = 0; j < refineSteps; j++) {
float mid = lo + (hi - lo) * hLo / max(hLo - hHi, 1e-6);
vec3 pm = ro + rd * mid;
float hm = pm.y - ZRM_TERRAIN(pm.xz);
if (hm < 0.0) { hi = mid; hHi = hm; } else { lo = mid; hLo = hm; }
}
return lo + (hi - lo) * hLo / max(hLo - hHi, 1e-6);
}
tPrev = t;
hPrev = h;
t += max(0.4 * h, 0.002 * t);
if (t > tFar) break;
}
return -1.0;
}
float rmTerrainMarch(vec3 ro, vec3 rd, float tNear, float tFar, int maxSteps) {
return rmTerrainMarch(ro, rd, tNear, tFar, maxSteps, ZRM_TERRAIN_REFINE);
}
float rmTerrainMarch(vec3 ro, vec3 rd, float tNear, float tFar) {
return rmTerrainMarch(ro, rd, tNear, tFar, ZRM_TERRAIN_STEPS, ZRM_TERRAIN_REFINE);
}
vec3 rmTerrainNormal(vec2 xz, float sampleDist) {
float e = max(sampleDist, 1e-4);
float hL = ZRM_TERRAIN(xz - vec2(e, 0.0));
float hR = ZRM_TERRAIN(xz + vec2(e, 0.0));
float hD = ZRM_TERRAIN(xz - vec2(0.0, e));
float hU = ZRM_TERRAIN(xz + vec2(0.0, e));
return normalize(vec3(hL - hR, 2.0 * e, hD - hU));
}
float rmTerrainShadow(vec3 ro, vec3 rd, float tNear, float tFar, float softness,
int maxSteps) {
float res = 1.0;
highp float t = tNear;
for (int i = 0; i < maxSteps; i++) {
vec3 p = ro + rd * t;
float h = p.y - ZRM_TERRAIN(p.xz);
res = min(res, softness * h / max(t, 1e-4));
if (res < 0.001) break;
t += max(h, 0.01 * t);
if (t > tFar) break;
}
return clamp(res, 0.0, 1.0);
}
float rmTerrainShadow(vec3 ro, vec3 rd, float tNear, float tFar, float softness) {
return rmTerrainShadow(ro, rd, tNear, tFar, softness, ZRM_TERRAIN_SHADOW_STEPS);
}
#endif`,g=[t,d,f,p].join(`
`),_=[t,d,m].join(`
`),v=[t,d,f,h].join(`
`);export{s as a,o as c,l as i,e as l,_ as n,c as o,v as r,u as s,g as t};