import{bt as ee,dt as e,it as t}from"./project.svelte-CUO6yfHp.js";import{f as te}from"./includeClosure-CBOfwEfO.js";import{o as ne}from"./bvhConfig-vzOajthA.js";import{a as re,c as ie,i as n,n as r,o as i,r as a,s as o,t as s}from"./raymarchGlsl-CZdfVUqY.js";var c=`#ifndef ZED_SS_COMMON_INCLUDED
#define ZED_SS_COMMON_INCLUDED
#if !defined(ZSS_FAST) && (defined(IS_MOBILE) || !defined(HAS_FRAGMENT_HIGHP))
#define ZSS_FAST 1
#endif
float ssDepth(sampler2D depthTex, vec2 uv) {
return texture(depthTex, uv).r;
}
bool ssIsSky(float depth01) {
return ZED_IS_FAR_DEPTH(depth01);
}
bool ssValidUV(vec2 uv) {
return all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)));
}
vec3 ssWorldPos(vec2 uv, float depth01, mat4 invProjView) {
highp vec4 ndc = vec4(uv * 2.0 - 1.0, ZED_DEPTH_TO_NDC(depth01), 1.0);
highp vec4 world = invProjView * ndc;
return world.xyz / world.w;
}
vec3 ssViewPos(vec2 uv, float depth01, mat4 invProj) {
highp vec4 ndc = vec4(uv * 2.0 - 1.0, ZED_DEPTH_TO_NDC(depth01), 1.0);
highp vec4 view = invProj * ndc;
return view.xyz / view.w;
}
vec3 ssProjectToScreen(vec3 worldPos, mat4 projView) {
highp vec4 clip = projView * vec4(worldPos, 1.0);
if (clip.w <= 1e-6) return vec3(-8.0, -8.0, 2.0);
highp vec3 ndc = clip.xyz / clip.w;
return vec3(ndc.xy * 0.5 + 0.5, ZED_NDC_TO_DEPTH(ndc.z));
}
float ssViewZ(float depth01, mat4 proj) {
highp float zNdc = ZED_DEPTH_TO_NDC(depth01);
#if ZED_REVERSED_Z
return -proj[3][2] / max(zNdc + proj[2][2], 1e-8);
#else
return -proj[3][2] / min(zNdc + proj[2][2], -1e-8);
#endif
}
float ssViewZOrtho(float depth01, mat4 proj) {
highp float zNdc = ZED_DEPTH_TO_NDC(depth01);
highp float sa = proj[2][2];
#if ZED_REVERSED_Z
if (abs(sa) < 1e-12) sa = 1e-12;
#else
if (abs(sa) < 1e-12) sa = -1e-12;
#endif
return (zNdc - proj[3][2]) / sa;
}
vec3 ssDecodeNormal(vec3 sampled) {
return normalize(sampled * 2.0 - 1.0);
}
vec3 ssNormalFromDepth(sampler2D depthTex, vec2 uv, mat4 invProjView) {
vec2 px = 1.0 / vec2(textureSize(depthTex, 0));
highp float dc = ssDepth(depthTex, uv);
highp vec3 pc = ssWorldPos(uv, dc, invProjView);
vec2 uvR = uv + vec2(px.x, 0.0);
vec2 uvL = uv - vec2(px.x, 0.0);
vec2 uvU = uv + vec2(0.0, px.y);
vec2 uvD = uv - vec2(0.0, px.y);
highp float dr = ssDepth(depthTex, uvR);
highp float dl = ssDepth(depthTex, uvL);
highp float du = ssDepth(depthTex, uvU);
highp float dd = ssDepth(depthTex, uvD);
highp vec3 dpx = abs(dr - dc) < abs(dl - dc)
? ssWorldPos(uvR, dr, invProjView) - pc
: pc - ssWorldPos(uvL, dl, invProjView);
highp vec3 dpy = abs(du - dc) < abs(dd - dc)
? ssWorldPos(uvU, du, invProjView) - pc
: pc - ssWorldPos(uvD, dd, invProjView);
return normalize(cross(dpx, dpy));
}
float ssScreenEdgeFade(vec2 uv, float margin) {
vec2 m = max(vec2(margin), vec2(1e-4));
vec2 f = clamp(min(uv, 1.0 - uv) / m, 0.0, 1.0);
return f.x * f.y;
}
float ssIGN(vec2 fragCoordXY) {
return fract(52.9829189 * fract(dot(fragCoordXY, vec2(0.06711056, 0.00583715))));
}
#endif`,l=`#ifndef ZED_SS_BLUR_INCLUDED
#define ZED_SS_BLUR_INCLUDED
vec4 ssBlurBilateral(sampler2D srcTex, sampler2D depthTex, vec2 uv, vec2 dirTexels,
int taps, float sharpness, mat4 proj) {
#ifdef ZSS_FAST
taps = min(taps, 4);
#endif
vec2 srcPx = 1.0 / vec2(textureSize(srcTex, 0));
highp float z0 = ssViewZ(ssDepth(depthTex, uv), proj);
highp float sigma = max(float(taps) * 0.5, 1e-3);
vec4 sum = texture(srcTex, uv);
highp float wSum = 1.0;
for (int i = 1; i <= taps; i++) {
highp float g = exp(-float(i * i) / (2.0 * sigma * sigma));
vec2 off = dirTexels * srcPx * float(i);
vec2 uvP = uv + off;
vec2 uvN = uv - off;
highp float zP = ssViewZ(ssDepth(depthTex, uvP), proj);
highp float zN = ssViewZ(ssDepth(depthTex, uvN), proj);
highp float wP = g * exp(-abs(zP - z0) * sharpness);
highp float wN = g * exp(-abs(zN - z0) * sharpness);
sum += texture(srcTex, uvP) * wP + texture(srcTex, uvN) * wN;
wSum += wP + wN;
}
return sum / max(wSum, 1e-5);
}
vec4 ssUpsampleBilateral(sampler2D lowTex, sampler2D depthTex, vec2 uv,
float sharpness, mat4 proj) {
vec2 lowSize = vec2(textureSize(lowTex, 0));
vec2 lowPx = 1.0 / lowSize;
highp float z0 = ssViewZ(ssDepth(depthTex, uv), proj);
vec2 st = uv * lowSize - 0.5;
vec2 tbase = (floor(st) + 0.5) * lowPx;
vec2 f = fract(st);
vec4 sum = vec4(0.0);
highp float wSum = 0.0;
for (int j = 0; j <= 1; j++) {
for (int i = 0; i <= 1; i++) {
vec2 tuv = tbase + vec2(float(i), float(j)) * lowPx;
float bilin = (i == 1 ? f.x : 1.0 - f.x) * (j == 1 ? f.y : 1.0 - f.y);
highp float zi = ssViewZ(ssDepth(depthTex, tuv), proj);
highp float w = bilin * exp(-abs(zi - z0) * sharpness) + 1e-5;
sum += texture(lowTex, tuv) * w;
wSum += w;
}
}
return sum / max(wSum, 1e-5);
}
#endif`,u=`#ifndef ZED_SS_AO_INCLUDED
#define ZED_SS_AO_INCLUDED
const float _ZSS_HALF_PI = 1.57079632679;
float _zss_aoFalloff(float distRatio) {
float d = clamp(distRatio, 0.0, 1.0);
return 1.0 - d * d;
}
float _zss_horizonCos(sampler2D depthTex, vec3 worldPos, vec3 marchDir, vec3 viewV,
float radiusWorld, int steps, float jitter,
mat4 projView, mat4 invProjView) {
highp float hc = -1.0;
for (int i = 1; i <= steps; i++) {
highp float t = pow((float(i) - 0.5 + jitter) / float(steps), 2.0) * radiusWorld;
vec3 sPos = ssProjectToScreen(worldPos + marchDir * t, projView);
if (!ssValidUV(sPos.xy)) break;
highp float sd = ssDepth(depthTex, sPos.xy);
if (ssIsSky(sd)) continue;
highp vec3 delta = ssWorldPos(sPos.xy, sd, invProjView) - worldPos;
highp float dlen = length(delta);
if (dlen < 1e-6) continue;
float w = _zss_aoFalloff(dlen / max(radiusWorld, 1e-6));
hc = max(hc, mix(-1.0, dot(delta / dlen, viewV), w));
}
return hc;
}
float ssGTAO(sampler2D depthTex, vec2 uv, vec3 worldPos, vec3 worldN,
mat4 projView, mat4 invProjView, vec3 camPos,
float radiusWorld, int dirs, int steps, float jitter) {
#ifdef ZSS_FAST
dirs = min(dirs, 2);
steps = min(steps, 4);
#endif
dirs = clamp(dirs, 1, 8);
steps = clamp(steps, 1, 32);
vec3 viewV = normalize(camPos - worldPos);
vec3 tup = abs(viewV.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
vec3 tx = normalize(cross(viewV, tup));
vec3 ty = cross(viewV, tx);
highp float vis = 0.0;
for (int d = 0; d < dirs; d++) {
float phi = PI * (float(d) + jitter) / float(dirs);
vec3 sliceDir = tx * cos(phi) + ty * sin(phi);
vec3 planeN = cross(sliceDir, viewV);
vec3 projN = worldN - planeN * dot(worldN, planeN);
highp float projLen = length(projN);
if (projLen < 1e-4) continue;
highp float cosG = clamp(dot(projN / projLen, viewV), -1.0, 1.0);
highp float sgn = dot(projN, sliceDir) >= 0.0 ? 1.0 : -1.0;
highp float gamma = acos(cosG) * sgn;
highp float hc1 = _zss_horizonCos(depthTex, worldPos, -sliceDir, viewV,
radiusWorld, steps, jitter, projView, invProjView);
highp float hc2 = _zss_horizonCos(depthTex, worldPos, sliceDir, viewV,
radiusWorld, steps, jitter, projView, invProjView);
highp float h1 = -acos(clamp(hc1, -1.0, 1.0));
highp float h2 = acos(clamp(hc2, -1.0, 1.0));
h1 = gamma + max(h1 - gamma, -_ZSS_HALF_PI);
h2 = gamma + min(h2 - gamma, _ZSS_HALF_PI);
highp float sinG = sin(gamma);
vis += projLen * 0.25 *
((-cos(2.0 * h1 - gamma) + cosG + 2.0 * h1 * sinG) +
(-cos(2.0 * h2 - gamma) + cosG + 2.0 * h2 * sinG));
}
return clamp(vis / float(dirs), 0.0, 1.0);
}
float ssAOApply(float visibility, float intensity) {
return pow(clamp(visibility, 0.0, 1.0), max(intensity, 0.0));
}
#endif`,d=`#ifndef ZED_SS_SHADOW_INCLUDED
#define ZED_SS_SHADOW_INCLUDED
float ssContactShadow(sampler2D depthTex, vec3 worldPos, vec3 dirToLightWS,
mat4 projView, float distWorld, int steps,
float thickness01, float jitter) {
#ifdef ZSS_FAST
steps = min(steps, 8);
thickness01 *= 2.0;
#endif
steps = clamp(steps, 1, 32);
if (distWorld <= 0.0) return 1.0;
vec3 sr0 = ssProjectToScreen(worldPos, projView);
if (!ssValidUV(sr0.xy)) return 1.0;
vec3 sr1 = ssProjectToScreen(worldPos + dirToLightWS * distWorld, projView);
highp float sbias = max(thickness01 * 0.05, 1e-5);
#ifdef ZSS_FAST
sbias *= 2.0;
#endif
for (int i = 1; i <= steps; i++) {
highp float t = (float(i) - 0.5 + jitter) / float(steps);
highp vec3 p = mix(sr0, sr1, t);
if (!ssValidUV(p.xy) || p.z <= 0.0 || p.z >= 1.0) break;
highp float d = ssDepth(depthTex, p.xy);
if (ssIsSky(d)) continue;
highp float diff = ZED_DEPTH_BEHIND(p.z, d);
if (diff > sbias && diff < thickness01) return 0.0;
}
return 1.0;
}
#endif`,f=`#ifndef ZED_SS_SCENE_INCLUDED
#define ZED_SS_SCENE_INCLUDED
vec3 ssSceneFetch(sampler2D sceneTex, vec2 uv, float lod) {
vec2 cuv = clamp(uv, vec2(0.001), vec2(0.999));
float l = max(lod, 0.0);
#ifdef ZED_OCT_MIN_LOD
l = max(l, ZED_OCT_MIN_LOD);
#endif
return textureLod(sceneTex, cuv, l).rgb;
}
vec3 ssSceneOffset(sampler2D sceneTex, vec2 uv, vec2 offsetTexels, float lod) {
vec2 px = 1.0 / vec2(textureSize(sceneTex, 0));
return ssSceneFetch(sceneTex, uv + offsetTexels * px, lod);
}
vec3 ssRefract(sampler2D sceneTex, sampler2D depthTex, vec2 uv, float surfDepth01,
vec3 worldN, vec3 viewDirWS, mat4 projView, float eta,
float strengthTexels, float lod) {
vec3 rd = refract(normalize(viewDirWS), normalize(worldN), eta);
vec4 clipDir = projView * vec4(rd, 0.0);
highp float dlen = length(clipDir.xy);
if (dlen < 1e-5) return ssSceneFetch(sceneTex, uv, lod);
vec2 px = 1.0 / vec2(textureSize(sceneTex, 0));
vec2 tuv = uv + (clipDir.xy / dlen) * strengthTexels * px;
if (!ssValidUV(tuv)) return ssSceneFetch(sceneTex, uv, lod);
highp float d = ssDepth(depthTex, tuv);
if (ZED_DEPTH_NEARER_EPS(d, surfDepth01, 1e-4)) return ssSceneFetch(sceneTex, uv, lod);
return ssSceneFetch(sceneTex, tuv, lod);
}
#endif`,p=`#ifndef ZED_SS_SSR_INCLUDED
#define ZED_SS_SSR_INCLUDED
struct SSHit {
float mask;
vec2 uv;
float t;
};
SSHit ssTraceRay(sampler2D depthTex, vec3 originWS, vec3 rayDirWS, mat4 projView,
float maxDistWorld, int coarseSteps, int refineSteps,
float thickness01, float jitter) {
#ifdef ZSS_FAST
coarseSteps = min(coarseSteps, 24);
refineSteps = min(refineSteps, 8);
thickness01 *= 2.0;
#endif
coarseSteps = clamp(coarseSteps, 4, 64);
refineSteps = clamp(refineSteps, 0, 16);
SSHit hit;
hit.mask = 0.0;
hit.uv = vec2(-1.0);
hit.t = 1.0;
highp vec4 clip0 = projView * vec4(originWS, 1.0);
if (clip0.w <= 1e-4) return hit;
highp vec4 clip1 = projView * vec4(originWS + rayDirWS * maxDistWorld, 1.0);
highp float tClip = 1.0;
if (clip1.w <= 1e-4) {
tClip = clamp((clip0.w - 1e-3) / max(clip0.w - clip1.w, 1e-6), 0.0, 1.0);
clip1 = mix(clip0, clip1, tClip);
}
highp vec3 ndc0 = clip0.xyz / clip0.w;
highp vec3 ndc1 = clip1.xyz / clip1.w;
highp vec3 scr0 = vec3(ndc0.xy * 0.5 + 0.5, ZED_NDC_TO_DEPTH(ndc0.z));
highp vec3 scr1 = vec3(ndc1.xy * 0.5 + 0.5, ZED_NDC_TO_DEPTH(ndc1.z));
highp float w0 = clip0.w;
highp float w1 = clip1.w;
highp float sbias = max(thickness01 * 0.05, 1e-5);
highp float sPrev = 0.0;
highp float sHit = -1.0;
for (int i = 1; i <= coarseSteps; i++) {
highp float s = (float(i) - 0.5 + jitter) / float(coarseSteps);
highp vec3 p = mix(scr0, scr1, s);
if (!ssValidUV(p.xy) || !ZED_DEPTH_NEARER(p.z, ZED_DEPTH_FAR)) break;
highp float d = ssDepth(depthTex, p.xy);
highp float diff = ZED_DEPTH_BEHIND(p.z, d);
if (diff > sbias && diff < thickness01) { sHit = s; break; }
sPrev = s;
}
if (sHit < 0.0) return hit;
highp float lo = sPrev;
highp float hi = sHit;
for (int r = 0; r < refineSteps; r++) {
highp float mid = 0.5 * (lo + hi);
highp vec3 p = mix(scr0, scr1, mid);
highp float d = ssDepth(depthTex, p.xy);
highp float diff = ZED_DEPTH_BEHIND(p.z, d);
if (diff > sbias && diff < thickness01) { hi = mid; } else { lo = mid; }
}
highp vec3 pHit = mix(scr0, scr1, hi);
hit.mask = 1.0;
hit.uv = pHit.xy;
hit.t = clamp(hi * w0 / max(mix(w1, w0, hi), 1e-6), 0.0, 1.0) * tClip;
return hit;
}
float ssrFade(SSHit hit, vec3 rayDirWS, vec3 worldN) {
if (hit.mask <= 0.0) return 0.0;
float fade = ssScreenEdgeFade(hit.uv, 0.1);
fade *= 1.0 - smoothstep(0.75, 1.0, hit.t);
if (dot(worldN, worldN) > 1e-6) {
fade *= 1.0 - smoothstep(-0.05, 0.15, dot(rayDirWS, normalize(worldN)));
}
return fade * hit.mask;
}
vec3 ssrResolve(sampler2D sceneTex, SSHit hit, float roughness) {
if (hit.mask <= 0.0) return vec3(0.0);
float maxLod = log2(float(max(textureSize(sceneTex, 0).x, 2)));
float lod = maxLod * clamp(roughness * (0.3 + 0.7 * clamp(hit.t, 0.0, 1.0)), 0.0, 1.0);
return ssSceneFetch(sceneTex, hit.uv, lod);
}
vec4 ssrReflect(sampler2D sceneTex, sampler2D depthTex, vec3 worldPos, vec3 worldN,
vec3 camPos, mat4 projView, float roughness, float maxDistWorld,
int coarseSteps, int refineSteps, float jitter) {
vec3 viewV = normalize(worldPos - camPos);
vec3 rr = normalize(reflect(viewV, worldN));
vec3 origin = worldPos + worldN * (1e-3 * maxDistWorld);
SSHit hit = ssTraceRay(depthTex, origin, rr, projView, maxDistWorld,
coarseSteps, refineSteps, 0.015, jitter);
float conf = ssrFade(hit, rr, vec3(0.0));
if (conf <= 0.0) return vec4(0.0);
return vec4(ssrResolve(sceneTex, hit, roughness), conf);
}
#endif`,m=`#ifndef ZED_SS_MATRICES_INCLUDED
#define ZED_SS_MATRICES_INCLUDED
layout(std140) uniform DerivedMatrices {
mat4 uProj;
mat4 uView;
mat4 uProjView;
mat4 uInvProjView;
vec4 uCamPosition;
};
#endif`,h=c,g=[c,l].join(`
`),_=[c,u].join(`
`),v=[c,d].join(`
`),y=[c,f].join(`
`),b=[c,f,p].join(`
`),x=[c,l,u,d,f,p].join(`
`),S=`uniform highp sampler2D uLtc1;
uniform highp sampler2D uLtc2;
uniform highp sampler2DArray uLtcLightTex;
const float ZLTC_LUT_SIZE  = 64.0;
const float ZLTC_LUT_SCALE = 63.0 / 64.0;
const float ZLTC_LUT_BIAS  = 0.5 / 64.0;
vec2 ltcLutUv(float NoV, float roughness) {
return vec2(roughness, sqrt(1.0 - NoV)) * ZLTC_LUT_SCALE + ZLTC_LUT_BIAS;
}
mat3 ltcInvMatrix(vec4 t1) {
return mat3(vec3(t1.x, 0.0, t1.y), vec3(0.0, 1.0, 0.0), vec3(t1.z, 0.0, t1.w));
}
vec3 ltcEdgeVectorFormFactor(vec3 v1, vec3 v2) {
float x = dot(v1, v2);
float y = abs(x);
float a = 0.8543985 + (0.4965155 + 0.0145206 * y) * y;
float b = 3.4175940 + (4.1616724 + y) * y;
float v = a / b;
float thetaSinTheta = (x > 0.0) ? v : 0.5 * inversesqrt(max(1.0 - x * x, 1e-7)) - v;
return cross(v1, v2) * thetaSinTheta;
}
float ltcClippedSphereFormFactor(vec3 f) {
float l = length(f);
return max((l * l + f.z) / (l + 1.0), 0.0);
}
vec3 ltcFilteredLightTex(float layer, vec3 c0, vec3 c1, vec3 c3) {
vec3 e1 = c1 - c0;
vec3 e2 = c3 - c0;
vec3 ortho = cross(e1, e2);
float areaSq = max(dot(ortho, ortho), 1e-12);
float planeDistXArea = dot(ortho, c0);
vec3 pp = planeDistXArea * ortho / areaSq - c0;
float dotE1E2 = dot(e1, e2);
float invE1 = 1.0 / max(dot(e1, e1), 1e-12);
vec3 e2p = e2 - e1 * (dotE1E2 * invE1);
vec2 uv;
uv.y = dot(e2p, pp) / max(dot(e2p, e2p), 1e-12);
uv.x = dot(e1, pp) * invE1 - dotE1E2 * invE1 * uv.y;
float dist = abs(planeDistXArea) / pow(areaSq, 0.75);
float w = float(textureSize(uLtcLightTex, 0).x);
float maxLod = log2(w);
float lod = clamp(log2(max(dist, 1e-6) * w), 0.0, maxLod);
return textureLod(uLtcLightTex, vec3(clamp(uv, 0.0, 1.0), layer), lod).rgb;
}
vec3 ltcEvaluateRect(vec3 N, vec3 V, vec3 P, mat3 minv,
vec3 p0, vec3 p1, vec3 p2, vec3 p3, float texLayer) {
vec3 lightNormal = cross(p1 - p0, p3 - p0);
if (dot(lightNormal, P - p0) < 0.0) return vec3(0.0);
vec3 T1 = V - N * dot(V, N);
float t1len = length(T1);
T1 = t1len > 1e-5 ? T1 / t1len
: normalize(abs(N.y) < 0.999 ? cross(vec3(0.0, 1.0, 0.0), N)
: cross(vec3(1.0, 0.0, 0.0), N));
vec3 T2 = -cross(N, T1);
mat3 m = minv * transpose(mat3(T1, T2, N));
vec3 c0 = m * (p0 - P);
vec3 c1 = m * (p1 - P);
vec3 c2 = m * (p2 - P);
vec3 c3 = m * (p3 - P);
vec3 texCol = texLayer < 0.0 ? vec3(1.0) : ltcFilteredLightTex(texLayer, c0, c1, c3);
c0 = normalize(c0);
c1 = normalize(c1);
c2 = normalize(c2);
c3 = normalize(c3);
vec3 vsum = ltcEdgeVectorFormFactor(c0, c1)
+ ltcEdgeVectorFormFactor(c1, c2)
+ ltcEdgeVectorFormFactor(c2, c3)
+ ltcEdgeVectorFormFactor(c3, c0);
return vec3(ltcClippedSphereFormFactor(vsum)) * texCol;
}
vec3 evalRectAreaLight(int i, vec3 N, vec3 V, vec3 P,
vec3 diffuseColor, vec3 f0, float roughness) {
vec3 centre = uLightPos[i].xyz;
vec3 ln = uLightDir[i].xyz;
bool twoSided = uLightParams[i].w > 0.5;
bool behind = dot(P - centre, ln) < 0.0;
if (behind && !twoSided) return vec3(0.0);
vec3 hx = uLightTangent[i].xyz * uLightParams[i].y;
vec3 hy = uLightBitangent[i].xyz * uLightParams[i].z;
vec3 p0 = centre - hx - hy;
vec3 p1 = centre + hx - hy;
vec3 p2 = centre + hx + hy;
vec3 p3 = centre - hx + hy;
if (behind) {
vec3 tmp = p0; p0 = p1; p1 = tmp;
tmp = p2; p2 = p3; p3 = tmp;
}
float NoV = clamp(dot(N, V), 1e-4, 1.0);
vec2 luv = ltcLutUv(NoV, roughness);
vec4 t1 = texture(uLtc1, luv);
vec4 t2 = texture(uLtc2, luv);
float layer = uLightDir[i].w;
vec3 spec = ltcEvaluateRect(N, V, P, ltcInvMatrix(t1), p0, p1, p2, p3, layer);
spec *= f0 * t2.x + (vec3(1.0) - f0) * t2.y;
vec3 diff = ltcEvaluateRect(N, V, P, mat3(1.0), p0, p1, p2, p3, layer) * diffuseColor;
float att = 1.0;
float range = uLightPos[i].w;
if (range > 0.0) {
float dist = length(centre - P);
float fr = clamp(1.0 - pow(dist / range, 4.0), 0.0, 1.0);
att = fr * fr;
}
return uLightColor[i].rgb * (spec + diff) * att;
}
vec3 evalAreaLights(vec3 N, vec3 V, vec3 P, vec3 diffuseColor, vec3 f0, float roughness) {
vec3 areaSum = vec3(0.0);
int zltcCount = clamp(int(uLightCount.x), 0, uLightColor.length());
for (int i = 0; i < zltcCount; i++) {
if (int(uLightColor[i].w) >= 3) {
areaSum += evalRectAreaLight(i, N, V, P, diffuseColor, f0, roughness);
}
}
return areaSum;
}`,C=`
// --- visible emitter quads (#include <light-emitters>) -----------------------
// Requires #include <lights> first. Entry points:
//   bool lightEmitterVisible(int i)
//   vec3 lightEmitterCorner(int i, vec2 corner01)   // world-space quad corner
//   vec2 lightEmitterUv(int i, vec2 corner01, bool frontFacing)
//   vec3 lightEmitterRadiance(int i, vec2 uv)       // linear HDR
#include <area-lights>

bool lightEmitterVisible(int i) {
  return int(uLightColor[i].w) >= 3 && uLightTangent[i].w > 0.5;
}

// World-space corner of light i's rect. corner01 in [0,1]^2 with (0,0) at the
// texture-uv origin — the SAME mapping ltcFilteredLightTex uses (p0 = centre
// − hx − hy = uv(0,0)), so the visible quad and its reflection can never
// disagree about orientation. Collapses to the centre when not visible.
vec3 lightEmitterCorner(int i, vec2 corner01) {
  if (!lightEmitterVisible(i)) return uLightPos[i].xyz;
  vec2 e = corner01 * 2.0 - 1.0;
  return uLightPos[i].xyz
       + uLightTangent[i].xyz   * (uLightParams[i].y * e.x)
       + uLightBitangent[i].xyz * (uLightParams[i].z * e.y);
}

// Mirror u when a two-sided rect is seen from behind — the translucent-screen
// reading, matching evalRectAreaLight's corner re-wind. One-sided back faces
// are the caller's to discard (surface facing is input-driven; this include
// stays vertex-safe).
vec2 lightEmitterUv(int i, vec2 corner01, bool frontFacing) {
  bool twoSided = uLightParams[i].w > 0.5;
  return (frontFacing || !twoSided) ? corner01 : vec2(1.0 - corner01.x, corner01.y);
}

// Linear-HDR emitted radiance at uv: prefiltered mip 0 (the current frame) ×
// the packed colour (tint × intensity). Layer −1 = untextured white panel.
vec3 lightEmitterRadiance(int i, vec2 uv) {
  float layer = uLightDir[i].w;
  vec3 tex = layer < 0.0
    ? vec3(1.0)
    : textureLod(uLtcLightTex, vec3(clamp(uv, 0.0, 1.0), layer), 0.0).rgb;
  return uLightColor[i].rgb * tex;
}
// --- end <light-emitters> ----------------------------------------------------
`,w=`
#define ZED_MAX_AREA_SHADOW_SAMPLES 32
// --- Shadow mapping (#include <shadows>) ------------------------------------
// Entry points:
//   float shadowVisibility(int lightIndex, vec3 worldPos, vec3 worldN)
//     → 1.0 lit, 0.0 fully shadowed; 1.0 when the light casts no shadow.
${ee}

uniform highp sampler2DArrayShadow uShadowDepthArray;

// 3×3 PCF over a 2D shadow slot (directional ortho / spot perspective). The
// comparison sampler does a hardware 2×2 PCF per tap, so this is a smooth 6×6
// effective kernel. Returns visibility in [0,1].
float zShadowPcf2D(int slot, vec3 worldPos, vec3 N, int radius) {
  float bias = uShadowParams[slot].x;
  float normalBias = uShadowParams[slot].y;
  vec3 p = worldPos + N * normalBias;
  vec4 clip = uShadowVP[slot] * vec4(p, 1.0);
  if (clip.w <= 0.0) return 1.0;
  vec3 ndc = clip.xyz / clip.w;
  vec3 uv = ndc * 0.5 + 0.5;
  // Outside the shadow frustum (or beyond the far plane) ⇒ unshadowed.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || uv.z > 1.0) return 1.0;
  float layer = uShadowMapInfo[slot].x;
  float size = max(uShadowMapInfo[slot].z, 1.0);
  float texel = 1.0 / size;
  float ref = clamp(uv.z - bias, 0.0, 1.0);
  float vis = 0.0;
  float taps = 0.0;
  for (int dy = -radius; dy <= radius; dy++) {
    for (int dx = -radius; dx <= radius; dx++) {
      vec2 o = vec2(float(dx), float(dy)) * texel;
      vis += texture(uShadowDepthArray, vec4(uv.xy + o, layer, ref));
      taps += 1.0;
    }
  }
  return vis / max(taps, 1.0);
}

// Point-light cube shadow. The 6 faces are packed as consecutive depth-array layers
// from baseLayer; we pick the face from the light→fragment direction (the standard GL
// cube convention, matching the render-side lookAt set), reconstruct the perspective
// NDC depth from the major-axis distance + near/far (no per-face matrix needed), and
// compare. Reads the light POSITION from the Lights block — so #include <lights> first.
float zShadowCube(int slot, vec3 worldPos, vec3 N) {
  float bias = uShadowParams[slot].x;
  float normalBias = uShadowParams[slot].y;
  float near = uShadowParams[slot].z;
  float far = uShadowParams[slot].w;
  int lightIndex = int(uShadowMapInfo[slot].w);
  vec3 lightPos = uLightPos[lightIndex].xyz;
  vec3 v = (worldPos + N * normalBias) - lightPos;
  vec3 a = abs(v);
  float ma; vec2 uv; int face;
  if (a.x >= a.y && a.x >= a.z) {
    ma = a.x;
    if (v.x > 0.0) { face = 0; uv = vec2(-v.z, -v.y); } else { face = 1; uv = vec2(v.z, -v.y); }
  } else if (a.y >= a.z) {
    ma = a.y;
    if (v.y > 0.0) { face = 2; uv = vec2(v.x, v.z); } else { face = 3; uv = vec2(v.x, -v.z); }
  } else {
    ma = a.z;
    if (v.z > 0.0) { face = 4; uv = vec2(v.x, -v.y); } else { face = 5; uv = vec2(-v.x, -v.y); }
  }
  uv = uv / max(ma, 1e-4) * 0.5 + 0.5;
  float ndcZ = (far + near) / (far - near) - (2.0 * far * near) / ((far - near) * max(ma, 1e-4));
  float ref = clamp(ndcZ * 0.5 + 0.5 - bias, 0.0, 1.0);
  float layer = uShadowMapInfo[slot].x + float(face);
  float texel = 1.0 / max(uShadowMapInfo[slot].z, 1.0);
  float vis = 0.0;
  vis += texture(uShadowDepthArray, vec4(uv, layer, ref));
  vis += texture(uShadowDepthArray, vec4(uv + vec2(texel, 0.0), layer, ref));
  vis += texture(uShadowDepthArray, vec4(uv + vec2(0.0, texel), layer, ref));
  vis += texture(uShadowDepthArray, vec4(uv + vec2(texel, texel), layer, ref));
  return vis * 0.25;
}

// Soft area shadow: average the visibility from N origin points sampled across the rect
// (per-origin VPs in uAreaVP, consecutive depth-array layers from the slot's baseLayer).
// N is the LIVE sample count in uShadowCount.y (user-configurable, ≤ ZED_MAX_AREA_SHADOW_SAMPLES,
// the compile-time loop bound). The spread of occlusion across origins IS the penumbra,
// so its width tracks the rect's size — true area soft shadows, not a fixed blur. More
// samples ⇒ a smoother penumbra.
float zShadowArea(int slot, vec3 worldPos, vec3 N) {
  float bias = uShadowParams[slot].x;
  float normalBias = uShadowParams[slot].y;
  vec3 p = worldPos + N * normalBias;
  float baseLayer = uShadowMapInfo[slot].x;
  int count = int(uShadowCount.y);                     // live area sample count
  float vis = 0.0;
  for (int k = 0; k < ZED_MAX_AREA_SHADOW_SAMPLES; k++) {
    if (k >= count) break;                             // only the live samples
    vec4 clip = uAreaVP[k] * vec4(p, 1.0);
    if (clip.w <= 0.0) { vis += 1.0; continue; }       // behind the origin ⇒ lit
    vec3 ndc = clip.xyz / clip.w;
    vec3 uv = ndc * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || uv.z > 1.0) { vis += 1.0; continue; }
    float ref = clamp(uv.z - bias, 0.0, 1.0);
    vis += texture(uShadowDepthArray, vec4(uv.xy, baseLayer + float(k), ref));
  }
  return vis / max(float(count), 1.0);
}

// Sample the shadow for a given slot. Dispatches on the slot's projection kind
// (0 ortho, 1 perspective, 2 cube, 3 area).
float sampleShadowSlot(int slot, vec3 worldPos, vec3 N) {
  int kind = int(uShadowMapInfo[slot].y);
  if (kind == 2) return zShadowCube(slot, worldPos, N);
  if (kind == 3) return zShadowArea(slot, worldPos, N);
  return zShadowPcf2D(slot, worldPos, N, 1); // ortho / spot: 3×3 PCF
}

// Map a light index to its shadow slot, or −1 when the light casts no shadow.
int shadowSlotForLight(int lightIndex) {
  int count = int(uShadowCount.x);
  for (int s = 0; s < count; s++) {
    if (int(uShadowMapInfo[s].w) == lightIndex) return s;
  }
  return -1;
}

// Public API: visibility for the light at \`lightIndex\` (1.0 if it casts no shadow).
float shadowVisibility(int lightIndex, vec3 worldPos, vec3 worldN) {
  int slot = shadowSlotForLight(lightIndex);
  if (slot < 0) return 1.0;
  return sampleShadowSlot(slot, worldPos, worldN);
}
// --- end <shadows> ----------------------------------------------------------
`,T=`#ifndef ZED_PBR_BRDF_INCLUDED
#define ZED_PBR_BRDF_INCLUDED
float D_GGX(float NoH, float a) {
float a2 = a * a;
float d = (NoH * NoH) * (a2 - 1.0) + 1.0;
return a2 / max(PI * d * d, 1e-7);
}
float V_SmithGGX(float NoV, float NoL, float a) {
float a2 = a * a;
float lv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
float ll = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
return 0.5 / max(lv + ll, 1e-5);
}
vec3 F_Schlick(float VoH, vec3 f0) {
return f0 + (vec3(1.0) - f0) * pow(1.0 - VoH, 5.0);
}
vec3 F_SchlickRoughness(float cosT, vec3 f0, float rough) {
return f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(clamp(1.0 - cosT, 0.0, 1.0), 5.0);
}
vec3 cookTorrance(vec3 N, vec3 V, vec3 L, vec3 radiance, vec3 diffuseColor, vec3 f0, float a) {
float NoL = clamp(dot(N, L), 0.0, 1.0);
if (NoL <= 0.0) return vec3(0.0);
vec3 H = normalize(V + L);
float NoV = clamp(dot(N, V), 1e-4, 1.0);
float NoH = clamp(dot(N, H), 0.0, 1.0);
float VoH = clamp(dot(V, H), 0.0, 1.0);
vec3 F = F_Schlick(VoH, f0);
vec3 spec = D_GGX(NoH, a) * V_SmithGGX(NoV, NoL, a) * F;
vec3 diff = (vec3(1.0) - F) * diffuseColor / PI;
return (diff + spec) * radiance * NoL;
}
vec3 lambertDiffuse(vec3 N, vec3 L, vec3 radiance, vec3 diffuseColor) {
float NoL = clamp(dot(N, L), 0.0, 1.0);
return diffuseColor / PI * radiance * NoL;
}
#endif`,E=`#ifndef ZED_PBR_IBL_INCLUDED
#define ZED_PBR_IBL_INCLUDED
vec3 prefilteredRadianceCube(samplerCube pre, vec3 R, float rough) {
float maxMip = log2(float(textureSize(pre, 0).x));
return textureLod(pre, R, rough * maxMip).rgb;
}
vec3 prefilteredRadianceOct(highp sampler2D pre, vec3 R, float rough) {
float maxMip = log2(float(textureSize(pre, 0).x));
float lod = rough * maxMip;
#ifdef ZED_OCT_MIN_LOD
lod = max(lod, ZED_OCT_MIN_LOD);
#endif
return sampleOctEnvLodSeamless(pre, R, lod);
}
vec3 iblSpecular(vec3 prefiltered, sampler2D brdfLut, float NoV, float rough, vec3 f0) {
vec2 brdf = texture(brdfLut, vec2(NoV, rough)).rg;
return prefiltered * (f0 * brdf.x + brdf.y);
}
#endif`,D=`#ifndef ZED_PBR_NORMAL_INCLUDED
#define ZED_PBR_NORMAL_INCLUDED
vec3 geometricNormal(vec3 vNormalWS, vec3 dPdx, vec3 dPdy, bool hasVertexNormal, bool frontFacing) {
vec3 ng = hasVertexNormal ? normalize(vNormalWS) : normalize(cross(dPdx, dPdy));
return frontFacing ? ng : -ng;
}
vec3 perturbNormalTBN(
vec3 ng, vec3 mapN, vec3 dPdx, vec3 dPdy, vec2 dUVx, vec2 dUVy,
vec4 vTangent, bool hasTangent, bool frontFacing
) {
vec3 t, b;
if (hasTangent) {
t = normalize(vTangent.xyz);
b = cross(ng, t) * vTangent.w;
} else {
vec2 uv_dx = dUVx;
vec2 uv_dy = dUVy;
if (length(uv_dx) <= 1e-2) uv_dx = vec2(1.0, 0.0);
if (length(uv_dy) <= 1e-2) uv_dy = vec2(0.0, 1.0);
float det = uv_dx.x * uv_dy.y - uv_dy.x * uv_dx.y;
det = abs(det) < 1e-8 ? 1.0 : det;
vec3 t_ = (uv_dy.y * dPdx - uv_dx.y * dPdy) / det;
t = normalize(t_ - ng * dot(ng, t_));
b = cross(ng, t);
}
if (!frontFacing) {
t = -t;
b = -b;
ng = -ng;
}
return normalize(mat3(t, b, ng) * mapN);
}
#endif`,O=`#ifndef ZED_PBR_IRIDESCENCE_INCLUDED
#define ZED_PBR_IRIDESCENCE_INCLUDED
float sq(float x) { return x * x; }
vec3 sq(vec3 x) { return x * x; }
float iriSchlick(float f0, float c) { return f0 + (1.0 - f0) * pow(clamp(1.0 - c, 0.0, 1.0), 5.0); }
vec3 iriSchlick(vec3 f0, float c) { return f0 + (vec3(1.0) - f0) * pow(clamp(1.0 - c, 0.0, 1.0), 5.0); }
const mat3 XYZ_TO_REC709 = mat3(
3.2404542, -0.9692660,  0.0556434,
-1.5371385,  1.8760108, -0.2040259,
-0.4985314,  0.0415560,  1.0572252
);
vec3 Fresnel0ToIor(vec3 fresnel0) {
vec3 sqrtF0 = sqrt(fresnel0);
return (vec3(1.0) + sqrtF0) / (vec3(1.0) - sqrtF0);
}
vec3 IorToFresnel0(vec3 transmittedIor, float incidentIor) {
return sq((transmittedIor - vec3(incidentIor)) / (transmittedIor + vec3(incidentIor)));
}
float IorToFresnel0(float transmittedIor, float incidentIor) {
return sq((transmittedIor - incidentIor) / (transmittedIor + incidentIor));
}
vec3 evalSensitivity(float OPD, vec3 shift) {
float phase = 2.0 * PI * OPD * 1.0e-9;
vec3 val = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);
vec3 pos = vec3(1.6810e+06, 1.7953e+06, 2.2084e+06);
vec3 var = vec3(4.3278e+09, 9.3046e+09, 6.6121e+09);
vec3 xyz = val * sqrt(2.0 * PI * var) * cos(pos * phase + shift) * exp(-sq(phase) * var);
xyz.x += 9.7470e-14 * sqrt(2.0 * PI * 4.5282e+09) * cos(2.2399e+06 * phase + shift[0]) * exp(-4.5282e+09 * sq(phase));
xyz /= 1.0685e-7;
return XYZ_TO_REC709 * xyz;
}
vec3 evalIridescence(float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0) {
vec3 I;
float iridescenceIor = mix(outsideIOR, eta2, smoothstep(0.0, 0.03, thinFilmThickness));
float sinTheta2Sq = sq(outsideIOR / iridescenceIor) * (1.0 - sq(cosTheta1));
float cosTheta2Sq = 1.0 - sinTheta2Sq;
if (cosTheta2Sq < 0.0) return vec3(1.0);
float cosTheta2 = sqrt(cosTheta2Sq);
float R0 = IorToFresnel0(iridescenceIor, outsideIOR);
float R12 = iriSchlick(R0, cosTheta1);
float R21 = R12;
float T121 = 1.0 - R12;
float phi12 = 0.0;
if (iridescenceIor < outsideIOR) phi12 = PI;
float phi21 = PI - phi12;
vec3 baseIOR = Fresnel0ToIor(clamp(baseF0, 0.0, 0.9999));
vec3 R1 = IorToFresnel0(baseIOR, iridescenceIor);
vec3 R23 = iriSchlick(R1, cosTheta2);
vec3 phi23 = vec3(0.0);
if (baseIOR[0] < iridescenceIor) phi23[0] = PI;
if (baseIOR[1] < iridescenceIor) phi23[1] = PI;
if (baseIOR[2] < iridescenceIor) phi23[2] = PI;
float OPD = 2.0 * iridescenceIor * thinFilmThickness * cosTheta2;
vec3 phi = vec3(phi21) + phi23;
vec3 R123 = clamp(R12 * R23, 1e-5, 0.9999);
vec3 r123 = sqrt(R123);
vec3 Rs = sq(T121) * R23 / (vec3(1.0) - R123);
vec3 C0 = R12 + Rs;
I = C0;
vec3 Cm = Rs - T121;
for (int m = 1; m <= 2; ++m) {
Cm *= r123;
vec3 Sm = 2.0 * evalSensitivity(float(m) * OPD, float(m) * phi);
I += Cm * Sm;
}
return max(I, vec3(0.0));
}
#endif`,k=`#ifndef ZED_TONEMAP_INCLUDED
#define ZED_TONEMAP_INCLUDED
vec3 tonemapExposureGamma(vec3 color, float exposure) {
return pow(vec3(1.0) - exp(-color * exposure), vec3(1.0 / 2.2));
}
vec3 linearExposure(vec3 color, float exposure) {
return color * exposure;
}
vec3 tonemapACESFitted(vec3 color, float exposure) {
const mat3 acesIn = mat3(
0.59719, 0.07600, 0.02840,
0.35458, 0.90834, 0.13383,
0.04823, 0.01566, 0.83777);
const mat3 acesOut = mat3(
1.60475, -0.10208, -0.00327,
-0.53108,  1.10813, -0.07276,
-0.07367, -0.00605,  1.07602);
vec3 v = acesIn * (color * exposure);
vec3 a = v * (v + 0.0245786) - 0.000090537;
vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
v = acesOut * (a / b);
return pow(clamp(v, 0.0, 1.0), vec3(1.0 / 2.2));
}
#endif`,ae=`#ifndef ZED_TRIPLANAR_INCLUDED
#define ZED_TRIPLANAR_INCLUDED

// Per-axis blend weights from the surface normal. \`sharpness\` (>= 1) narrows the
// transition bands where two projection planes meet (1 = broad, 8 = crisp).
vec3 triplanarWeights(vec3 n, float sharpness) {
  vec3 w = pow(abs(n), vec3(max(sharpness, 1e-3)));
  return w / max(w.x + w.y + w.z, 1e-5);
}

// Colour / data sample (albedo, ORM, any non-normal map). \`scale\` = texture
// repeats per unit of \`p\`'s space.
vec4 triplanarSample(sampler2D tex, vec3 p, vec3 n, float scale, float sharpness) {
  vec3 w = triplanarWeights(n, sharpness);
  return texture(tex, p.zy * scale) * w.x
       + texture(tex, p.xz * scale) * w.y
       + texture(tex, p.xy * scale) * w.z;
}

// Whiteout / UDN triplanar normal mapping. \`geomN\` is the (normalized) geometric
// normal in the same space as \`p\`. Returns a perturbed normal in THAT space — the
// caller transforms it to world for shading. No per-face tangents required.
vec3 triplanarNormal(sampler2D nmap, vec3 p, vec3 geomN, float scale, float sharpness) {
  vec3 w = triplanarWeights(geomN, sharpness);
  // Per-plane tangent-space normals, decoded [0,1] -> [-1,1].
  vec3 nx = texture(nmap, p.zy * scale).xyz * 2.0 - 1.0;
  vec3 ny = texture(nmap, p.xz * scale).xyz * 2.0 - 1.0;
  vec3 nz = texture(nmap, p.xy * scale).xyz * 2.0 - 1.0;
  // Whiteout blend: add the geometric normal's in-plane components, keep |z| outward.
  nx = vec3(nx.xy + geomN.zy, abs(nx.z) * geomN.x);
  ny = vec3(ny.xy + geomN.xz, abs(ny.z) * geomN.y);
  nz = vec3(nz.xy + geomN.xy, abs(nz.z) * geomN.z);
  // Swizzle each back onto world/object axes and blend.
  return normalize(nx.zyx * w.x + ny.xzy * w.y + nz.xyz * w.z);
}

#endif // ZED_TRIPLANAR_INCLUDED
`,A=`#ifndef ZED_CHARTS_DATA_INCLUDED
#define ZED_CHARTS_DATA_INCLUDED

// Ring column for \`slot\` steps back from \`head\` (slot 0 = newest), wrapped
// into [0,capacity). Mirrors ringMath.ts:headRelative.
int chartRingCol(int head, int slot, int capacity) {
  return ((head - slot) % capacity + capacity) % capacity;
}

// One sample from a per-series ring: \`series\` = texture row, \`slot\` = steps
// back from that series' head. Returns the raw texel (value, t, valid, _).
vec4 chartFetch(sampler2D ring, int series, int slot, int capacity, int head) {
  return texelFetch(ring, ivec2(chartRingCol(head, slot, capacity), series), 0);
}

// Normalise into [0,1] over [lo,hi] (clamped, divide-by-zero safe).
float chartNorm(float v, float lo, float hi) {
  return clamp((v - lo) / max(hi - lo, 1e-6), 0.0, 1.0);
}

// Timestamp → x; newest (t==now) at 1.0, window edge at 0.0. <0 ⇒ out of window.
float chartTimeX(float t, float now, float window) {
  return 1.0 - (now - t) / max(window, 1e-6);
}

// Ring ROW for \`ago\` rows back from \`head\` (ago 0 = newest), wrapped into
// [0,rows). The categorical (replace-snapshot) twin of chartRingCol.
int chartRingRow(int head, int ago, int rows) {
  return ((head - ago) % rows + rows) % rows;
}

// Category index → x centre in [0,1].
float chartCategoryX(int cat, int categoryCount) {
  return (float(cat) + 0.5) / float(categoryCount);
}

// Eased categorical value for column \`cat\`: mix(head-1 row, head row) by
// \`mixFactor\` (0 → previous snapshot, 1 → newest). \`ring\` is
// categoryCount(width)×rows(height); \`rowHead\` is the newest row. Raw .r value.
float chartRowSnapshot(sampler2D ring, int cat, int rowHead, int rows, float mixFactor) {
  float vNew = texelFetch(ring, ivec2(cat, chartRingRow(rowHead, 0, rows)), 0).r;
  float vOld = texelFetch(ring, ivec2(cat, chartRingRow(rowHead, 1, rows)), 0).r;
  return mix(vOld, vNew, clamp(mixFactor, 0.0, 1.0));
}
#endif
`,j=`#ifndef ZED_CHARTS_LINE_INCLUDED
#define ZED_CHARTS_LINE_INCLUDED

// NDC sub-rect (x0,y0,x1,y1) for lane \`series\` of \`count\`, stacked top→bottom
// inside \`plot\` (x0,y0,x1,y1 in NDC, y grows up). \`gapFrac\` leaves a separator.
vec4 chartLaneRect(int series, int count, vec4 plot, float gapFrac) {
  float h = (plot.w - plot.y) / float(count);
  float top = plot.w - float(series) * h;   // lane 0 at plot top
  float pad = h * gapFrac * 0.5;
  return vec4(plot.x, top - h + pad, plot.z, top - pad);
}

// Expand a segment (NDC a→b) into a screen-space-thick quad. \`vid\` = gl_VertexID
// 0..3 (TRIANGLE_STRIP). \`widthPx\` is the QUAD width (visible core ≈ half; the
// rest is glow headroom). \`vY\` ∈ [-1,1] is the signed cross-line coordinate.
// NOTE: the viewport-size param is \`resolution\`, NOT \`screen\` — \`screen\` is an
// engine \`#define screen uResolution.xy\` and would expand inside this signature.
vec4 chartExpand(vec2 a, vec2 b, float widthPx, vec2 resolution, int vid, out float vY) {
  vec2 sa = (a * 0.5 + 0.5) * resolution;    // NDC → pixels
  vec2 sb = (b * 0.5 + 0.5) * resolution;
  vec2 dir = sb - sa;
  float len = length(dir);
  vec2 u = len > 1e-5 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-u.y, u.x);
  float endT = (vid >= 2) ? 1.0 : 0.0;
  float side = ((vid & 1) == 1) ? 1.0 : -1.0;
  vec2 p = mix(sa, sb, endT) + nrm * (widthPx * 0.5 * side);
  vY = side;
  return vec4((p / resolution) * 2.0 - 1.0, 0.0, 1.0);  // pixels → clip
}
#endif
`,M=`#ifndef ZED_CHARTS_LINE_AA_INCLUDED
#define ZED_CHARTS_LINE_AA_INCLUDED

// fwidth AA core: visible line occupies the inner half (|vY|<0.5), feathered.
float chartLineCoverage(float vY) {
  float d = abs(vY);
  float w = fwidth(d) + 1e-4;
  return 1.0 - smoothstep(0.5 - w, 0.5 + w, d);
}

// Soft glow out to the quad edge, widened/brightened by \`flare\` ∈ [0,1].
float chartGlow(float vY, float flare) {
  float d = abs(vY);
  float base = (1.0 - smoothstep(0.0, 1.0, d)) * 0.35;
  return base * (1.0 + flare * 3.0);
}
#endif
`,N=`#ifndef ZED_CHARTS_GRID_INCLUDED
#define ZED_CHARTS_GRID_INCLUDED

// Antialiased grid intensity [0,1] for \`cells\` divisions across coordinate
// space \`p\` (e.g. uv*cells already applied → pass p in cell units).
float chartGridLines(vec2 p, vec2 cells, float widthPx, vec2 resolution) {
  vec2 grid = abs(fract(p) - 0.5) / max(fwidth(p), vec2(1e-6));
  float line = min(grid.x, grid.y);
  return 1.0 - clamp(line - (widthPx - 1.0), 0.0, 1.0);
}

// Horizontal guide at normalised height \`yNorm\` within a lane's local v∈[0,1].
// Fixed half-thickness \`hw\` in lane-normalised units — NOT fwidth-derived:
// fwidth(fract(lane)) spikes at the lane seam (the wrap 1→0), blowing the band
// up to full-lane width on the seam row → a resolution-dependent phantom guide.
// A fixed delta is the seam-free, resolution-stable \`abs(v-yNorm) < delta\` idiom;
// a hair of smoothstep softens the edge.
float chartHGuide(float v, float yNorm, float hw) {
  hw = min(hw, 0.05);   // a guide thicker than ~5% of a lane is a mistake; also
                        // stops a stale caller's old fwidth widthPx (e.g. 4.0)
                        // from painting a solid full-lane block.
  float aa = hw * 0.35;
  return 1.0 - smoothstep(hw - aa, hw + aa, abs(v - yNorm));
}
#endif
`,P=`#ifndef ZED_CHARTS_COLOR_INCLUDED
#define ZED_CHARTS_COLOR_INCLUDED

// Cool→warm heat ramp for t∈[0,1]: deep blue → cyan → amber → hot red.
vec3 chartHeat(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.05, 0.10, 0.28);
  vec3 c1 = vec3(0.10, 0.55, 0.75);
  vec3 c2 = vec3(1.00, 0.65, 0.20);
  vec3 c3 = vec3(1.00, 0.20, 0.12);
  vec3 lo = mix(c0, c1, smoothstep(0.0, 0.4, t));
  vec3 hi = mix(c2, c3, smoothstep(0.7, 1.0, t));
  return mix(lo, hi, smoothstep(0.35, 0.75, t));
}
#endif
`,F=`#ifndef ZED_CHARTS_BAR_INCLUDED
#define ZED_CHARTS_BAR_INCLUDED

// AA coverage [0,1] for a vertical bar in a fullscreen pass. \`uv\` is band-local
// (x,y ∈ [0,1], y up). \`barTop\` = normalised bar height for this column.
// \`gapFrac\` ∈ [0,1) leaves a gap between adjacent bars. Bars share x with the
// waterfall (chartHeatmapCell) — columns are evenly spaced, never re-sorted.
float chartBarCoverage(vec2 uv, int categoryCount, float barTop, float gapFrac) {
  float cw = 1.0 / float(categoryCount);
  float local = fract(uv.x / cw);                 // 0..1 across this category cell
  float halfW = (1.0 - gapFrac) * 0.5;
  float dx = abs(local - 0.5);
  // AA width from the CONTINUOUS coordinate — fwidth(local) spikes at every cell
  // seam (fract wraps 1→0) and paints a spurious half-lit line in the gap.
  float ex = fwidth(uv.x) / cw + 1e-5;
  float sideCov = 1.0 - smoothstep(halfW - ex, halfW + ex, dx);
  float ey = fwidth(uv.y) + 1e-5;
  float topCov = 1.0 - smoothstep(barTop - ey, barTop + ey, uv.y); // filled below the top
  return sideCov * topCov;
}

// Raw categorical cell value for the waterfall band. \`uv\` band-local (y up);
// the newest snapshot row sits at the TOP (uv.y == 1). Returns the .r value
// (caller normalises + colours via chartHeat).
float chartHeatmapCell(sampler2D ring, vec2 uv, int categoryCount, int rowHead, int rows) {
  int cat = clamp(int(uv.x * float(categoryCount)), 0, categoryCount - 1);
  int ago = clamp(int((1.0 - uv.y) * float(rows)), 0, rows - 1);
  return texelFetch(ring, ivec2(cat, chartRingRow(rowHead, ago, rows)), 0).r;
}
#endif
`,I=`#ifndef ZED_CHARTS_LABEL_INCLUDED
#define ZED_CHARTS_LABEL_INCLUDED

// Atlas-UV rect (u0,v0,u1,v1) for entry \`entry\` of a 2D rects texture that is
// \`rectsW\` texels wide (wrapping into rows). texelFetch — exact, NEAREST.
vec4 chartLabelRect(sampler2D rects, int entry, int rectsW) {
  ivec2 c = ivec2(entry % rectsW, entry / rectsW);
  return texelFetch(rects, c, 0);
}

// AA coverage for a label inside a cell. \`cellUV\` ∈ [0,1] is the fragment's
// position within the label's placed (aspect-fit) box; \`uvRect\` is its atlas
// sub-rect. \`rotate\` maps the cell 90° (swap axes) for sideways axis labels.
// Samples the R8 atlas (.r coverage), fwidth-AA'd.
float chartLabelCoverage(sampler2D atlas, vec4 uvRect, vec2 cellUV, bool rotate) {
  vec2 t = rotate ? vec2(cellUV.y, 1.0 - cellUV.x) : cellUV;
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  // The atlas is top-left origin (v0 = glyph top); screen uv is bottom-up — flip v.
  vec2 uv = mix(uvRect.xy, uvRect.zw, vec2(t.x, 1.0 - t.y));
  float cov = texture(atlas, uv).r;
  float aa = fwidth(cov) + 1e-4;
  return smoothstep(0.5 - aa, 0.5 + aa, cov);
}
#endif
`,L=`#ifndef ZED_CHARTS_GEO_INCLUDED
#define ZED_CHARTS_GEO_INCLUDED

// lon/lat (degrees) → sphere XYZ at \`radius\` (Y-up, east = −z; zapjs convention).
vec3 chartLonLatToXYZ(vec2 lonLatDeg, float radius) {
  vec2 r = lonLatDeg * 0.017453292519943295; // π/180
  float cl = cos(r.y);
  return vec3(radius * cl * cos(r.x), radius * sin(r.y), -radius * cl * sin(r.x));
}

// Quad corner in [-1,1]^2 for an INSTANCED_BILLBOARD vertex (gl_VertexID 0..3,
// triangle strip). 0→(-1,-1) 1→(1,-1) 2→(-1,1) 3→(1,1).
vec2 chartBillboardCorner(int vid) {
  return vec2(float(vid & 1), float((vid >> 1) & 1)) * 2.0 - 1.0;
}
#endif
`,R=A+`
`+j+`
`+M+`
`+N+`
`+P+`
`+F+`
`+L+`
`+I,z=`#ifndef ZED_POST_SAMPLE_INCLUDED
#define ZED_POST_SAMPLE_INCLUDED
float postLuma(vec3 c) {
return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
vec3 postDownsample13(sampler2D tex, vec2 uv) {
vec2 px = 1.0 / vec2(textureSize(tex, 0));
vec3 a = texture(tex, uv + px * vec2(-2.0,  2.0)).rgb;
vec3 b = texture(tex, uv + px * vec2( 0.0,  2.0)).rgb;
vec3 c = texture(tex, uv + px * vec2( 2.0,  2.0)).rgb;
vec3 d = texture(tex, uv + px * vec2(-2.0,  0.0)).rgb;
vec3 e = texture(tex, uv).rgb;
vec3 f = texture(tex, uv + px * vec2( 2.0,  0.0)).rgb;
vec3 g = texture(tex, uv + px * vec2(-2.0, -2.0)).rgb;
vec3 h = texture(tex, uv + px * vec2( 0.0, -2.0)).rgb;
vec3 i = texture(tex, uv + px * vec2( 2.0, -2.0)).rgb;
vec3 j = texture(tex, uv + px * vec2(-1.0,  1.0)).rgb;
vec3 k = texture(tex, uv + px * vec2( 1.0,  1.0)).rgb;
vec3 l = texture(tex, uv + px * vec2(-1.0, -1.0)).rgb;
vec3 m = texture(tex, uv + px * vec2( 1.0, -1.0)).rgb;
vec3 col = e * 0.125;
col += (a + c + g + i) * 0.03125;
col += (b + d + f + h) * 0.0625;
col += (j + k + l + m) * 0.125;
return col;
}
vec3 postDownsample13Karis(sampler2D tex, vec2 uv) {
vec2 px = 1.0 / vec2(textureSize(tex, 0));
vec3 a = texture(tex, uv + px * vec2(-2.0,  2.0)).rgb;
vec3 b = texture(tex, uv + px * vec2( 0.0,  2.0)).rgb;
vec3 c = texture(tex, uv + px * vec2( 2.0,  2.0)).rgb;
vec3 d = texture(tex, uv + px * vec2(-2.0,  0.0)).rgb;
vec3 e = texture(tex, uv).rgb;
vec3 f = texture(tex, uv + px * vec2( 2.0,  0.0)).rgb;
vec3 g = texture(tex, uv + px * vec2(-2.0, -2.0)).rgb;
vec3 h = texture(tex, uv + px * vec2( 0.0, -2.0)).rgb;
vec3 i = texture(tex, uv + px * vec2( 2.0, -2.0)).rgb;
vec3 j = texture(tex, uv + px * vec2(-1.0,  1.0)).rgb;
vec3 k = texture(tex, uv + px * vec2( 1.0,  1.0)).rgb;
vec3 l = texture(tex, uv + px * vec2(-1.0, -1.0)).rgb;
vec3 m = texture(tex, uv + px * vec2( 1.0, -1.0)).rgb;
vec3 g0 = (a + b + d + e) * 0.25;
vec3 g1 = (b + c + e + f) * 0.25;
vec3 g2 = (d + e + g + h) * 0.25;
vec3 g3 = (e + f + h + i) * 0.25;
vec3 g4 = (j + k + l + m) * 0.25;
float w0 = 1.0 / (1.0 + postLuma(g0));
float w1 = 1.0 / (1.0 + postLuma(g1));
float w2 = 1.0 / (1.0 + postLuma(g2));
float w3 = 1.0 / (1.0 + postLuma(g3));
float w4 = 4.0 / (1.0 + postLuma(g4));
return (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4)
/ max(w0 + w1 + w2 + w3 + w4, 1e-5);
}
vec3 postDownsampleDual(sampler2D tex, vec2 uv) {
vec2 px = 1.0 / vec2(textureSize(tex, 0));
vec3 sum = texture(tex, uv).rgb * 4.0;
sum += texture(tex, uv - px).rgb;
sum += texture(tex, uv + px).rgb;
sum += texture(tex, uv + vec2(px.x, -px.y)).rgb;
sum += texture(tex, uv - vec2(px.x, -px.y)).rgb;
return sum * 0.125;
}
vec3 postUpsampleTent(sampler2D tex, vec2 uv, float radius) {
vec2 px = radius / vec2(textureSize(tex, 0));
vec3 sum = texture(tex, uv + px * vec2(-1.0,  1.0)).rgb;
sum += texture(tex, uv + px * vec2( 0.0,  1.0)).rgb * 2.0;
sum += texture(tex, uv + px * vec2( 1.0,  1.0)).rgb;
sum += texture(tex, uv + px * vec2(-1.0,  0.0)).rgb * 2.0;
sum += texture(tex, uv).rgb * 4.0;
sum += texture(tex, uv + px * vec2( 1.0,  0.0)).rgb * 2.0;
sum += texture(tex, uv + px * vec2(-1.0, -1.0)).rgb;
sum += texture(tex, uv + px * vec2( 0.0, -1.0)).rgb * 2.0;
sum += texture(tex, uv + px * vec2( 1.0, -1.0)).rgb;
return sum * 0.0625;
}
vec3 postUpsampleDual(sampler2D tex, vec2 uv, float radius) {
vec2 px = radius / vec2(textureSize(tex, 0));
vec3 sum = texture(tex, uv + vec2(-px.x * 2.0, 0.0)).rgb;
sum += texture(tex, uv + vec2(-px.x,  px.y)).rgb * 2.0;
sum += texture(tex, uv + vec2(0.0,  px.y * 2.0)).rgb;
sum += texture(tex, uv + vec2( px.x,  px.y)).rgb * 2.0;
sum += texture(tex, uv + vec2( px.x * 2.0, 0.0)).rgb;
sum += texture(tex, uv + vec2( px.x, -px.y)).rgb * 2.0;
sum += texture(tex, uv + vec2(0.0, -px.y * 2.0)).rgb;
sum += texture(tex, uv + vec2(-px.x, -px.y)).rgb * 2.0;
return sum / 12.0;
}
#endif`,B=`#ifndef ZED_POST_BLUR_INCLUDED
#define ZED_POST_BLUR_INCLUDED
vec3 postGaussian1D(sampler2D tex, vec2 uv, vec2 dir, float sigma, int taps) {
vec2 px = 1.0 / vec2(textureSize(tex, 0));
float sg = max(sigma, 1e-3);
vec3 inc;
inc.x = 1.0;
inc.y = exp(-0.5 / (sg * sg));
inc.z = inc.y * inc.y;
vec3 sum = texture(tex, uv).rgb;
float wSum = 1.0;
inc.xy *= inc.yz;
for (int i = 1; i <= taps; i++) {
float w1 = inc.x;
inc.xy *= inc.yz;
float w2 = inc.x;
inc.xy *= inc.yz;
float w12 = w1 + w2;
float off = float(2 * i - 1) + w2 / max(w12, 1e-6);
vec2 d = dir * px * off;
sum += (texture(tex, uv + d).rgb + texture(tex, uv - d).rgb) * w12;
wSum += 2.0 * w12;
}
return sum / max(wSum, 1e-6);
}
vec3 postKawase(sampler2D tex, vec2 uv, float offset) {
vec2 px = 1.0 / vec2(textureSize(tex, 0));
vec2 o = (vec2(offset) + 0.5) * px;
vec3 sum = texture(tex, uv + vec2( o.x,  o.y)).rgb;
sum += texture(tex, uv + vec2(-o.x,  o.y)).rgb;
sum += texture(tex, uv + vec2( o.x, -o.y)).rgb;
sum += texture(tex, uv + vec2(-o.x, -o.y)).rgb;
return sum * 0.25;
}
#endif`,V=`#ifndef ZED_POST_BLOOM_INCLUDED
#define ZED_POST_BLOOM_INCLUDED
vec3 postThresholdSoftKnee(vec3 c, float threshold, float knee) {
float br = max(c.r, max(c.g, c.b));
float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
rq = (rq * rq) / (4.0 * knee + 1e-4);
return c * (max(rq, br - threshold) / max(br, 1e-4));
}
vec3 postBloomMix(vec3 scene, vec3 bloom, float scatter, vec3 tint) {
return mix(scene, bloom * tint, clamp(scatter, 0.0, 1.0));
}
vec3 postBloomAdd(vec3 scene, vec3 bloom, float intensity, vec3 tint) {
return scene + bloom * tint * intensity;
}
#endif`,H=`#ifndef ZED_POST_COLOR_INCLUDED
#define ZED_POST_COLOR_INCLUDED
vec3 postVignette(vec3 c, vec2 uv, float amount, float roundness, float softness) {
vec2 d = abs(uv - 0.5) * 2.0;
float r = mix(6.0, 2.0, clamp(roundness, 0.0, 1.0));
float dist = pow(pow(d.x, r) + pow(d.y, r), 1.0 / r);
float s = clamp(softness, 1e-3, 1.0);
float mask = 1.0 - clamp(amount, 0.0, 1.0) * smoothstep(1.0 - s, 1.0 + 0.25 * s, dist);
return c * mask;
}
float _zp_hash21(vec2 p) {
vec3 p3 = fract(vec3(p.xyx) * 0.1031);
p3 += dot(p3, p3.yzx + 33.33);
return fract((p3.x + p3.y) * p3.z);
}
vec3 postGrain(vec3 c, vec2 uv, float t, float amount) {
float g = _zp_hash21(uv * 1024.0 + fract(t) * vec2(17.0, 61.0)) - 0.5;
return c + vec3(g) * amount;
}
vec3 postChromaticAberration(sampler2D tex, vec2 uv, vec2 center, float strength) {
vec2 off = (uv - center) * strength;
return vec3(
texture(tex, uv + off).r,
texture(tex, uv).g,
texture(tex, uv - off).b);
}
#endif`,U=`#ifndef ZED_POST_LUT_INCLUDED
#define ZED_POST_LUT_INCLUDED
vec3 postLutGrade(sampler2D lut, vec3 c, float size, float amount) {
float n = max(size, 2.0);
vec3 cc = clamp(c, 0.0, 1.0);
float slice = cc.b * (n - 1.0);
float s0 = floor(slice);
float s1 = min(s0 + 1.0, n - 1.0);
vec2 tileUv = vec2(
(cc.r * (n - 1.0) + 0.5) / (n * n),
(cc.g * (n - 1.0) + 0.5) / n);
vec3 g0 = texture(lut, tileUv + vec2(s0 / n, 0.0)).rgb;
vec3 g1 = texture(lut, tileUv + vec2(s1 / n, 0.0)).rgb;
return mix(c, mix(g0, g1, slice - s0), clamp(amount, 0.0, 1.0));
}
#endif`,W=`#ifndef ZED_POST_DITHER_INCLUDED
#define ZED_POST_DITHER_INCLUDED
vec2 _zp_r2(float n) {
return fract(vec2(0.7548776662, 0.5698402910) * n);
}
float _zp_ign(vec2 p) {
return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
float _zp_dhash21(vec2 p) {
vec3 p3 = fract(vec3(p.xyx) * 0.1031);
p3 += dot(p3, p3.yzx + 33.33);
return fract((p3.x + p3.y) * p3.z);
}
float _zp_bayer8(vec2 p) {
ivec2 q = ivec2(p) & 7;
int a = q.x ^ q.y;
int b = q.y;
int i = ((a & 1) << 5) | ((b & 1) << 4)
| ((a & 2) << 2) | ((b & 2) << 1)
| ((a & 4) >> 1) | ((b & 4) >> 2);
return (float(i) + 0.5) / 64.0;
}
vec3 postDitherBlue(vec3 c, sampler2D tex, vec2 fragCoord, float n) {
vec2 uvN = fragCoord / vec2(textureSize(tex, 0)) + _zp_r2(n);
float d = texture(tex, uvN).r;
return c + vec3((d - 0.5) / 255.0);
}
vec3 postDitherIGN(vec3 c, vec2 fragCoord, float n) {
return c + vec3((_zp_ign(fragCoord + 5.588238 * n) - 0.5) / 255.0);
}
vec3 postDitherBayer(vec3 c, vec2 fragCoord) {
return c + vec3((_zp_bayer8(fragCoord) - 0.5) / 255.0);
}
vec3 postDitherTPDF(vec3 c, vec2 fragCoord, float n) {
vec2 o = _zp_r2(n);
float r1 = _zp_dhash21(fragCoord + o * 1024.0);
float r2 = _zp_dhash21(fragCoord.yx * 1.6180339 + o * 512.0 + 17.0);
return c + vec3((r1 + r2 - 1.0) / 255.0);
}
#endif`,G=[z,B,V,H,U,W].join(`
`),K=`#ifndef ZED_TILEMAP_INCLUDED
#define ZED_TILEMAP_INCLUDED

// World-pixel position → integer tile cell (floored).
ivec2 tilemapCell(vec2 worldPx, vec2 tileSizePx) {
  return ivec2(floor(worldPx / tileSizePx));
}

// World-pixel position → local UV within its tile ([0,1), wraps per cell).
vec2 tileLocalUV(vec2 worldPx, vec2 tileSizePx) {
  return fract(worldPx / tileSizePx);
}

// Tile index at \`cell\` in an rgba8 map (index packed in R, 0..255).
// texelFetch → exact, NEAREST. 255 is reserved "empty" by preset convention.
int tileIndexAt(sampler2D map, ivec2 cell) {
  return int(texelFetch(map, cell, 0).r * 255.0 + 0.5);
}

// Per-tile flags at \`cell\` from the map's G channel: bit0 = flip-X, bit1 = flip-Y.
int tileFlagsAt(sampler2D map, ivec2 cell) {
  return int(texelFetch(map, cell, 0).g * 255.0 + 0.5);
}

// Apply flip flags (bit0 = flip-X, bit1 = flip-Y) to a local [0,1] UV.
vec2 tileApplyFlips(vec2 localUV, int flags) {
  if ((flags & 1) != 0) localUV.x = 1.0 - localUV.x;
  if ((flags & 2) != 0) localUV.y = 1.0 - localUV.y;
  return localUV;
}

// Row-major tile index → atlas UV, with a HALF-TEXEL INSET so LINEAR / mip
// sampling never bleeds a neighbouring tile. \`atlasTiles\` = tile grid (cols,
// rows); \`tileSizePx\` = one tile in texels; \`atlasSizePx\` = whole atlas in
// texels; \`localUV\` ∈ [0,1] within the tile.
vec2 tileAtlasUV(int index, ivec2 atlasTiles, vec2 tileSizePx, vec2 atlasSizePx, vec2 localUV) {
  int col = index - (index / atlasTiles.x) * atlasTiles.x; // index % cols
  int row = index / atlasTiles.x;
  vec2 originPx = vec2(float(col), float(row)) * tileSizePx;
  vec2 lo = (originPx + 0.5) / atlasSizePx;
  vec2 hi = (originPx + tileSizePx - 0.5) / atlasSizePx;
  return mix(lo, hi, clamp(localUV, 0.0, 1.0));
}

// Parallax offset for a scrolling background layer. \`factor\` < 1 scrolls a
// distant layer slower than the camera; 1.0 = locked to the world.
vec2 parallaxUV(vec2 worldPx, vec2 cameraPx, float factor) {
  return worldPx + cameraPx * factor;
}

// Snap a pixel coordinate to a texel centre (crisp integer-scale pixel art).
vec2 pixelSnap(vec2 px) {
  return floor(px) + 0.5;
}
#endif
`,q=`#ifndef ZED_TILEMAP_AA_INCLUDED
#define ZED_TILEMAP_AA_INCLUDED

// The "fat pixel" filter (Yuksel / klems): sample nearest-style texel centres
// but antialias the texel SEAMS over one screen-pixel footprint (fwidth). Gives
// crisp-but-antialiased pixel art at any scale / rotation — the beautiful high
// path. \`uv\` is a normalised atlas UV; \`texSizePx\` the sampled texture's size.
// Uses fwidth → DO NOT #include in a vertex shader.
vec2 fatPixelUV(vec2 uv, vec2 texSizePx) {
  vec2 p = uv * texSizePx;                 // UV → texel space
  vec2 seam = floor(p + 0.5);              // nearest texel centre
  vec2 dp = fwidth(p);                     // screen footprint, in texels
  vec2 pp = seam + clamp((p - seam) / max(dp, vec2(1e-6)), -0.5, 0.5);
  return pp / texSizePx;                   // → normalised UV
}
#endif
`,J=`#ifndef ZED_SPRITES_INCLUDED
#define ZED_SPRITES_INCLUDED

// Quad corner in [-1,1]^2 for an INSTANCED_BILLBOARD vertex (gl_VertexID 0..3,
// triangle strip): 0→(-1,-1) 1→(1,-1) 2→(-1,1) 3→(1,1). Re-declared under its
// own guard so <sprites> is self-contained (the <charts-geo> precedent).
vec2 spriteCorner(int vid) {
  return vec2(float(vid & 1), float((vid >> 1) & 1)) * 2.0 - 1.0;
}

// Apply flip flags (bit0 = flip-X, bit1 = flip-Y) to a local [0,1] UV.
vec2 spriteApplyFlips(vec2 localUV, int flags) {
  if ((flags & 1) != 0) localUV.x = 1.0 - localUV.x;
  if ((flags & 2) != 0) localUV.y = 1.0 - localUV.y;
  return localUV;
}

// Sheet frame index → atlas UV, with the SAME half-texel inset as <tilemap>.
// \`sheetTiles\` = frame grid (cols, rows); \`tileSizePx\` = one frame in texels;
// \`sheetSizePx\` = whole sheet in texels; \`localUV\` ∈ [0,1] within the frame.
vec2 spriteFrameUV(int frame, ivec2 sheetTiles, vec2 tileSizePx, vec2 sheetSizePx, vec2 localUV) {
  int col = frame - (frame / sheetTiles.x) * sheetTiles.x; // frame % cols
  int row = frame / sheetTiles.x;
  vec2 originPx = vec2(float(col), float(row)) * tileSizePx;
  vec2 lo = (originPx + 0.5) / sheetSizePx;
  vec2 hi = (originPx + tileSizePx - 0.5) / sheetSizePx;
  return mix(lo, hi, clamp(localUV, 0.0, 1.0));
}

// Time → frame index. \`mode\`: 0 loop, 1 clamp (hold last), 2 ping-pong.
int spriteFrameFromTime(float t, float fps, int frameCount, int mode) {
  if (frameCount <= 1) return 0;
  int f = int(floor(t * fps));
  if (mode == 1) {                          // clamp
    return clamp(f, 0, frameCount - 1);
  } else if (mode == 2) {                   // ping-pong
    int period = 2 * (frameCount - 1);
    int m = ((f % period) + period) % period;
    return m < frameCount ? m : period - m;
  }
  return ((f % frameCount) + frameCount) % frameCount; // loop
}
#endif
`;K+``+J;var oe=`#ifndef ZED_BVH_TRACE
#define ZED_BVH_TRACE

${ne}

// ── Precision floor ─────────────────────────────────────────────────────────
// ESSL 3.00 only guarantees IEEE fp32 where \`highp\` is honoured, and Zed
// auto-downgrades highp→mediump when HAS_FRAGMENT_HIGHP is absent. At mediump,
// the slab test and Möller–Trumbore's determinant lose so many bits that the
// traversal returns plausible nonsense. Fail LOUDLY (a debug tint) instead of
// misrendering silently — the floor rung of the degradation ladder.
#if !defined(HAS_FRAGMENT_HIGHP)
  #define BVH_UNAVAILABLE 1
#endif

// Traversal stack. The traversal pops one node and pushes at most two, so it holds
// at most one un-visited sibling per ancestor level — bounded by the tree's depth.
//
// THE ENGINE NORMALLY INJECTS THIS. A pass with a baked \`bvh\` node wired in gets
// \`BVH_STACK_DEPTH\` = that tree's depth + 2 (\`bvhStackDepthForTree\`, injected in
// reconcile.ts), because the bake already knows the depth and a stack that fits is
// much faster than one that merely cannot overflow: the stack is a DYNAMICALLY
// INDEXED local array, which a GPU cannot keep in registers — past a few entries
// it spills to scratch memory and occupancy collapses, at every traversal call
// site. Measured on an AMD iGPU: 40 → 24 against a depth-17 tree roughly HALVED
// the pass.
//
// The fallback below is BVH_MAX_DEPTH (build.ts): overflow-proof for ANY tree the
// builder can emit, and used when nothing is baked yet or no bvh edge is wired.
// A shader may \`#define BVH_STACK_DEPTH\` itself, in which case the engine defers
// to it and injects nothing.
#ifndef BVH_STACK_DEPTH
  #define BVH_STACK_DEPTH 40
#endif

// Runaway backstop for the traversal loop. Never reached by a well-formed tree;
// it exists so a corrupt artifact hangs a pixel, not the GPU.
#ifndef BVH_MAX_STEPS
  #define BVH_MAX_STEPS 512
#endif

// ── Traversal variant (spec W3.1) ───────────────────────────────────────────
// Two traversals decode the same tree; pick with a define:
//
//   BVH_TRAVERSAL_STACK — the classic fixed stack, near-first. Fastest where a
//     dynamically indexed local array is tolerable (desktop; the engine already
//     sizes the stack to the baked tree).
//   BVH_TRAVERSAL_TRAIL — Laine's restart trail (HPG 2010) + a 4-entry short
//     stack held in ivec4 LANES (static indexing only). The traversal state that
//     cannot spill: a dynamically indexed array is the documented stack-spill
//     trigger on Mali ("Stack spilling should always be 0") and a GPR sink on
//     Adreno, and spilled scratch traffic is what kills fragment-shader tracers
//     on tile-based GPUs. Cost: the trail replays some descents from the root —
//     measured +8% node visits on gem-scale trees (to +19% on a deep adversarial
//     cloud), which is the fee for owning almost no registers.
//
// Mobile defaults to the trail per the spec's degradation ladder; the RQ2 A/B on
// real Mali/Adreno/Apple silicon is an outstanding manual gate, and a shader can
// force either variant explicitly if the measurement lands the other way.
#if !defined(BVH_TRAVERSAL_TRAIL) && !defined(BVH_TRAVERSAL_STACK)
  #ifdef IS_MOBILE
    #define BVH_TRAVERSAL_TRAIL 1
  #else
    #define BVH_TRAVERSAL_STACK 1
  #endif
#endif

#define BVH_LEAF_FLAG 0xffff0000u

struct BvhHit {
  float t;         // ray parameter of the hit (or tMax on a miss)
  vec3  bary;      // barycentric coords (w, u, v)
  vec3  normal;    // GEOMETRIC normal, flipped to oppose the ray
  float side;      // +1 entering a front face, -1 exiting a back face
  uint  triIndex;  // index into the packed triangle order
};

// ── 1D → 2D texel addressing ────────────────────────────────────────────────
// The packed arrays are 1D runs wrapped into a near-square texture. Width comes
// from textureSize() so the CPU packer is free to choose any shape.

vec4 bvhFetchF(highp sampler2D tex, int i) {
  int w = textureSize(tex, 0).x;
  return texelFetch(tex, ivec2(i % w, i / w), 0);
}

uvec4 bvhFetchU(highp usampler2D tex, int i) {
  int w = textureSize(tex, 0).x;
  return texelFetch(tex, ivec2(i % w, i / w), 0);
}

// ── Branchless slab test ────────────────────────────────────────────────────
// Returns the near hit distance, or -1.0 on a miss / on a hit farther than
// tBest — so it doubles as the subtree cull against the current best hit.
//
// Degenerate (zero-thickness) boxes are padded at BUILD time. That is what keeps
// \`invDir * 0 = ±Inf * 0 = NaN\` out of here, and it is why we do NOT port the
// SSE NaN-ordering tricks from the C++ literature: GLSL's min/max NaN semantics
// are implementation-defined, so the fix has to live in the data.
float bvhIntersectsBounds(highp sampler2D bvhBounds, int node, vec3 ro, vec3 invDir, float tBest) {
  vec3 bmin = bvhFetchF(bvhBounds, node * 2).xyz;
  vec3 bmax = bvhFetchF(bvhBounds, node * 2 + 1).xyz;

  vec3 tMinPlane = invDir * (bmin - ro);
  vec3 tMaxPlane = invDir * (bmax - ro);
  vec3 tMinHit = min(tMaxPlane, tMinPlane);
  vec3 tMaxHit = max(tMaxPlane, tMinPlane);

  float t0 = max(max(tMinHit.x, tMinHit.y), tMinHit.z);
  float t1 = min(min(tMaxHit.x, tMaxHit.y), tMaxHit.z);

  float dist = max(t0, 0.0);
  return (t1 >= dist && dist < tBest) ? dist : -1.0;
}

// ── Double-sided Möller–Trumbore ────────────────────────────────────────────
// NON-culling by necessity: a dielectric's exit hits are BACK faces, so a
// culling intersector sails straight through the far wall of the gem.
//
// \`side = sign(det)\` is exactly the entering/exiting signal the bounce loop
// needs, and the normal comes back already flipped to oppose the ray.
//
// The 1e-5 barycentric fatten papers over MT's non-watertightness (adjacent
// triangles can both miss a ray through their shared edge). Woop's watertight
// transform is the real fix at ≈ +12% cost — held in reserve for P3, and only if
// edge sparkle is actually observed on a real gem mesh.
bool bvhIntersectsTriangle(vec3 ro, vec3 rd, vec3 a, vec3 b, vec3 c,
                           out vec3 bary, out vec3 norm, out float dist, out float side) {
  vec3 e1 = b - a;
  vec3 e2 = c - a;
  norm = cross(e1, e2);

  float det = -dot(rd, norm);
  float invdet = 1.0 / det;

  vec3 AO = ro - a;
  vec3 DAO = cross(AO, rd);

  vec4 uvt;
  uvt.x = dot(e2, DAO) * invdet;
  uvt.y = -dot(e1, DAO) * invdet;
  uvt.z = dot(AO, norm) * invdet;
  uvt.w = 1.0 - uvt.x - uvt.y;

  bary = uvt.wxy;
  dist = uvt.z;
  side = sign(det);
  norm = side * normalize(norm);

  uvt += vec4(1e-5);
  return all(greaterThanEqual(uvt, vec4(0.0)));
}

void bvhReadTriangle(highp sampler2D triPos, int tri, out vec3 a, out vec3 b, out vec3 c) {
  a = bvhFetchF(triPos, tri * 3).xyz;
  b = bvhFetchF(triPos, tri * 3 + 1).xyz;
  c = bvhFetchF(triPos, tri * 3 + 2).xyz;
}

// ── Self-intersection offset (Wächter–Binder) ───────────────────────────────
// Push a surface point off the surface by an ulp-scaled amount along the
// GEOMETRIC normal, so the next ray cannot re-hit the triangle it just left.
// Scale-adaptive: an integer nudge in the float's mantissa is the right size at
// any magnitude, which a fixed epsilon never is.
//
// For a TRANSMITTED ray, pass the NEGATED normal — you want to end up on the
// other side of the surface.
//
// The bit-cast is guarded: a \`floatBitsToInt\` erratum shipped on Pixel-6-class
// devices, and the fallback is a plain scaled epsilon.
vec3 bvhOffsetRay(vec3 p, vec3 geomNormal) {
#ifdef BVH_OFFSET_FLOAT_FALLBACK
  return p + geomNormal * 1e-4;
#else
  const float originLimit = 1.0 / 32.0;
  const float floatScale = 1.0 / 65536.0;
  const float intScale = 256.0;

  ivec3 ofI = ivec3(intScale * geomNormal);
  vec3 pI = vec3(
    intBitsToFloat(floatBitsToInt(p.x) + ((p.x < 0.0) ? -ofI.x : ofI.x)),
    intBitsToFloat(floatBitsToInt(p.y) + ((p.y < 0.0) ? -ofI.y : ofI.y)),
    intBitsToFloat(floatBitsToInt(p.z) + ((p.z < 0.0) ? -ofI.z : ofI.z)));

  return vec3(
    abs(p.x) < originLimit ? p.x + floatScale * geomNormal.x : pI.x,
    abs(p.y) < originLimit ? p.y + floatScale * geomNormal.y : pI.y,
    abs(p.z) < originLimit ? p.z + floatScale * geomNormal.z : pI.z);
#endif
}

// ── Smooth shading normal (layout v2) ───────────────────────────────────────
// Interpolate the packed per-vertex normals (\`triAttribs\`, same 3-texels/tri
// order as \`triPositions\`) by the hit's barycentrics. bary is (w, u, v) — w
// weighs vertex a, u vertex b, v vertex c, matching Möller–Trumbore above.
//
// Two guards, both load-bearing:
//   • HEMISPHERE. \`hit.normal\` arrives flipped to oppose the ray (entering or
//     exiting); the packed normals point out of the mesh as authored. Align the
//     interpolated normal to the geometric one so exits shade with an
//     interior-facing normal exactly like \`hit.normal\` does — the dielectric
//     walk's refract()/reflect() sign conventions depend on it.
//   • HORIZON. At grazing incidence a shading normal can tip past the ray's
//     horizon (dot(-rd, ns) <= 0), where Fresnel and refract() are meaningless
//     — the classic shading-normal problem. Fall back to the geometric normal
//     for that hit rather than shade with an impossible configuration.
//
// The degenerate-length guard is belt and braces: the packer already replaces
// zero normals with face normals AT PACK TIME (normalize(0) is a
// driver-dependent NaN — the data owns the fix), so len ~ 1 in practice.
vec3 bvhSmoothNormal(highp sampler2D triAttribs, BvhHit hit, vec3 rd) {
  int base = int(hit.triIndex) * 3;
  vec3 n = hit.bary.x * bvhFetchF(triAttribs, base).xyz
         + hit.bary.y * bvhFetchF(triAttribs, base + 1).xyz
         + hit.bary.z * bvhFetchF(triAttribs, base + 2).xyz;
  float len = length(n);
  if (len < 1e-8) return hit.normal;
  n /= len;
  if (dot(n, hit.normal) < 0.0) n = -n;
  return dot(-rd, n) <= 1e-6 ? hit.normal : n;
}

/** True when the wired BVH node has no baked tree yet (nothing to trace). */
bool bvhEmpty() {
  return uBvhRootMin.w < 0.5;
}

/** The unmistakable "this pass cannot trace" colour — no highp, or no bake. */
vec3 bvhDebugTint() {
#ifdef BVH_UNAVAILABLE
  return vec3(1.0, 0.0, 0.5);  // hot pink: the device denied us fp32
#else
  return vec3(0.0, 1.0, 1.0);  // cyan: the tree is empty / unbaked
#endif
}

// ── Traversal ───────────────────────────────────────────────────────────────

#ifdef BVH_UNAVAILABLE

// Floor rung: compile to a hard miss rather than misrender at mediump. The
// consumer should test \`bvhEmpty()\` / \`BVH_UNAVAILABLE\` and paint bvhDebugTint().
bool bvhClosestHit(highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos,
                   vec3 ro, vec3 rd, float tMin, float tMax, out BvhHit hit) {
  hit.t = tMax; hit.bary = vec3(0.0); hit.normal = vec3(0.0, 0.0, 1.0);
  hit.side = 1.0; hit.triIndex = 0u;
  return false;
}
bool bvhAnyHit(highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos,
               vec3 ro, vec3 rd, float tMin, float tMax) {
  return false;
}
int bvhDebugSteps(highp sampler2D bvhBounds, highp usampler2D bvhContents,
                  vec3 ro, vec3 rd, float tMax) {
  return 0;
}

#else
#ifdef BVH_TRAVERSAL_TRAIL

// ── Restart-trail traversal ─────────────────────────────────────────────────
// CPU twin: src/lib/bvh/traverseCpuTrail.ts — change one, change both; the twin
// is diffed against brute force AND the stack traversal by vitest.
//
// Bit d of the 64-bit trail records the choice at depth d: 0 = near child (far
// sibling pending), 1 = far child (near subtree finished). Visiting the tree
// near-first is exactly counting through those bit strings in binary, so "pop"
// is an increment: set the deepest 0 bit on the path, clear everything deeper,
// and restart from the root, where the bits replay the descent. The 4-entry
// short stack in ivec4 lanes absorbs almost every restart; when it cannot serve
// (overflowed or invalidated by a shallow cull), the replay costs one descent.
//
// The trail is a uvec2 because BVH_MAX_DEPTH is 40 and one word holds 32 levels.
// The near/far classification depends only on the ray and the split axis, so a
// restarted replay reproduces it exactly — that determinism is what makes the
// trail bits meaningful across restarts.

// findMSB is ESSL 3.10; WebGL2 is ESSL 3.00, so: a 5-step binary search.
int bvhFindMSB(uint v) {
  if (v == 0u) return -1;
  int r = 0;
  if ((v & 0xffff0000u) != 0u) { v >>= 16u; r += 16; }
  if ((v & 0xff00u) != 0u) { v >>= 8u; r += 8; }
  if ((v & 0xf0u) != 0u) { v >>= 4u; r += 4; }
  if ((v & 0xcu) != 0u) { v >>= 2u; r += 2; }
  if ((v & 0x2u) != 0u) { r += 1; }
  return r;
}

// Bits [0, n-1] of one word, n in [0, 32]. The clamp is not decorative: a GLSL
// shift by 32 or more is undefined, and a ternary's unselected arm may still be
// evaluated (it is a select, not a branch, on most compilers).
uint bvhMaskBelow(int n) {
  return n >= 32 ? 0xffffffffu : (1u << uint(clamp(n, 0, 31))) - 1u;
}

// Deepest depth j in [0, depth-1] whose trail bit is 0 — the deepest ancestor
// with a far child still pending. -1 when the traversal is complete.
int bvhTrailDeepestZero(uvec2 trail, int depth) {
  uint pHi = ~trail.y & bvhMaskBelow(depth - 32);
  if (pHi != 0u) return 32 + bvhFindMSB(pHi);
  uint pLo = ~trail.x & bvhMaskBelow(depth);
  if (pLo != 0u) return bvhFindMSB(pLo);
  return -1;
}

// The binary-counter increment at depth j: set bit j, clear everything deeper.
uvec2 bvhTrailIncrement(uvec2 trail, int j) {
  if (j < 32) {
    trail.x = (trail.x & bvhMaskBelow(j)) | (1u << uint(j));
    trail.y = 0u;
  } else {
    int k = j - 32;
    trail.y = (trail.y & bvhMaskBelow(k)) | (1u << uint(k));
  }
  return trail;
}

bool bvhTrailBit(uvec2 trail, int d) {
  uint w = d < 32 ? trail.x : trail.y;
  return ((w >> uint(d & 31)) & 1u) != 0u;
}

bool bvhClosestHit(highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos,
                   vec3 ro, vec3 rd, float tMin, float tMax, out BvhHit hit) {
  hit.t = tMax;
  hit.bary = vec3(0.0);
  hit.normal = vec3(0.0, 0.0, 1.0);
  hit.side = 1.0;
  hit.triIndex = 0u;

  if (bvhEmpty()) return false;

  vec3 invDir = 1.0 / rd;
  uvec2 trail = uvec2(0u);
  ivec4 stkNode = ivec4(-1);   // short stack, deepest first — vector lanes only
  ivec4 stkDepth = ivec4(-1);
  int node = 0;
  int depth = 0;
  float best = tMax;
  bool found = false;

  // x3: restarts replay prefix descents, so the trail's honest worst case is a
  // few times the stack's visit count. Uniform-obscured like the stack guard.
  int guard = BVH_MAX_STEPS * 3 + int(min(uBvhMeta.w, 0.0));

  for (int step = 0; step < guard; ++step) {
    bool subtreeDone = true;
    if (bvhIntersectsBounds(bvhBounds, node, ro, invDir, best) >= 0.0) {
      uvec2 c = bvhFetchU(bvhContents, node).xy;

      if ((c.x & BVH_LEAF_FLAG) != 0u) {
        int count = int(c.x & 0xffffu);
        int first = int(c.y);
        for (int k = 0; k < count; ++k) {
          vec3 a, b, cc;
          bvhReadTriangle(triPos, first + k, a, b, cc);
          vec3 bary, norm;
          float dist, side;
          if (bvhIntersectsTriangle(ro, rd, a, b, cc, bary, norm, dist, side)) {
            if (dist > tMin && dist < best) {
              best = dist;
              found = true;
              hit.t = dist;
              hit.bary = bary;
              hit.normal = norm;
              hit.side = side;
              hit.triIndex = uint(first + k);
            }
          }
        }
      } else {
        int axis = int(c.x);
        bool leftIsNear = rd[axis] >= 0.0;
        int nearChild = leftIsNear ? node + 1 : int(c.y);
        int farChild = leftIsNear ? int(c.y) : node + 1;

        bool goFar = bvhTrailBit(trail, depth);
        if (!goFar) {
          // Push the pending far sibling: shift in at the front, the oldest
          // (shallowest) lane falls off — the trail can always recover it later
          // by restarting.
          stkNode = ivec4(farChild, stkNode.xyz);
          stkDepth = ivec4(depth + 1, stkDepth.xyz);
        }
        node = goFar ? farChild : nearChild;
        depth++;
        subtreeDone = false;
      }
    }

    if (subtreeDone) {
      int j = bvhTrailDeepestZero(trail, depth);
      if (j < 0) break;               // counter exhausted: traversal complete
      trail = bvhTrailIncrement(trail, j);
      if (stkDepth.x == j + 1) {
        // Short-stack hit: jump straight to the pending sibling, no restart.
        node = stkNode.x;
        depth = j + 1;
        stkNode = ivec4(stkNode.yzw, -1);
        stkDepth = ivec4(stkDepth.yzw, -1);
      } else {
        // Restart. The stack must be CLEARED, not kept: the replay descent
        // re-pushes every pending far child it passes, and stale survivors
        // would be processed twice.
        stkNode = ivec4(-1);
        stkDepth = ivec4(-1);
        node = 0;
        depth = 0;
      }
    }
  }

  return found;
}

bool bvhAnyHit(highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos,
               vec3 ro, vec3 rd, float tMin, float tMax) {
  if (bvhEmpty()) return false;

  vec3 invDir = 1.0 / rd;
  uvec2 trail = uvec2(0u);
  ivec4 stkNode = ivec4(-1);
  ivec4 stkDepth = ivec4(-1);
  int node = 0;
  int depth = 0;

  int guard = BVH_MAX_STEPS * 3 + int(min(uBvhMeta.w, 0.0));

  for (int step = 0; step < guard; ++step) {
    bool subtreeDone = true;
    if (bvhIntersectsBounds(bvhBounds, node, ro, invDir, tMax) >= 0.0) {
      uvec2 c = bvhFetchU(bvhContents, node).xy;

      if ((c.x & BVH_LEAF_FLAG) != 0u) {
        int count = int(c.x & 0xffffu);
        int first = int(c.y);
        for (int k = 0; k < count; ++k) {
          vec3 a, b, cc;
          bvhReadTriangle(triPos, first + k, a, b, cc);
          vec3 bary, norm;
          float dist, side;
          if (bvhIntersectsTriangle(ro, rd, a, b, cc, bary, norm, dist, side)) {
            if (dist > tMin && dist < tMax) return true;
          }
        }
      } else {
        // Ordering is irrelevant for any-hit, but the CLASSIFICATION must stay
        // deterministic — the trail replays it on restart — so it uses the same
        // rule as closest-hit rather than a cheaper fixed order.
        int axis = int(c.x);
        bool leftIsNear = rd[axis] >= 0.0;
        int nearChild = leftIsNear ? node + 1 : int(c.y);
        int farChild = leftIsNear ? int(c.y) : node + 1;
        bool goFar = bvhTrailBit(trail, depth);
        if (!goFar) {
          stkNode = ivec4(farChild, stkNode.xyz);
          stkDepth = ivec4(depth + 1, stkDepth.xyz);
        }
        node = goFar ? farChild : nearChild;
        depth++;
        subtreeDone = false;
      }
    }

    if (subtreeDone) {
      int j = bvhTrailDeepestZero(trail, depth);
      if (j < 0) break;
      trail = bvhTrailIncrement(trail, j);
      if (stkDepth.x == j + 1) {
        node = stkNode.x;
        depth = j + 1;
        stkNode = ivec4(stkNode.yzw, -1);
        stkDepth = ivec4(stkDepth.yzw, -1);
      } else {
        stkNode = ivec4(-1);
        stkDepth = ivec4(-1);
        node = 0;
        depth = 0;
      }
    }
  }

  return false;
}

int bvhDebugSteps(highp sampler2D bvhBounds, highp usampler2D bvhContents,
                  vec3 ro, vec3 rd, float tMax) {
  if (bvhEmpty()) return 0;

  vec3 invDir = 1.0 / rd;
  uvec2 trail = uvec2(0u);
  ivec4 stkNode = ivec4(-1);
  ivec4 stkDepth = ivec4(-1);
  int node = 0;
  int depth = 0;
  int visits = 0;

  int guard = BVH_MAX_STEPS * 3 + int(min(uBvhMeta.w, 0.0));

  for (int step = 0; step < guard; ++step) {
    // Every node examination counts, INCLUDING replayed prefixes — that is the
    // honest cost, and comparing this heatmap against the stack variant's is
    // the restart-overhead measurement.
    visits++;
    bool subtreeDone = true;
    if (bvhIntersectsBounds(bvhBounds, node, ro, invDir, tMax) >= 0.0) {
      uvec2 c = bvhFetchU(bvhContents, node).xy;
      if ((c.x & BVH_LEAF_FLAG) == 0u) {
        int axis = int(c.x);
        bool leftIsNear = rd[axis] >= 0.0;
        int nearChild = leftIsNear ? node + 1 : int(c.y);
        int farChild = leftIsNear ? int(c.y) : node + 1;
        bool goFar = bvhTrailBit(trail, depth);
        if (!goFar) {
          stkNode = ivec4(farChild, stkNode.xyz);
          stkDepth = ivec4(depth + 1, stkDepth.xyz);
        }
        node = goFar ? farChild : nearChild;
        depth++;
        subtreeDone = false;
      }
    }

    if (subtreeDone) {
      int j = bvhTrailDeepestZero(trail, depth);
      if (j < 0) break;
      trail = bvhTrailIncrement(trail, j);
      if (stkDepth.x == j + 1) {
        node = stkNode.x;
        depth = j + 1;
        stkNode = ivec4(stkNode.yzw, -1);
        stkDepth = ivec4(stkDepth.yzw, -1);
      } else {
        stkNode = ivec4(-1);
        stkDepth = ivec4(-1);
        node = 0;
        depth = 0;
      }
    }
  }
  return visits;
}

#else  // BVH_TRAVERSAL_STACK

/**
 * Nearest hit along ro + t*rd for t in (tMin, tMax).
 *
 * Shape: ONE loop, cull-at-pop ("if-if"). Slab-testing at pop rather than at
 * push means the test always culls against the CURRENT best hit — a node queued
 * while \`best\` was still far away is rejected for free once a nearer triangle
 * lands. The if-if shape is also friendlier to wide divergence and 1-triangle
 * leaves than while-while, and about the same speed on desktop.
 *
 * The far child is pushed FIRST so the near child pops first. That ordering is
 * not a micro-optimisation: random-order traversal costs +31% node tests and
 * +93% TRIANGLE tests (Ylitie et al. 2017, Table 2).
 */
bool bvhClosestHit(highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos,
                   vec3 ro, vec3 rd, float tMin, float tMax, out BvhHit hit) {
  hit.t = tMax;
  hit.bary = vec3(0.0);
  hit.normal = vec3(0.0, 0.0, 1.0);
  hit.side = 1.0;
  hit.triIndex = 0u;

  if (bvhEmpty()) return false;

  vec3 invDir = 1.0 / rd;
  int stack[BVH_STACK_DEPTH];
  int ptr = 0;
  stack[ptr++] = 0;

  float best = tMax;
  bool found = false;

  // Uniform-obscured trip bound. \`uBvhMeta.w\` is reserved and always 0, but the
  // compiler cannot prove that — which stops ANGLE/FXC from constant-folding the
  // bound and force-unrolling the loop body. The loop's real exit is \`ptr > 0\`.
  int guard = BVH_MAX_STEPS + int(min(uBvhMeta.w, 0.0));

  for (int step = 0; step < guard; ++step) {
    if (ptr <= 0) break;

    int node = stack[--ptr];
    if (bvhIntersectsBounds(bvhBounds, node, ro, invDir, best) < 0.0) continue;

    uvec2 c = bvhFetchU(bvhContents, node).xy;

    if ((c.x & BVH_LEAF_FLAG) != 0u) {
      int count = int(c.x & 0xffffu);
      int first = int(c.y);
      for (int k = 0; k < count; ++k) {
        vec3 a, b, cc;
        bvhReadTriangle(triPos, first + k, a, b, cc);

        vec3 bary, norm;
        float dist, side;
        if (bvhIntersectsTriangle(ro, rd, a, b, cc, bary, norm, dist, side)) {
          if (dist > tMin && dist < best) {
            best = dist;
            found = true;
            hit.t = dist;
            hit.bary = bary;
            hit.normal = norm;
            hit.side = side;
            hit.triIndex = uint(first + k);
          }
        }
      }
      continue;
    }

    int axis = int(c.x);
    int left = node + 1;
    int right = int(c.y);

    // Near-first: the child on the ray's side of the split plane is visited first.
    bool leftIsNear = rd[axis] >= 0.0;
    int nearChild = leftIsNear ? left : right;
    int farChild = leftIsNear ? right : left;

    // The stack is sized to BVH_MAX_DEPTH, so this can never be false. Kept as a
    // memory-safety backstop against a corrupt artifact claiming a deeper tree.
    if (ptr + 2 <= BVH_STACK_DEPTH) {
      stack[ptr++] = farChild;
      stack[ptr++] = nearChild;
    }
  }

  return found;
}

/**
 * Is ANY surface hit in (tMin, tMax)? The shadow / occlusion query, and the
 * cheapest one the substrate offers: it terminates on the FIRST hit rather than
 * the nearest, and needs no near-first ordering (any hit will do), so the whole
 * ordering branch drops out.
 */
bool bvhAnyHit(highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos,
               vec3 ro, vec3 rd, float tMin, float tMax) {
  if (bvhEmpty()) return false;

  vec3 invDir = 1.0 / rd;
  int stack[BVH_STACK_DEPTH];
  int ptr = 0;
  stack[ptr++] = 0;

  int guard = BVH_MAX_STEPS + int(min(uBvhMeta.w, 0.0));

  for (int step = 0; step < guard; ++step) {
    if (ptr <= 0) break;

    int node = stack[--ptr];
    if (bvhIntersectsBounds(bvhBounds, node, ro, invDir, tMax) < 0.0) continue;

    uvec2 c = bvhFetchU(bvhContents, node).xy;

    if ((c.x & BVH_LEAF_FLAG) != 0u) {
      int count = int(c.x & 0xffffu);
      int first = int(c.y);
      for (int k = 0; k < count; ++k) {
        vec3 a, b, cc;
        bvhReadTriangle(triPos, first + k, a, b, cc);
        vec3 bary, norm;
        float dist, side;
        if (bvhIntersectsTriangle(ro, rd, a, b, cc, bary, norm, dist, side)) {
          if (dist > tMin && dist < tMax) return true;
        }
      }
      continue;
    }

    if (ptr + 2 <= BVH_STACK_DEPTH) {
      stack[ptr++] = node + 1;
      stack[ptr++] = int(c.y);
    }
  }

  return false;
}

/**
 * Node visits for one ray — the traversal-cost heatmap. This is the primary
 * perf-intuition tool for the whole subsystem: it shows you WHERE the tree is
 * expensive, which no frame-time number can.
 */
int bvhDebugSteps(highp sampler2D bvhBounds, highp usampler2D bvhContents,
                  vec3 ro, vec3 rd, float tMax) {
  if (bvhEmpty()) return 0;

  vec3 invDir = 1.0 / rd;
  int stack[BVH_STACK_DEPTH];
  int ptr = 0;
  stack[ptr++] = 0;
  int visits = 0;

  int guard = BVH_MAX_STEPS + int(min(uBvhMeta.w, 0.0));

  for (int step = 0; step < guard; ++step) {
    if (ptr <= 0) break;

    int node = stack[--ptr];
    visits++;
    if (bvhIntersectsBounds(bvhBounds, node, ro, invDir, tMax) < 0.0) continue;

    uvec2 c = bvhFetchU(bvhContents, node).xy;
    if ((c.x & BVH_LEAF_FLAG) != 0u) continue;

    int axis = int(c.x);
    bool leftIsNear = rd[axis] >= 0.0;
    int nearChild = leftIsNear ? node + 1 : int(c.y);
    int farChild = leftIsNear ? int(c.y) : node + 1;
    if (ptr + 2 <= BVH_STACK_DEPTH) {
      stack[ptr++] = farChild;
      stack[ptr++] = nearChild;
    }
  }
  return visits;
}

#endif  // BVH_TRAVERSAL_TRAIL / BVH_TRAVERSAL_STACK
#endif  // BVH_UNAVAILABLE

// ── Debug ramp ──────────────────────────────────────────────────────────────
// Traversal-cost heatmap colours: blue (cheap) → green → yellow → red (expensive).
// \`budget\` is the step count that maps to full red — set it to what you consider
// an acceptable per-pixel cost and the red pixels are your problem areas.
vec3 bvhStepsRamp(int visits, float budget) {
  float x = clamp(float(visits) / max(budget, 1.0), 0.0, 1.0);
  vec3 blue = vec3(0.10, 0.20, 0.70);
  vec3 green = vec3(0.10, 0.75, 0.35);
  vec3 yellow = vec3(0.95, 0.85, 0.20);
  vec3 red = vec3(0.90, 0.15, 0.10);
  vec3 c = mix(blue, green, smoothstep(0.0, 0.34, x));
  c = mix(c, yellow, smoothstep(0.34, 0.67, x));
  c = mix(c, red, smoothstep(0.67, 1.0, x));
  return c;
}

#endif  // ZED_BVH_TRACE
`,se=`#ifndef ZED_GEM_OPTICS
#define ZED_GEM_OPTICS

// ── The quality-tier ladder (spec §4.6, W3.2) ───────────────────────────────
// Every knob defaults from ZED_TIER (0 = lite, 1 = balanced, 2 = high — injected
// by the engine at compile time) and every one can be pinned by defining it
// before the include. All rungs share this ONE source; the defines select tier
// behaviour, so there is no shader fork to drift.
//
// Bounce count is the super-linear knob (throughput decays ~3x from bounce 0 to
// 4, so the early-out does most of the work and the cap trims the tail) — it is
// the first thing each tier trades, exactly as the spec's ladder prescribes.

#ifndef ZED_TIER
  #define ZED_TIER 1
#endif

// Hard ceiling on the interior walk. A GLSL loop bound must be a constant
// expression for the compiler to allocate registers, so the *artistic* bounce
// count (a float control, fractionally blended — see below) rides inside a loop
// that is statically bounded by this. 10 matches three-mesh-bvh's documented
// maximum; 3 is the floor at which a stone still reads as a stone (Guy & Soler's
// coloured stones shipped with 2-3).
#ifndef GEM_MAX_BOUNCES
  #if ZED_TIER >= 2
    #define GEM_MAX_BOUNCES 10
  #elif ZED_TIER >= 1
    #define GEM_MAX_BOUNCES 6
  #else
    #define GEM_MAX_BOUNCES 3
  #endif
#endif

// How dispersion is paid for:
//   2 — THREE independent interior walks, one per channel. Each wavelength
//       genuinely follows its own path through the stone; that divergence IS
//       the fire. 3x the traversal cost.
//   1 — SHARED-PATH: one walk (at the green IoR) carries the geometry; at each
//       escape event the red and blue channels get their own Fresnel and their
//       own refracted LOOKUP direction. One traversal, three env fetches per
//       escape — most of the fire at a third of the cost. Entry stays
//       achromatic (a per-channel entry would split the path, which is mode 2).
//   0 — no dispersion. uDispersion is simply ignored.
#ifndef GEM_DISPERSION_MODE
  #if ZED_TIER >= 2
    #define GEM_DISPERSION_MODE 2
  #elif ZED_TIER >= 1
    #define GEM_DISPERSION_MODE 1
  #else
    #define GEM_DISPERSION_MODE 0
  #endif
#endif

// Re-entry continuation for CONCAVE dielectrics (hero rung). A transmitted ray
// leaving a concave object (a torus knot; a stone behind a prong) can RE-ENTER
// it — the honest cost of supporting arbitrary meshes, and a case the classic
// convex-gem renderers never face. Off: such rays sample the environment, so
// the background ghosts through where the far lobe should appear. On: the walk
// tests re-entry (one extra closest-hit per escape event) and follows the light
// through the air gap into the far lobe. See gemWalk for the branch policy.
#ifndef GEM_REENTRY
  #if ZED_TIER >= 2
    #define GEM_REENTRY 1
  #else
    #define GEM_REENTRY 0
  #endif
#endif

// Energy early-out. Once the surviving throughput is this small, the remaining
// bounces cannot change the pixel. The literature is unanimous that this matters
// MORE than the bounce cap: throughput decays ~3x from bounce 0 to bounce 4, so
// most rays are done long before the cap and the early-out is what turns the
// worst case into the average case.
#ifndef GEM_MIN_THROUGHPUT
  #define GEM_MIN_THROUGHPUT 0.001
#endif

// Smooth shading normals at TRACED hits (spec W3.5, BVH layout v2). OFF, the
// interior walk shades every bounce with the flat Möller–Trumbore facet normal —
// exactly right for a faceted gem, and visibly WRONG for a smooth dielectric
// (a glass knot's interior tiles like a disco ball: per-facet Fresnel snaps
// between transmit and TIR near the critical angle, and reflection directions
// jump at every triangle edge). ON, every optics decision (Fresnel, refract,
// reflect) uses the barycentric-interpolated vertex normal from the bvh node's
// \`triAttribs\` texture, while ray OFFSETS stay on the geometric normal — the
// standard shading-normal/geometric-normal split every renderer makes, now on
// both sides of the entry surface.
//
// This is an OPT-IN DEFINE, never a tier default, because turning it on changes
// the function signatures below: the walk needs the attribute texture, so the
// consumer must declare + wire ONE more sampler and pass it after triPositions:
//
//     uniform highp sampler2D uTriAttribs;     // wire ← bvh node \`triAttribs\`
//     #define GEM_SMOOTH_NORMALS 1
//     #include <bvh-trace>
//     #include <gem-optics>
//     #define BVH uBvhBounds, uBvhContents, uTriPositions, uTriAttribs
//
// One shader still serves faceted AND smooth meshes with this on: the packer
// derives the texture from the mesh's authored normals (weld topology deciding
// the fallback), so an UNWELDED brilliant cut interpolates back to its flat
// facet normals while a welded knot shades smooth. The mesh decides, not the
// shader.
#ifndef GEM_SMOOTH_NORMALS
  #define GEM_SMOOTH_NORMALS 0
#endif

// The BVH parameter pack. GLSL has no varargs and samplers cannot live in
// structs, so the extra \`triAttribs\` parameter is spliced into every signature
// (and every pass-through call) by macro — ONE function body, no smooth/flat
// fork to drift apart.
#if GEM_SMOOTH_NORMALS
  #define GEM_BVH_PARAMS highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos, highp sampler2D triAttribs
  #define GEM_BVH_ARGS bvhBounds, bvhContents, triPos, triAttribs
  #define GEM_SHADING_NORMAL(hitVar, rayDir) bvhSmoothNormal(triAttribs, hitVar, rayDir)
#else
  #define GEM_BVH_PARAMS highp sampler2D bvhBounds, highp usampler2D bvhContents, highp sampler2D triPos
  #define GEM_BVH_ARGS bvhBounds, bvhContents, triPos
  #define GEM_SHADING_NORMAL(hitVar, rayDir) (hitVar).normal
#endif

struct GemMaterial {
  float ior;         // index of refraction at the green channel (diamond: 2.417)
  float dispersion;  // KHR_materials_dispersion strength = 20 / Abbe number
  vec3  kappa;       // Beer-Lambert absorption coefficient, per channel
  float bounces;     // FRACTIONAL interior bounce budget (see gemWalk)
};

/**
 * Beer-Lambert absorption coefficient from an artist-facing (tint, strength) pair.
 *
 * This is diamond-webgl's convention: kappa = strength * (1 - tint). A tint of
 * pure white absorbs nothing (kappa = 0, a colourless diamond); a tint of
 * (0.9, 0.95, 1.0) absorbs slightly more red than blue, so long paths through the
 * stone go blue — which is exactly how a real stone's colour deepens with size.
 *
 * The point of expressing absorption per-unit-distance rather than as a flat
 * colour multiply is that it is PATH DEPENDENT: light that rattles around inside
 * the gem for four bounces comes out visibly more saturated than light that cuts
 * straight through. That is most of what makes a gem look like a gem.
 */
vec3 gemAbsorption(vec3 tint, float strength) {
  return strength * (vec3(1.0) - clamp(tint, 0.0, 1.0));
}

GemMaterial gemMaterial(float ior, float dispersion, vec3 tint, float absorption, float bounces) {
  GemMaterial m;
  m.ior = max(ior, 1.0);
  m.dispersion = max(dispersion, 0.0);
  m.kappa = gemAbsorption(tint, absorption);
  m.bounces = clamp(bounces, 1.0, float(GEM_MAX_BOUNCES));
  return m;
}

/**
 * Per-channel indices of refraction for dispersion (glTF KHR_materials_dispersion).
 *
 *     halfSpread = (ior - 1) * 0.025 * dispersion
 *     iors       = (ior - halfSpread, ior, ior + halfSpread)
 *
 * where \`dispersion = 20 / Abbe\`. Blue (the short wavelength) gets the HIGHER
 * index and bends more — that ordering is the whole effect, and getting it
 * backwards gives you a gem with its fire inverted, which reads as subtly wrong
 * without being obviously broken.
 *
 * Reference numbers: diamond n_d = 2.417, Abbe 55.3 -> dispersion 0.36. Cubic
 * zirconia Abbe ~33 -> dispersion 0.61, which is precisely why CZ throws MORE
 * fire than diamond and is one of the ways to spot it.
 */
vec3 gemIors(float ior, float dispersion) {
  float halfSpread = (ior - 1.0) * 0.025 * dispersion;
  return vec3(ior - halfSpread, ior, ior + halfSpread);
}

/**
 * Full unpolarized dielectric Fresnel reflectance, with the critical angle.
 *
 * \`eta\` = n_incident / n_transmitted, and \`cosI\` = dot(-rayDir, normal) >= 0.
 * Entry (air -> gem) passes eta = 1/ior; an interior hit (gem -> air) passes eta = ior.
 *
 * Two reasons this is the exact equation and not Schlick:
 *
 *   1. TOTAL INTERNAL REFLECTION IS NOT A SPECIAL CASE HERE. Past the critical
 *      angle sinT2 >= 1, the equation returns R = 1, and the bounce loop's
 *      \`(1 - R)\` transmission term goes to zero on its own. No branch, no flag,
 *      no \`refract() == vec3(0)\` sentinel test. TIR is the single most important
 *      optical effect inside a diamond (n = 2.417 gives a critical angle of only
 *      24.4 degrees, so most interior rays TIR rather than escape — that tight exit
 *      cone is *why* a brilliant cut is shaped the way it is), and Schlick's
 *      approximation has no critical angle at all.
 *   2. Schlick is accurate over roughly n = 1.4-2.2. Diamond sits outside that band.
 *
 * It is also cheap — one sqrt and two divides — so there is nothing to trade away.
 */
float gemFresnel(float cosI, float eta) {
  float c = clamp(cosI, 0.0, 1.0);
  float sinT2 = eta * eta * (1.0 - c * c);
  if (sinT2 >= 1.0) return 1.0;              // total internal reflection
  float cosT = sqrt(1.0 - sinT2);
  float rs = (eta * c - cosT) / (eta * c + cosT);   // s-polarized amplitude
  float rp = (c - eta * cosT) / (c + eta * cosT);   // p-polarized amplitude
  return 0.5 * (rs * rs + rp * rp);          // unpolarized light: the mean power
}

/**
 * Sample the environment along an OBJECT-space direction.
 *
 * THE ZERO-LENGTH GUARD IS LOAD-BEARING. On total internal reflection GLSL's
 * \`refract()\` returns exactly \`vec3(0.0)\`, and \`normalize(vec3(0))\` is a division
 * by zero — NaN. It is tempting to think the caller's \`(1 - R)\` factor kills it,
 * since R == 1 on TIR: it does not. **0 * NaN = NaN**, and the NaN goes on to
 * poison the accumulator, the tone map, and the pixel, which lands on screen as
 * BLACK.
 *
 * This is a genuinely nasty one because it is driver-dependent. SwiftShader
 * flushes normalize(0) to zero and renders the gem perfectly; AMD returns NaN and
 * renders it as a black silhouette. And it scales with the index of refraction:
 * glass (n = 1.5, 42° exit cone) TIRs rarely and shows black PATCHES, while
 * diamond (n = 2.417, 24° cone) TIRs almost everywhere and goes solid black.
 */
vec3 gemEnv(highp sampler2D envMap, mat3 objToWorld, vec3 dirObj) {
  // Ray directions transform by the model matrix itself (only NORMALS want the
  // inverse-transpose), so mat3(uModel) is correct here and a non-uniform scale
  // would still be handled properly.
  vec3 v = objToWorld * dirObj;
  float len = length(v);
  if (len < 1e-8) return vec3(0.0);
  return sampleOctEnvSeamless(envMap, v / len);
}

/**
 * One interior walk at a SINGLE index of refraction — the heart of the whole thing.
 *
 * Starts just inside the surface at \`p\` travelling along \`d\` (both OBJECT space,
 * because that is the space the BVH was built in), and rattles around inside the
 * stone peeling energy off at each surface it meets:
 *
 *     at each interior hit:
 *       attenuate throughput by Beer-Lambert over the segment just travelled
 *       R = Fresnel(cos, ior)                 // R = 1 past the critical angle => TIR
 *       accumulate  throughput * (1 - R) * env(refracted)     // the light that ESCAPES
 *       throughput *= R                                        // the light that stays in
 *       reflect and keep going
 *
 * The transmitted ray is never traced further — it leaves the stone and we read the
 * environment in its direction. That is the standard simplification every
 * real-time gem renderer makes, and its one visible cost is that a transmitted ray
 * which would RE-ENTER a concave object (a torus knot, a stone behind a prong)
 * samples the environment instead of finding the geometry behind it. Continuing
 * the walk on re-entry is a Phase-3 quality define; every surveyed implementation
 * makes the same trade.
 *
 * FRACTIONAL BOUNCES. \`m.bounces\` is a float, and the LAST bounce's contribution is
 * weighted by its fractional part. Without this a bounce slider visibly POPS as it
 * crosses an integer — a whole rattle of light appears at once. With it the slider
 * is continuous, and it costs one \`mix\`. (diamond-webgl's detail; too good to leave.)
 *
 * A ray that escapes without hitting anything is a numerical leak (Moller-Trumbore
 * is not watertight) or a concave gap; we sample the environment along it and stop,
 * which degrades to "slightly too much background" rather than to a black pixel.
 */
vec3 gemWalk(GEM_BVH_PARAMS,
             highp sampler2D envMap, mat3 objToWorld,
             vec3 p, vec3 d, float ior, vec3 kappa, float bounces) {
  vec3 accum = vec3(0.0);
  vec3 throughput = vec3(1.0);

  int n = int(ceil(bounces));
  float lastWeight = 1.0 - (float(n) - bounces);   // fractional weight of bounce n-1

  for (int i = 0; i < GEM_MAX_BOUNCES; ++i) {
    if (i >= n) break;

    BvhHit hit;
    if (!bvhClosestHit(bvhBounds, bvhContents, triPos, p, d, 1e-4, 1e4, hit)) {
      // Leaked out of a closed mesh. Take the environment and stop.
      accum += throughput * gemEnv(envMap, objToWorld, d);
      break;
    }

    // hit.normal is the GEOMETRIC normal already flipped to oppose the ray, so
    // inside the stone it points back INTO the interior. That orientation is
    // exactly what refract() and reflect() want, and it is what makes
    // bvhOffsetRay(P, hit.normal) push the next ray to the INSIDE of the surface.
    //
    // The OPTICS shade with N (the shading normal — interpolated when
    // GEM_SMOOTH_NORMALS, the same geometric normal otherwise); the OFFSETS stay
    // on Ng, always. Offsetting along a shading normal at a grazing hit lands
    // the next origin on the wrong side of the actual triangle and the walk
    // re-hits the surface it just left.
    vec3 P = p + d * hit.t;
    vec3 Ng = hit.normal;
    vec3 N = GEM_SHADING_NORMAL(hit, d);
    float cosI = dot(-d, N);

    // Beer-Lambert over the segment we just travelled. Applied BEFORE the
    // accumulation so the light leaving at this surface has paid for the distance
    // it covered getting here.
    throughput *= exp(-kappa * hit.t);

    float R = gemFresnel(cosI, ior);            // gem -> air; R = 1 is TIR
    float w = (i == n - 1) ? lastWeight : 1.0;

    // Only sample the environment for light that actually LEAVES. Past the
    // critical angle nothing does (R == 1), and skipping the fetch is not just an
    // optimisation — refract() returns vec3(0) there, and feeding that to
    // gemEnv's normalize() is a NaN that (1 - R) == 0 does NOT cancel, because
    // 0 * NaN = NaN. See gemEnv.
    //
    // It is a worthwhile saving in its own right: a diamond's exit cone is 24°
    // wide, so the MAJORITY of interior hits are total internal reflections and
    // this fetch would have been thrown away.
    if (R < 1.0) {
      vec3 T = refract(d, N, ior);
#if GEM_REENTRY
      // The concave case: does the escaping ray RE-HIT the object (the far lobe
      // of a knot, a stone behind a prong)? One extra closest-hit per escape
      // event — the hero rung's fee for geometric honesty. Skipped on the final
      // (fractionally weighted) bounce, where following the light would tangle
      // with the pop-free blend for no visible gain.
      BvhHit rh;
      bool reenters = (i < n - 1) &&
        bvhClosestHit(bvhBounds, bvhContents, triPos, bvhOffsetRay(P, -Ng), T, 1e-4, 1e4, rh);
      if (!reenters) {
        accum += throughput * (1.0 - R) * gemEnv(envMap, objToWorld, T) * w;
      } else if (1.0 - R >= R) {
        // FOLLOW the transmitted light across the air gap into the far lobe —
        // it is the dominant branch (below the critical-angle region a glass
        // surface transmits ~90%+). At the far surface it splits again: the
        // part that bounces OFF is a genuine outside ray, so the environment is
        // the right answer for it; the rest refracts in and the walk continues
        // inside the far lobe. The gap crossed is AIR, so no Beer-Lambert is
        // charged for it (the next interior hit charges only its own segment).
        //
        // The interior reflected branch (energy R, here the minority) is
        // dropped rather than followed — a single loop can follow one ray. The
        // loss is bounded by R < 0.5 and reads as slight extra absorption.
        //
        // The far surface gets the same normal split as everywhere else: its
        // shading normal N2 carries the optics, its geometric rh.normal the
        // offset.
        vec3 pGap = bvhOffsetRay(P, -Ng);
        vec3 P2 = pGap + T * rh.t;
        vec3 N2 = GEM_SHADING_NORMAL(rh, T);
        // Air -> gem at the far surface. Entering the DENSER medium: this can
        // never TIR, so no critical-angle guard is needed here.
        float R2 = gemFresnel(dot(-T, N2), 1.0 / ior);
        accum += throughput * (1.0 - R) * R2 * gemEnv(envMap, objToWorld, reflect(T, N2));
        throughput *= (1.0 - R) * (1.0 - R2);
        if (max(max(throughput.r, throughput.g), throughput.b) < GEM_MIN_THROUGHPUT) break;
        d = refract(T, N2, 1.0 / ior);
        // rh.normal opposes the arriving ray (points back OUT of the far lobe);
        // the transmitted ray crosses to its other side.
        p = bvhOffsetRay(P2, -rh.normal);
        continue;
      }
      // else: the transmitted ray re-enters but is the WEAKER branch (R >= 0.5,
      // the near-critical rim). Drop it: crediting it with the environment would
      // paint background through the far lobe, and dark-instead-of-ghosted is
      // the less wrong picture. The reflected branch continues below as usual.
#else
      accum += throughput * (1.0 - R) * gemEnv(envMap, objToWorld, T) * w;
#endif
    }

    throughput *= R;
    if (max(max(throughput.r, throughput.g), throughput.b) < GEM_MIN_THROUGHPUT) break;

    vec3 dRefl = reflect(d, N);
#if GEM_SMOOTH_NORMALS
    // The other face of the shading-normal problem: near grazing, reflecting
    // about the INTERPOLATED normal can send the ray through the actual
    // triangle (dot(dRefl, Ng) <= 0 — leaving the interior side). Redo that
    // bounce with the geometric normal instead of leaking light through the
    // surface. With flat normals this cannot happen, so the guard is compiled
    // out.
    if (dot(dRefl, Ng) <= 0.0) dRefl = reflect(d, Ng);
#endif
    d = dRefl;
    p = bvhOffsetRay(P, Ng);                    // Ng points inward: stay in the stone
  }

  return accum;
}

#if GEM_DISPERSION_MODE == 1
/**
 * The SHARED-PATH dispersion walk — the middle rung. One traversal carries the
 * geometry (at the green IoR); the radiometry is per-channel.
 *
 * What stays per-wavelength, because it is cheap and it is where the fire lives:
 *   - FRESNEL. Each channel has its own critical angle, so near the edge of the
 *     exit cone the channels genuinely part ways — red escapes while blue is
 *     still trapped. That differential is most of the visible dispersion.
 *   - The ESCAPE LOOKUP. Each channel refracts out in its own direction and
 *     samples the environment there (three fetches per escape event).
 * What is shared, because it is what costs: the interior PATH — reflections
 * follow the green geometry, so there is exactly one bvhClosestHit per bounce
 * instead of three. The entry is achromatic too (a per-channel entry would split
 * the path, which is what mode 2 pays for).
 */
vec3 gemWalkShared(GEM_BVH_PARAMS,
                   highp sampler2D envMap, mat3 objToWorld,
                   vec3 p, vec3 d, vec3 iors, vec3 kappa, float bounces) {
  vec3 accum = vec3(0.0);
  vec3 throughput = vec3(1.0);

  int n = int(ceil(bounces));
  float lastWeight = 1.0 - (float(n) - bounces);

  for (int i = 0; i < GEM_MAX_BOUNCES; ++i) {
    if (i >= n) break;

    BvhHit hit;
    if (!bvhClosestHit(bvhBounds, bvhContents, triPos, p, d, 1e-4, 1e4, hit)) {
      accum += throughput * gemEnv(envMap, objToWorld, d);
      break;
    }

    vec3 P = p + d * hit.t;
    vec3 Ng = hit.normal;                       // geometric: offsets
    vec3 N = GEM_SHADING_NORMAL(hit, d);        // shading: Fresnel + directions
    float cosI = dot(-d, N);
    throughput *= exp(-kappa * hit.t);

    vec3 R = vec3(
      gemFresnel(cosI, iors.r),
      gemFresnel(cosI, iors.g),
      gemFresnel(cosI, iors.b));
    float w = (i == n - 1) ? lastWeight : 1.0;

    // Per-channel escape: own direction, own env fetch, own TIR gate. The gates
    // matter twice over — they skip the fetch for trapped channels AND keep
    // refract()'s TIR zero-vector out of gemEnv (the 0 * NaN lesson).
    if (R.r < 1.0) {
      accum.r += throughput.r * (1.0 - R.r) *
        gemEnv(envMap, objToWorld, refract(d, N, iors.r)).r * w;
    }
    if (R.g < 1.0) {
      accum.g += throughput.g * (1.0 - R.g) *
        gemEnv(envMap, objToWorld, refract(d, N, iors.g)).g * w;
    }
    if (R.b < 1.0) {
      accum.b += throughput.b * (1.0 - R.b) *
        gemEnv(envMap, objToWorld, refract(d, N, iors.b)).b * w;
    }

    throughput *= R;
    if (max(max(throughput.r, throughput.g), throughput.b) < GEM_MIN_THROUGHPUT) break;

    vec3 dRefl = reflect(d, N);
#if GEM_SMOOTH_NORMALS
    // Same grazing-angle guard as gemWalk: never reflect through the surface.
    if (dot(dRefl, Ng) <= 0.0) dRefl = reflect(d, Ng);
#endif
    d = dRefl;
    p = bvhOffsetRay(P, Ng);
  }

  return accum;
}
#endif  // GEM_DISPERSION_MODE == 1

/**
 * The complete gem: entry Fresnel split, then the interior walk (three walks when
 * dispersing), composited.
 *
 * \`entry\` / \`normal\` / \`view\` are OBJECT space; \`normal\` points OUT of the stone and
 * \`view\` points TOWARD the camera. \`objToWorld\` is mat3(uModel) — the environment
 * lives in world space, the trace lives in object space, and this is the bridge.
 *
 * Entry never total-internal-reflects: air -> gem is a jump to a DENSER medium, and
 * TIR only exists going the other way. So the entry split is unconditional.
 *
 * DISPERSION costs 3x the traversal, because each channel genuinely follows a
 * different path through the stone — that divergence IS the fire. Cheaper rungs
 * (one shared path with per-channel exit lookups, or an entry-only chromatic
 * offset) are Phase-3 tier work; here we pay full price and measure it.
 */
vec3 gemShade(GEM_BVH_PARAMS,
              highp sampler2D envMap, mat3 objToWorld,
              GemMaterial m, vec3 entry, vec3 normal, vec3 view) {
  vec3 N = normalize(normal);
  vec3 V = normalize(view);
  float cosI = clamp(dot(N, V), 1e-4, 1.0);

  // Surface reflection: what bounces off the table before anything gets inside.
  // Uses the green-channel IoR — dispersion in the surface reflection is far below
  // the noise floor next to the fire coming out of the interior.
  float Rentry = gemFresnel(cosI, 1.0 / m.ior);
  vec3 reflDir = reflect(-V, N);
  vec3 surface = Rentry * gemEnv(envMap, objToWorld, reflDir);

  // Transmitted: start the interior walk just inside the surface. The offset uses
  // the NEGATED normal because we are crossing to the other side of it. Which
  // walk runs is a compile-time tier decision (GEM_DISPERSION_MODE) — only the
  // selected rung's code exists in the program, so the cheaper tiers do not pay
  // the expensive tier's register footprint.
  vec3 interior;
  vec3 pIn = bvhOffsetRay(entry, -N);
#if GEM_DISPERSION_MODE == 2
  if (m.dispersion > 1e-4) {
    vec3 iors = gemIors(m.ior, m.dispersion);
    // Three independent walks. Each keeps only its own channel: the red walk's
    // green and blue output is a different wavelength's answer and is discarded.
    float r = gemWalk(GEM_BVH_ARGS, envMap, objToWorld,
                      pIn, refract(-V, N, 1.0 / iors.r), iors.r, m.kappa, m.bounces).r;
    float g = gemWalk(GEM_BVH_ARGS, envMap, objToWorld,
                      pIn, refract(-V, N, 1.0 / iors.g), iors.g, m.kappa, m.bounces).g;
    float b = gemWalk(GEM_BVH_ARGS, envMap, objToWorld,
                      pIn, refract(-V, N, 1.0 / iors.b), iors.b, m.kappa, m.bounces).b;
    interior = vec3(r, g, b);
  } else {
    interior = gemWalk(GEM_BVH_ARGS, envMap, objToWorld,
                       pIn, refract(-V, N, 1.0 / m.ior), m.ior, m.kappa, m.bounces);
  }
#elif GEM_DISPERSION_MODE == 1
  if (m.dispersion > 1e-4) {
    interior = gemWalkShared(GEM_BVH_ARGS, envMap, objToWorld,
                             pIn, refract(-V, N, 1.0 / m.ior),
                             gemIors(m.ior, m.dispersion), m.kappa, m.bounces);
  } else {
    interior = gemWalk(GEM_BVH_ARGS, envMap, objToWorld,
                       pIn, refract(-V, N, 1.0 / m.ior), m.ior, m.kappa, m.bounces);
  }
#else
  // Lite rung: dispersion is simply off, whatever the control says.
  interior = gemWalk(GEM_BVH_ARGS, envMap, objToWorld,
                     pIn, refract(-V, N, 1.0 / m.ior), m.ior, m.kappa, m.bounces);
#endif

  return surface + (1.0 - Rentry) * interior;
}

#endif  // ZED_GEM_OPTICS
`,ce=`#ifndef ZED_SDF_TEX_INCLUDED
#define ZED_SDF_TEX_INCLUDED
float sdfTexDecode(vec4 texel, float spreadPx) {
highp float hi = texel.r * 255.0;
highp float lo = texel.g * 255.0;
highp float u = (hi * 256.0 + lo) / 65535.0;
return (u - 0.5) * 2.0 * spreadPx;
}
float sdfTexDistance(highp sampler2D tex, vec2 uv, float spreadPx) {
return sdfTexDecode(texture(tex, uv), spreadPx);
}
float sdfTexCoverage(highp sampler2D tex, vec2 uv) {
return texture(tex, uv).b;
}
float sdfTexAlpha(highp sampler2D tex, vec2 uv) {
return texture(tex, uv).a;
}
float sdfTexToUv(float dPx, vec2 texSizePx) {
return dPx / max(texSizePx.x, 1.0);
}
#endif`,Y=`#ifndef ZED_UNPACKING_INCLUDED
#define ZED_UNPACKING_INCLUDED
uint pkMaskBelow(int n) {
return n <= 0 ? 0u : (n >= 32 ? 0xffffffffu : (1u << uint(n)) - 1u);
}
uint pkExtractU(uint word, int off, int bits) {
return (word >> uint(off)) & pkMaskBelow(bits);
}
int pkExtractS(uint word, int off, int bits) {
return int(word << uint(32 - off - bits)) >> (32 - bits);
}
uint pkInsert(uint base, uint field, int off, int bits) {
uint m = pkMaskBelow(bits);
return (base & ~(m << uint(off))) | ((field & m) << uint(off));
}
int pkFindMSB(uint v) {
if (v == 0u) return -1;
int r = 0;
if ((v & 0xffff0000u) != 0u) { v >>= 16u; r += 16; }
if ((v & 0x0000ff00u) != 0u) { v >>= 8u; r += 8; }
if ((v & 0x000000f0u) != 0u) { v >>= 4u; r += 4; }
if ((v & 0x0000000cu) != 0u) { v >>= 2u; r += 2; }
if ((v & 0x00000002u) != 0u) { r += 1; }
return r;
}
uint pkU8(uint word, int lane) {
return (word >> uint(lane << 3)) & 0xffu;
}
int pkS8(uint word, int lane) {
return pkExtractS(word, lane << 3, 8);
}
uint pkU16(uint word, int lane) {
return (word >> uint(lane << 4)) & 0xffffu;
}
int pkS16(uint word, int lane) {
return pkExtractS(word, lane << 4, 16);
}
uvec4 pkUnpackU8x4(uint word) {
return uvec4(word, word >> 8u, word >> 16u, word >> 24u) & 0xffu;
}
ivec4 pkUnpackS8x4(uint word) {
return ivec4(pkS8(word, 0), pkS8(word, 1), pkS8(word, 2), pkS8(word, 3));
}
uvec2 pkUnpackU16x2(uint word) {
return uvec2(word, word >> 16u) & 0xffffu;
}
ivec2 pkUnpackS16x2(uint word) {
return ivec2(pkS16(word, 0), pkS16(word, 1));
}
uint pkPackU8x4(uvec4 b) {
b &= 0xffu;
return b.x | (b.y << 8u) | (b.z << 16u) | (b.w << 24u);
}
uint pkPackU16x2(uvec2 h) {
h &= 0xffffu;
return h.x | (h.y << 16u);
}
vec4 pkUnpackUnorm4x8(uint word) {
return vec4(pkUnpackU8x4(word)) * (1.0 / 255.0);
}
uint pkPackUnorm4x8(vec4 v) {
return pkPackU8x4(uvec4(clamp(v, 0.0, 1.0) * 255.0 + 0.5));
}
vec4 pkUnpackSnorm4x8(uint word) {
return clamp(vec4(pkUnpackS8x4(word)) * (1.0 / 127.0), -1.0, 1.0);
}
uint pkPackSnorm4x8(vec4 v) {
ivec4 b = ivec4(floor(clamp(v, -1.0, 1.0) * 127.0 + 0.5)) & 0xff;
return uint(b.x) | (uint(b.y) << 8u) | (uint(b.z) << 16u) | (uint(b.w) << 24u);
}
vec4 pkUnpackHalf4x16(uvec2 words) {
return vec4(unpackHalf2x16(words.x), unpackHalf2x16(words.y));
}
uvec2 pkPackHalf4x16(vec4 v) {
return uvec2(packHalf2x16(v.xy), packHalf2x16(v.zw));
}
vec4 pkUnpackRgb10A2(uint word) {
return vec4(vec3(uvec3(word, word >> 10u, word >> 20u) & 0x3ffu) * (1.0 / 1023.0),
float(word >> 30u) * (1.0 / 3.0));
}
uint pkPackRgb10A2(vec4 v) {
uvec3 rgb = uvec3(clamp(v.rgb, 0.0, 1.0) * 1023.0 + 0.5);
uint a = uint(clamp(v.a, 0.0, 1.0) * 3.0 + 0.5);
return rgb.x | (rgb.y << 10u) | (rgb.z << 20u) | (a << 30u);
}
uint pkUintFromFloat(float v) {
return uint(v + 0.5);
}
int pkIntFromFloat(float v) {
return int(floor(v + 0.5));
}
uint pkFieldFromFloat(float v, int off, int bits) {
return pkExtractU(pkUintFromFloat(v), off, bits);
}
int pkSFieldFromFloat(float v, int off, int bits) {
return pkExtractS(pkUintFromFloat(v), off, bits);
}
int pkByteFromUnorm(float c) {
return int(c * 255.0 + 0.5);
}
ivec4 pkBytesFromUnorm4(vec4 texel) {
return ivec4(texel * 255.0 + 0.5);
}
uint pkWordFromUnorm4(vec4 texel) {
uvec4 b = uvec4(texel * 255.0 + 0.5);
return b.x | (b.y << 8u) | (b.z << 16u) | (b.w << 24u);
}
float pkUnormFromByte(int b) {
return float(b) * (1.0 / 255.0);
}
ivec2 pkTexelAddr(int i, int texWidth) {
return ivec2(i % texWidth, i / texWidth);
}
ivec2 pkTexelAddrPow2(int i, int widthShift) {
return ivec2(i & ((1 << widthShift) - 1), i >> widthShift);
}
vec4 pkFetchF(highp sampler2D tex, int i, int texWidth) {
return texelFetch(tex, pkTexelAddr(i, texWidth), 0);
}
uvec4 pkFetchU(highp usampler2D tex, int i, int texWidth) {
return texelFetch(tex, pkTexelAddr(i, texWidth), 0);
}
vec4 pkFetchFPow2(highp sampler2D tex, int i, int widthShift) {
return texelFetch(tex, pkTexelAddrPow2(i, widthShift), 0);
}
uvec4 pkFetchUPow2(highp usampler2D tex, int i, int widthShift) {
return texelFetch(tex, pkTexelAddrPow2(i, widthShift), 0);
}
#define PK_LANE(arr, i) ((arr)[(i) >> 2][(i) & 3])
#endif`,le=`#ifndef ZED_RGBM_INCLUDED
#define ZED_RGBM_INCLUDED
vec4 _zrgbm_encLinear(vec3 v, float up, float dn) {
float m = max(max(v.r, v.g), v.b);
float mb = clamp(ceil(m * up), 1.0, 255.0);
return vec4(v / (mb * dn), mb * (1.0 / 255.0));
}
vec4 _zrgbm_encCurved(vec3 c) {
float m = max(max(c.r, c.g), c.b);
float mb = clamp(ceil(m * 255.0), 1.0, 255.0);
return vec4(c * (255.0 / mb), mb * (1.0 / 255.0));
}
vec3 _zrgbm_curveG2(vec3 v, float range) {
return sqrt(max(v, 0.0) / range);
}
vec4 rgbmEncode(vec3 v, float range) {
return _zrgbm_encLinear(v, 255.0 / range, range / 255.0);
}
vec3 rgbmDecode(vec4 e, float range) {
return e.rgb * (e.a * range);
}
vec4 rgbmEncodeG2(vec3 v, float range) {
return _zrgbm_encCurved(_zrgbm_curveG2(v, range));
}
vec3 rgbmDecodeG2(vec4 e, float range) {
vec3 t = e.rgb * e.a;
return t * t * range;
}
vec4 rgbmEncodeGamma(vec3 v, float range, float gamma) {
return _zrgbm_encCurved(pow(max(v, 0.0) / range, vec3(1.0 / gamma)));
}
vec3 rgbmDecodeGamma(vec4 e, float range, float gamma) {
return pow(max(e.rgb * e.a, 0.0), vec3(gamma)) * range;
}
vec4 rgbm8Encode(vec3 v) {
return _zrgbm_encLinear(v, 255.0 / 8.0, 8.0 / 255.0);
}
vec3 rgbm8Decode(vec4 e) {
return e.rgb * (e.a * 8.0);
}
vec4 rgbm8EncodeG2(vec3 v) {
return _zrgbm_encCurved(_zrgbm_curveG2(v, 8.0));
}
vec3 rgbm8DecodeG2(vec4 e) {
vec3 t = e.rgb * e.a;
return t * t * 8.0;
}
vec4 rgbm16Encode(vec3 v) {
return _zrgbm_encLinear(v, 255.0 / 16.0, 16.0 / 255.0);
}
vec3 rgbm16Decode(vec4 e) {
return e.rgb * (e.a * 16.0);
}
vec4 rgbm16EncodeG2(vec3 v) {
return _zrgbm_encCurved(_zrgbm_curveG2(v, 16.0));
}
vec3 rgbm16DecodeG2(vec4 e) {
vec3 t = e.rgb * e.a;
return t * t * 16.0;
}
#endif`,X=`#ifndef ZED_MSDF_GLYPH_INCLUDED
#define ZED_MSDF_GLYPH_INCLUDED
const int MSDF_MODE_SCREEN         = 0;
const int MSDF_MODE_BILLBOARD      = 1;
const int MSDF_MODE_TANGENT_SPHERE = 2;
const int MSDF_MODE_TANGENT_CUSTOM = 3;
struct MsdfGlyph {
vec3  anchor;
bool  live;
int   mode;
int   styleIndex;
int   flags;
vec2  local;
vec2  size;
vec4  uvRect;
};
MsdfGlyph msdfGlyphFetch(highp sampler2D pos, highp sampler2D quad,
highp sampler2D uvs, int instanceId) {
MsdfGlyph g;
int w = textureSize(pos, 0).x;
ivec2 addr = ivec2(instanceId % w, instanceId / w);
vec4 p = texelFetch(pos, addr, 0);
g.anchor = p.xyz;
if (p.w == 0.0) {
g.live = false;
g.mode = 0; g.styleIndex = 0; g.flags = 0;
g.local = vec2(0.0); g.size = vec2(0.0); g.uvRect = vec4(0.0);
return g;
}
uint ctrl = pkUintFromFloat(p.w);
g.flags = int(pkU8(ctrl, 0));
g.mode = int(pkU8(ctrl, 1));
g.styleIndex = int(pkU8(ctrl, 2));
g.live = true;
vec4 q = texelFetch(quad, addr, 0);
g.local = q.xy;
g.size = q.zw;
g.uvRect = texelFetch(uvs, addr, 0);
return g;
}
vec2 msdfGlyphUv(MsdfGlyph g, vec2 corner) {
return vec2(mix(g.uvRect.x, g.uvRect.z, corner.x),
mix(g.uvRect.w, g.uvRect.y, corner.y));
}
vec2 msdfGlyphCorner2D(MsdfGlyph g, vec2 corner) {
return g.anchor.xy + g.local + corner * g.size;
}
vec3 msdfGlyphCornerBillboard(MsdfGlyph g, vec2 corner, vec3 camRight, vec3 camUp) {
vec2 o = g.local + corner * g.size;
return g.anchor + camRight * o.x + camUp * o.y;
}
vec3 msdfGlyphCornerTangentSphere(MsdfGlyph g, vec2 corner, vec3 northHint) {
vec3 n = normalize(g.anchor);
vec3 east = normalize(cross(northHint, n));
vec3 north = cross(n, east);
vec2 o = g.local + corner * g.size;
return g.anchor + east * o.x + north * o.y;
}
vec4 msdfDegenerate() { return vec4(2.0, 2.0, 2.0, 1.0); }
#endif`,Z=`#ifndef ZED_MSDF_FIELD_INCLUDED
#define ZED_MSDF_FIELD_INCLUDED
float msdfMedian3(vec3 s) {
return max(min(s.r, s.g), min(max(s.r, s.g), s.b));
}
float _zmsdf_texelsPerPx(highp sampler2D atlas, vec2 uv) {
vec2 tex = vec2(textureSize(atlas, 0));
return max(length(dFdx(uv) * tex), length(dFdy(uv) * tex));
}
float msdfDistancePx(highp sampler2D atlas, vec2 uv, float pxRange) {
float sd = msdfMedian3(texture(atlas, uv).rgb) - 0.5;
return sd * pxRange / max(_zmsdf_texelsPerPx(atlas, uv), 1e-6);
}
float msdfTrueDistancePx(highp sampler2D atlas, vec2 uv, float pxRange) {
float sd = texture(atlas, uv).a - 0.5;
return sd * pxRange / max(_zmsdf_texelsPerPx(atlas, uv), 1e-6);
}
float msdfFieldReachPx(highp sampler2D atlas, vec2 uv, float pxRange) {
return 0.5 * pxRange / max(_zmsdf_texelsPerPx(atlas, uv), 1e-6);
}
float msdfCoverage(float distPx) {
return clamp(distPx + 0.5, 0.0, 1.0);
}
vec2 msdfClampUv(highp sampler2D atlas, vec2 uv, vec4 uvRect) {
vec2 h = 0.5 / vec2(textureSize(atlas, 0));
return clamp(uv, min(uvRect.xy, uvRect.zw) + h, max(uvRect.xy, uvRect.zw) - h);
}
#endif`,Q=`#ifndef ZED_MSDF_STYLE_INCLUDED
#define ZED_MSDF_STYLE_INCLUDED
struct MsdfStyle {
vec4  fill; vec4 outline; vec4 glow;
float outlineWidthPx; float glowWidthPx; float weightBias; float opacity;
};
MsdfStyle msdfStyleFetch(highp sampler2D styles, int styleIndex) {
MsdfStyle st;
st.fill    = texelFetch(styles, ivec2(0, styleIndex), 0);
st.outline = texelFetch(styles, ivec2(1, styleIndex), 0);
st.glow    = texelFetch(styles, ivec2(2, styleIndex), 0);
vec4 p     = texelFetch(styles, ivec2(3, styleIndex), 0);
st.outlineWidthPx = p.x;
st.glowWidthPx    = p.y;
st.weightBias     = p.z;
st.opacity        = p.w;
return st;
}
vec3 _zmsdf_toLinear(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
vec3 _zmsdf_toDisplay(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
vec4 _zmsdf_over(vec4 s, vec4 d) {
float a = s.a + d.a * (1.0 - s.a);
vec3 rgb = a > 0.0 ? (s.rgb * s.a + d.rgb * d.a * (1.0 - s.a)) / a : vec3(0.0);
return vec4(rgb, a);
}
vec4 msdfShade(float medianPx, float truePx, MsdfStyle st, float reachPx) {
float dTrue = truePx + st.weightBias;
float dFill = max(medianPx, truePx) + st.weightBias;
float maxW = max(reachPx - st.weightBias - 0.5, 0.0);
vec4 result = vec4(0.0);
#if !defined(ZED_TIER) || ZED_TIER >= 1
float glowA = st.glow.a;
float gw = min(st.glowWidthPx, maxW);
if (st.glowWidthPx > 0.0) {
glowA *= gw > 0.0 ? clamp(1.0 + dTrue / gw, 0.0, 1.0) : 0.0;
}
result = _zmsdf_over(vec4(_zmsdf_toLinear(st.glow.rgb), glowA), result);
#endif
if (st.outlineWidthPx > 0.0) {
float w = min(st.outlineWidthPx, maxW);
float band = clamp(msdfCoverage(dTrue + w) - msdfCoverage(dFill), 0.0, 1.0);
result = _zmsdf_over(vec4(_zmsdf_toLinear(st.outline.rgb), st.outline.a * band), result);
}
result = _zmsdf_over(vec4(_zmsdf_toLinear(st.fill.rgb), st.fill.a * msdfCoverage(dFill)), result);
result.rgb = _zmsdf_toDisplay(result.rgb);
result.a *= st.opacity;
return result;
}
vec4 msdfShade(float medianPx, float truePx, MsdfStyle st) {
return msdfShade(medianPx, truePx, st, 1e9);
}
#endif`,$=[Y,X].join(`
`),ue=Z,de=[Z,Q].join(`
`),fe=[Y,X,Z,Q].join(`
`),pe={"input.glsl":te,"lights.glsl":e,"area-lights.glsl":S,"light-emitters.glsl":C,"shadows.glsl":w,"pbr-brdf.glsl":T,"pbr-ibl.glsl":E,"pbr-normal.glsl":D,"pbr-iridescence.glsl":O,"tonemap.glsl":k,"triplanar.glsl":ae,"charts.glsl":R,"charts-data.glsl":A,"charts-line.glsl":j,"charts-line-aa.glsl":M,"charts-bar.glsl":F,"charts-grid.glsl":N,"charts-color.glsl":P,"charts-geo.glsl":L,"charts-label.glsl":I,"data-meta.glsl":t(`DataMeta`),"post.glsl":G,"post-sample.glsl":z,"post-blur.glsl":B,"post-bloom.glsl":V,"post-color.glsl":H,"post-lut.glsl":U,"post-dither.glsl":W,"screen-space.glsl":x,"ss.glsl":x,"ss-matrices.glsl":m,"ss-common.glsl":h,"ss-blur.glsl":g,"ss-ao.glsl":_,"ss-shadow.glsl":v,"ss-ssr.glsl":b,"ss-scene.glsl":y,"tilemap.glsl":K,"tilemap-aa.glsl":q,"sprites.glsl":J,"bvh-trace.glsl":oe,"gem-optics.glsl":se,"sdf.glsl":o,"sdf-ops.glsl":ie,"sdf2d.glsl":re,"sdf3d.glsl":i,"sdf2d-draw.glsl":n,"sdf-tex.glsl":ce,"raymarch.glsl":s,"raymarch-shade.glsl":r,"raymarch-terrain.glsl":a,"unpacking.glsl":Y,"rgbm.glsl":le,"msdf-glyph.glsl":$,"msdf-field.glsl":ue,"msdf-style.glsl":de,"msdf-text.glsl":fe};export{E as a,S as c,D as i,h as l,k as n,T as o,O as r,w as s,pe as t};