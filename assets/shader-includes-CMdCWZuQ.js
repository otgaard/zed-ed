import{n as e}from"./chunk-Dk7t3yRR.js";var t=e({commonDefs:()=>n,computeNormal:()=>a,default:()=>w,functions:()=>i,gammaCorrect:()=>r,hdr:()=>h,noise:()=>C,noiseDerivatives:()=>x,noiseFractal:()=>S,noiseHash:()=>g,noisePerlin:()=>b,noiseSimplex:()=>y,noiseValue:()=>_,noiseWorley:()=>v,noises:()=>u,pnoise2D:()=>d,pnoise3D:()=>f,pnoise4D:()=>p,rotate2D:()=>l,simplex2D:()=>o,simplex3D:()=>s,simplex4D:()=>c,splines:()=>m}),n=`#ifndef ZAP_COMMON_DEFS_INCLUDED
#define ZAP_COMMON_DEFS_INCLUDED
const float PI = 3.141593;
const float TWO_PI = 6.283185;
const float HALF_PI = 1.570796;
const float QUARTER_PI = 0.785398;
const float RECIP_PI = 0.318310;
const float RECIP_TWO_PI = 0.159155;
const float LOG2 = 1.442695;
const float LOG_HALF = -0.693147;
const float EPSILON = 1e-6;
#define saturate(a) (clamp( a, 0.0, 1.0 ))
#define lerp(a, b, t) (mix( a, b, t ))
#endif
`,r=`
vec3 gammaCorrect(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}`,i=`float bias(float b, float x) {
  return pow(x, log(b) / LOG_HALF);
}

float gain(float g, float x) {
  return mix(
  bias(1. - g, 2. * x) / 2.,
  1. - bias(1. - g, 2. - 2. * x) / 2.,
  step(.5, x)
  );
}

// a = amplitude, b = centre, c = variance
float gaussian(float x, float a, float b, float c) {
  float d = x - b;
  return a * exp(-(d * d) / (2. * c * c));
}

// Todo: swich pulse to (a, b, x) like everything else.. (used in some shaders)
float pulse(float x, float a, float b) {
  return step(a, x) - step(b, x);
}

float smoothPulse(float a, float b, float delta, float x) {
  return smoothstep(a - delta, a + delta, x) - smoothstep(b - delta, b + delta, x);
}

// All components are in the range [0…1], including hue.
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0., -1. / 3., 2. / 3., -1.);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x);
}

// All components are in the range [0…1], including hue.
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1., 2. / 3., 1. / 3., 3.);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y);
}

float getT(float t, float alpha, vec3 p0, vec3 p1) {
  vec3 d = p1 - p0;
  float a = dot(d, d);
  float b = pow(a, alpha * .5);
  return (b + t);
}

vec3 catmullRom(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
  float alpha = .5;
  float t0 = 0.;
  float t1 = getT(t0, alpha, p0, p1);
  float t2 = getT(t1, alpha, p1, p2);
  float t3 = getT(t2, alpha, p2, p3);
  t = mix(t1, t2, t);
  vec3 A1 = (t1-t)/(t1-t0)*p0 + (t-t0)/(t1-t0)*p1;
  vec3 A2 = (t2-t)/(t2-t1)*p1 + (t-t1)/(t2-t1)*p2;
  vec3 A3 = (t3-t)/(t3-t2)*p2 + (t-t2)/(t3-t2)*p3;
  vec3 B1 = (t2-t)/(t2-t0)*A1 + (t-t0)/(t2-t0)*A2;
  vec3 B2 = (t3-t)/(t3-t1)*A2 + (t-t1)/(t3-t1)*A3;
  vec3 C  = (t2-t)/(t2-t1)*B1 + (t-t1)/(t2-t1)*B2;
  return C;
}
`,a=`
vec3 computeNormal(float h, float normalScale) {
  return normalize(vec3(-dFdx(h), -dFdy(h), normalScale));
}
`,o=`
#ifndef ZED_SIMPLEX2D
#define ZED_SIMPLEX2D
// Source: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
// Simplex 2D noise
//
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
  -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
  dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}


#endif
`,s=`
#ifndef ZED_SIMPLEX3D
#define ZED_SIMPLEX3D
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
  dot(p2,x2), dot(p3,x3) ) );
}

#endif
`,c=`//	Simplex 4D Noise
//	by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

  return p;
}

float snoise(vec4 v){
  const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
  0.309016994374947451); // (sqrt(5) - 1)/4   F4
  // First corner
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

  // Other corners

  // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;

  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  //  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;

  //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;

  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

  // Permutations
  i = mod(i, 289.0);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
  i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
  + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
  + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
  + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
  // Gradients
  // ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.

  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

  // Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
  + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}
`,l=`mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec2 rotate2D(float angle, vec2 v) {
  mat2 m = rotate2D(angle);
  return m * v;
}

vec3 rotate2D(float angle, vec3 v) {
  mat2 m = rotate2D(angle);
  return vec3(m * v.xy, v.z);
}
`,u=`/*
These are my personal noise routines that I've developed based on my understanding and knowledge so they're more
customised to my personal preferences.
*/

#if defined(RAND_TEX)
uniform sampler2D randTex;

float random(vec2 st) {
  return texture(randTex, st).r;
}

float random(vec2 st, sampler2D tex) {
  return texture(tex, st).r;
}

float random(ivec2 uv) {
  return texelFetch(randTex, uv % textureSize(randTex, 0), 0).r;
}

float random(int u) {
  return texelFetch(randTex, ivec2(u, 0) % textureSize(randTex, 0), 0).r;
}

float random(ivec2 uv, sampler2D tex) {
  return texelFetch(tex, uv % textureSize(tex, 0), 0).r;
}

float random(ivec2 coord, ivec2 period) {
  ivec2 wrappedCoord = ivec2(mod(vec2(coord), vec2(period)));
  return texelFetch(randTex, wrappedCoord % textureSize(randTex, 0), 0).r;
}

float random(int u, int period) {
  return texelFetch(randTex, ivec2(mod(float(u), float(period))) % textureSize(randTex, 0), 0).r;
}

float random(ivec2 coord, ivec2 period, sampler2D tex) {
  ivec2 wrappedCoord = ivec2(mod(vec2(coord), vec2(period)));
  return texelFetch(tex, wrappedCoord % textureSize(randTex, 0), 0).r;
}

#else
float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float random(ivec2 uv) {
  return random(vec2(uv));
}

float random(ivec2 coord, ivec2 period) {
  ivec2 wrappedCoord = ivec2(mod(vec2(coord), vec2(period)));
  return random(wrappedCoord);
}
#endif

// Bilinear value noise
float valueNoise(vec2 uv) {
  ivec2 coord = ivec2(floor(uv));
  vec2 dd = uv - vec2(coord);

  return mix(
    mix(random(coord), random(coord + ivec2(1, 0)), dd.x),
    mix(random(coord + ivec2(0, 1)), random(coord + ivec2(1, 1)), dd.x),
    dd.y
  );
}

float valueNoise(vec2 uv, ivec2 period) {
  ivec2 coord = ivec2(floor(uv));
  vec2 dd = uv - vec2(coord);

  return mix(
    mix(random(coord, period), random(coord + ivec2(1, 0), period), dd.x),
    mix(random(coord + ivec2(0, 1), period), random(coord + ivec2(1), period), dd.x),
    dd.y
  );
}

// Bicubic value noise (nice, but expensive)
const mat4 bicubic = mat4(
  vec4(0., -1., 2., -1.),
  vec4(2., 0., -5., 3.),
  vec4(0., 1., 4., -3.),
  vec4(0., 0., -1., 1.)
);

float bicubicNoise(vec2 uv) {
  ivec2 coord = ivec2(floor(uv));
  vec2 dd = uv - vec2(coord);

  vec4 px = .5 * vec4(1., dd.x, dd.x * dd.x, dd.x * dd.x * dd.x);
  vec4 py = .5 * vec4(1., dd.y, dd.y * dd.y, dd.y * dd.y * dd.y);

  vec4 b;
  for(int i = -1; i < 3; ++i) {
    b[i+1] = dot(px, bicubic * vec4(
        random(coord + ivec2(-1, i)),
        random(coord + ivec2( 0, i)),
        random(coord + ivec2( 1, i)),
        random(coord + ivec2( 2, i))
    ));
  }

  return dot(py, bicubic * b);
}

float bicubicNoise(float u, int period) {
  int coord = int(floor(u));
  float dd = u - float(coord);

  vec4 px = .5 * vec4(1., dd, dd * dd, dd * dd * dd);

  return dot(
    px,
    bicubic * vec4(
      random(coord - 1, period),
      random(coord, period),
      random(coord + 1, period),
      random(coord + 2, period)
  ));
}

float bicubicNoise(vec2 uv, ivec2 period) {
  ivec2 coord = ivec2(floor(uv));
  vec2 dd = uv - vec2(coord);

  vec4 px = .5 * vec4(1., dd.x, dd.x * dd.x, dd.x * dd.x * dd.x);
  vec4 py = .5 * vec4(1., dd.y, dd.y * dd.y, dd.y * dd.y * dd.y);

  vec4 b;
  for(int i = -1; i < 3; ++i) {
    b[i+1] = dot(px, bicubic * vec4(
      random(coord + ivec2(-1, i), period),
      random(coord + ivec2( 0, i), period),
      random(coord + ivec2( 1, i), period),
      random(coord + ivec2( 2, i), period)
    ));
  }

  return dot(py, bicubic * b);
}

float bicubicNoise(vec2 uv, ivec2 period, sampler2D tex) {
  ivec2 coord = ivec2(floor(uv));
  vec2 dd = uv - vec2(coord);

  vec4 px = .5 * vec4(1., dd.x, dd.x * dd.x, dd.x * dd.x * dd.x);
  vec4 py = .5 * vec4(1., dd.y, dd.y * dd.y, dd.y * dd.y * dd.y);

  vec4 b;
  for(int i = -1; i < 3; ++i) {
    b[i+1] = dot(px, bicubic * vec4(
      random(coord + ivec2(-1, i), period, tex),
      random(coord + ivec2( 0, i), period, tex),
      random(coord + ivec2( 1, i), period, tex),
      random(coord + ivec2( 2, i), period, tex)
    ));
  }

  return dot(py, bicubic * b);
}
`,d=`//
// GLSL textureless classic 2D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-08-22
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise(vec2 P, vec2 rep)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy); // To create noise with explicit period
  Pi = mod289(Pi);        // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}
`,f=`//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}
`,p=`//	Classic Perlin 3D Noise
//	by Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec4 fade(vec4 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec4 P){
  vec4 Pi0 = floor(P); // Integer part for indexing
  vec4 Pi1 = Pi0 + 1.0; // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec4 Pf0 = fract(P); // Fractional part for interpolation
  vec4 Pf1 = Pf0 - 1.0; // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.zzzz);
  vec4 iz1 = vec4(Pi1.zzzz);
  vec4 iw0 = vec4(Pi0.wwww);
  vec4 iw1 = vec4(Pi1.wwww);

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 ixy00 = permute(ixy0 + iw0);
  vec4 ixy01 = permute(ixy0 + iw1);
  vec4 ixy10 = permute(ixy1 + iw0);
  vec4 ixy11 = permute(ixy1 + iw1);

  vec4 gx00 = ixy00 / 7.0;
  vec4 gy00 = floor(gx00) / 7.0;
  vec4 gz00 = floor(gy00) / 6.0;
  gx00 = fract(gx00) - 0.5;
  gy00 = fract(gy00) - 0.5;
  gz00 = fract(gz00) - 0.5;
  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);
  vec4 sw00 = step(gw00, vec4(0.0));
  gx00 -= sw00 * (step(0.0, gx00) - 0.5);
  gy00 -= sw00 * (step(0.0, gy00) - 0.5);

  vec4 gx01 = ixy01 / 7.0;
  vec4 gy01 = floor(gx01) / 7.0;
  vec4 gz01 = floor(gy01) / 6.0;
  gx01 = fract(gx01) - 0.5;
  gy01 = fract(gy01) - 0.5;
  gz01 = fract(gz01) - 0.5;
  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);
  vec4 sw01 = step(gw01, vec4(0.0));
  gx01 -= sw01 * (step(0.0, gx01) - 0.5);
  gy01 -= sw01 * (step(0.0, gy01) - 0.5);

  vec4 gx10 = ixy10 / 7.0;
  vec4 gy10 = floor(gx10) / 7.0;
  vec4 gz10 = floor(gy10) / 6.0;
  gx10 = fract(gx10) - 0.5;
  gy10 = fract(gy10) - 0.5;
  gz10 = fract(gz10) - 0.5;
  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);
  vec4 sw10 = step(gw10, vec4(0.0));
  gx10 -= sw10 * (step(0.0, gx10) - 0.5);
  gy10 -= sw10 * (step(0.0, gy10) - 0.5);

  vec4 gx11 = ixy11 / 7.0;
  vec4 gy11 = floor(gx11) / 7.0;
  vec4 gz11 = floor(gy11) / 6.0;
  gx11 = fract(gx11) - 0.5;
  gy11 = fract(gy11) - 0.5;
  gz11 = fract(gz11) - 0.5;
  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);
  vec4 sw11 = step(gw11, vec4(0.0));
  gx11 -= sw11 * (step(0.0, gx11) - 0.5);
  gy11 -= sw11 * (step(0.0, gy11) - 0.5);

  vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);
  vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);
  vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);
  vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);
  vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);
  vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);
  vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);
  vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);
  vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);
  vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);
  vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);
  vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);
  vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);
  vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);
  vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);
  vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);

  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100)));
  g0000 *= norm00.x;
  g0100 *= norm00.y;
  g1000 *= norm00.z;
  g1100 *= norm00.w;

  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101)));
  g0001 *= norm01.x;
  g0101 *= norm01.y;
  g1001 *= norm01.z;
  g1101 *= norm01.w;

  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110)));
  g0010 *= norm10.x;
  g0110 *= norm10.y;
  g1010 *= norm10.z;
  g1110 *= norm10.w;

  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111)));
  g0011 *= norm11.x;
  g0111 *= norm11.y;
  g1011 *= norm11.z;
  g1111 *= norm11.w;

  float n0000 = dot(g0000, Pf0);
  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));
  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));
  float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));
  float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));
  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));
  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));
  float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));
  float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));
  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));
  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));
  float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));
  float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));
  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));
  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));
  float n1111 = dot(g1111, Pf1);

  vec4 fade_xyzw = fade(Pf0);
  vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);
  vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);
  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);
  vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);
  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);
  return 2.2 * n_xyzw;
}

// Classic Perlin noise, periodic version
float cnoise(vec4 P, vec4 rep){
  vec4 Pi0 = mod(floor(P), rep); // Integer part modulo rep
  vec4 Pi1 = mod(Pi0 + 1.0, rep); // Integer part + 1 mod rep
  vec4 Pf0 = fract(P); // Fractional part for interpolation
  vec4 Pf1 = Pf0 - 1.0; // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.zzzz);
  vec4 iz1 = vec4(Pi1.zzzz);
  vec4 iw0 = vec4(Pi0.wwww);
  vec4 iw1 = vec4(Pi1.wwww);

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 ixy00 = permute(ixy0 + iw0);
  vec4 ixy01 = permute(ixy0 + iw1);
  vec4 ixy10 = permute(ixy1 + iw0);
  vec4 ixy11 = permute(ixy1 + iw1);

  vec4 gx00 = ixy00 / 7.0;
  vec4 gy00 = floor(gx00) / 7.0;
  vec4 gz00 = floor(gy00) / 6.0;
  gx00 = fract(gx00) - 0.5;
  gy00 = fract(gy00) - 0.5;
  gz00 = fract(gz00) - 0.5;
  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);
  vec4 sw00 = step(gw00, vec4(0.0));
  gx00 -= sw00 * (step(0.0, gx00) - 0.5);
  gy00 -= sw00 * (step(0.0, gy00) - 0.5);

  vec4 gx01 = ixy01 / 7.0;
  vec4 gy01 = floor(gx01) / 7.0;
  vec4 gz01 = floor(gy01) / 6.0;
  gx01 = fract(gx01) - 0.5;
  gy01 = fract(gy01) - 0.5;
  gz01 = fract(gz01) - 0.5;
  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);
  vec4 sw01 = step(gw01, vec4(0.0));
  gx01 -= sw01 * (step(0.0, gx01) - 0.5);
  gy01 -= sw01 * (step(0.0, gy01) - 0.5);

  vec4 gx10 = ixy10 / 7.0;
  vec4 gy10 = floor(gx10) / 7.0;
  vec4 gz10 = floor(gy10) / 6.0;
  gx10 = fract(gx10) - 0.5;
  gy10 = fract(gy10) - 0.5;
  gz10 = fract(gz10) - 0.5;
  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);
  vec4 sw10 = step(gw10, vec4(0.0));
  gx10 -= sw10 * (step(0.0, gx10) - 0.5);
  gy10 -= sw10 * (step(0.0, gy10) - 0.5);

  vec4 gx11 = ixy11 / 7.0;
  vec4 gy11 = floor(gx11) / 7.0;
  vec4 gz11 = floor(gy11) / 6.0;
  gx11 = fract(gx11) - 0.5;
  gy11 = fract(gy11) - 0.5;
  gz11 = fract(gz11) - 0.5;
  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);
  vec4 sw11 = step(gw11, vec4(0.0));
  gx11 -= sw11 * (step(0.0, gx11) - 0.5);
  gy11 -= sw11 * (step(0.0, gy11) - 0.5);

  vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);
  vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);
  vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);
  vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);
  vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);
  vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);
  vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);
  vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);
  vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);
  vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);
  vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);
  vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);
  vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);
  vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);
  vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);
  vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);

  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100)));
  g0000 *= norm00.x;
  g0100 *= norm00.y;
  g1000 *= norm00.z;
  g1100 *= norm00.w;

  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101)));
  g0001 *= norm01.x;
  g0101 *= norm01.y;
  g1001 *= norm01.z;
  g1101 *= norm01.w;

  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110)));
  g0010 *= norm10.x;
  g0110 *= norm10.y;
  g1010 *= norm10.z;
  g1110 *= norm10.w;

  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111)));
  g0011 *= norm11.x;
  g0111 *= norm11.y;
  g1011 *= norm11.z;
  g1111 *= norm11.w;

  float n0000 = dot(g0000, Pf0);
  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));
  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));
  float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));
  float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));
  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));
  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));
  float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));
  float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));
  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));
  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));
  float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));
  float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));
  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));
  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));
  float n1111 = dot(g1111, Pf1);

  vec4 fade_xyzw = fade(Pf0);
  vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);
  vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);
  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);
  vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);
  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);
  return 2.2 * n_xyzw;
}
`,m=`// This is taken from the book "Texturing and Modeling - A Procedural Approach"

const mat4 crBasisMatrix = mat4(
  vec4(-0.5,  1.5, -1.5,  0.5),
  vec4( 1.0, -2.5,  2.0, -0.5),
  vec4(-0.5,  0.0,  0.5,  0.0),
  vec4( 0.0,  1.0,  0.0,  0.0)
);

float cubic(float x, vec4 v) {
  return ((v[0] * x + v[1]) * x + v[2]) * x + v[3];
}

// We have to use fixed-length arrays so max 16 for now...
float spline(float x, int nknots, float knots[16]) {
  int nspans = nknots - 3;
  if (nspans < 1) return 0.;

  x = clamp(x, 0., 1.) * float(nspans);
  int span = min(int(x), nspans);
  x -= float(span);

  vec4 v = vec4(knots[span], knots[span + 1], knots[span + 2], knots[span + 3]);
  vec4 c = v * crBasisMatrix;
  return ((c[0] * x + c[1]) * x + c[2]) * x + c[3];
}

vec3 spline(float x, int nknots, vec3 knots[16]) {
  int nspans = nknots - 3;
  if (nspans < 1) return vec3(0.);

  x = clamp(x, 0., 1.) * float(nspans);
  int span = min(int(x), nspans);
  x -= float(span);

  vec4 r = vec4(knots[span].r, knots[span + 1].r, knots[span + 2].r, knots[span + 3].r);
  vec4 g = vec4(knots[span].g, knots[span + 1].g, knots[span + 2].g, knots[span + 3].g);
  vec4 b = vec4(knots[span].b, knots[span + 1].b, knots[span + 2].b, knots[span + 3].b);

  r *= crBasisMatrix; g *= crBasisMatrix; b *= crBasisMatrix;

  return vec3(
    cubic(x, r),
    cubic(x, g),
    cubic(x, b)
  );
}

vec3 cubic(vec3 A, vec3 B, vec3 C, vec3 D, float x) {
  vec4 r = vec4(A.r, B.r, C.r, D.r);
  vec4 g = vec4(A.g, B.g, C.g, D.g);
  vec4 b = vec4(A.b, B.b, C.b, D.b);

  r *= crBasisMatrix; g *= crBasisMatrix; b *= crBasisMatrix;

  return vec3(
    cubic(x, r),
    cubic(x, g),
    cubic(x, b)
  );
}
`,h=`vec3 ACESFilmic(vec3 colour) {
  const float a = 2.51; const float b = .03; const float c = 2.43; const float d = .59;  const float e = .14;
  return min((colour * (a * colour + b)) / (colour * (c * colour + d) + e), 1.);
}

vec3 hdr2sRGB(vec3 colour, float gamma) {
  return pow(ACESFilmic(colour), vec3(1./gamma));
}
`,g=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif
`,_=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif

#ifndef ZED_NOISE_VALUE
#define ZED_NOISE_VALUE
// noiseValue.glsl
// Value and gradient noise on a regular integer lattice with quintic
// interpolation, in 2D and 3D, plus periodic variants.
//
// Output ranges:
//   vnoise* (value):     [0, 1]
//   gnoise* (gradient):  [-1, 1]   (caller can * 0.5 + 0.5 to remap)
//
// Self-contained: the <noiseValue> import bundles the <noiseHash> helpers
// ahead of this body (and is safe to combine with other <noise*> imports).

// === value noise (bilinear / quintic-smoothed scalar lattice) ===

float vnoise2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  float v00 = _zn_latticeHash2(i + ivec2(0, 0));
  float v10 = _zn_latticeHash2(i + ivec2(1, 0));
  float v01 = _zn_latticeHash2(i + ivec2(0, 1));
  float v11 = _zn_latticeHash2(i + ivec2(1, 1));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float vnoise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  float v000 = _zn_latticeHash3(i + ivec3(0, 0, 0));
  float v100 = _zn_latticeHash3(i + ivec3(1, 0, 0));
  float v010 = _zn_latticeHash3(i + ivec3(0, 1, 0));
  float v110 = _zn_latticeHash3(i + ivec3(1, 1, 0));
  float v001 = _zn_latticeHash3(i + ivec3(0, 0, 1));
  float v101 = _zn_latticeHash3(i + ivec3(1, 0, 1));
  float v011 = _zn_latticeHash3(i + ivec3(0, 1, 1));
  float v111 = _zn_latticeHash3(i + ivec3(1, 1, 1));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float vnoise2Periodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  ivec2 ip = ivec2(period);
  float v00 = _zn_latticeHash2P(i + ivec2(0, 0), ip);
  float v10 = _zn_latticeHash2P(i + ivec2(1, 0), ip);
  float v01 = _zn_latticeHash2P(i + ivec2(0, 1), ip);
  float v11 = _zn_latticeHash2P(i + ivec2(1, 1), ip);
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float vnoise3Periodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  ivec3 ip = ivec3(period);
  float v000 = _zn_latticeHash3P(i + ivec3(0, 0, 0), ip);
  float v100 = _zn_latticeHash3P(i + ivec3(1, 0, 0), ip);
  float v010 = _zn_latticeHash3P(i + ivec3(0, 1, 0), ip);
  float v110 = _zn_latticeHash3P(i + ivec3(1, 1, 0), ip);
  float v001 = _zn_latticeHash3P(i + ivec3(0, 0, 1), ip);
  float v101 = _zn_latticeHash3P(i + ivec3(1, 0, 1), ip);
  float v011 = _zn_latticeHash3P(i + ivec3(0, 1, 1), ip);
  float v111 = _zn_latticeHash3P(i + ivec3(1, 1, 1), ip);
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

// === gradient noise (Perlin-style, no permutation table) ===

float gnoise2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  vec2 g00 = _zn_gradient2(i + ivec2(0, 0));
  vec2 g10 = _zn_gradient2(i + ivec2(1, 0));
  vec2 g01 = _zn_gradient2(i + ivec2(0, 1));
  vec2 g11 = _zn_gradient2(i + ivec2(1, 1));
  float v00 = dot(g00, f - vec2(0.0, 0.0));
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float gnoise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  vec3 g000 = _zn_gradient3(i + ivec3(0, 0, 0));
  vec3 g100 = _zn_gradient3(i + ivec3(1, 0, 0));
  vec3 g010 = _zn_gradient3(i + ivec3(0, 1, 0));
  vec3 g110 = _zn_gradient3(i + ivec3(1, 1, 0));
  vec3 g001 = _zn_gradient3(i + ivec3(0, 0, 1));
  vec3 g101 = _zn_gradient3(i + ivec3(1, 0, 1));
  vec3 g011 = _zn_gradient3(i + ivec3(0, 1, 1));
  vec3 g111 = _zn_gradient3(i + ivec3(1, 1, 1));
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float gnoise2Periodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  ivec2 ip = ivec2(period);
  vec2 g00 = _zn_gradient2P(i + ivec2(0, 0), ip);
  vec2 g10 = _zn_gradient2P(i + ivec2(1, 0), ip);
  vec2 g01 = _zn_gradient2P(i + ivec2(0, 1), ip);
  vec2 g11 = _zn_gradient2P(i + ivec2(1, 1), ip);
  float v00 = dot(g00, f - vec2(0.0, 0.0));
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float gnoise3Periodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  ivec3 ip = ivec3(period);
  vec3 g000 = _zn_gradient3P(i + ivec3(0, 0, 0), ip);
  vec3 g100 = _zn_gradient3P(i + ivec3(1, 0, 0), ip);
  vec3 g010 = _zn_gradient3P(i + ivec3(0, 1, 0), ip);
  vec3 g110 = _zn_gradient3P(i + ivec3(1, 1, 0), ip);
  vec3 g001 = _zn_gradient3P(i + ivec3(0, 0, 1), ip);
  vec3 g101 = _zn_gradient3P(i + ivec3(1, 0, 1), ip);
  vec3 g011 = _zn_gradient3P(i + ivec3(0, 1, 1), ip);
  vec3 g111 = _zn_gradient3P(i + ivec3(1, 1, 1), ip);
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

#endif
`,v=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif

#ifndef ZED_NOISE_WORLEY
#define ZED_NOISE_WORLEY
// noiseWorley.glsl
// Worley (cellular) noise and Voronoi variants. 2D and 3D, with periodic
// wrapping. Each cell of an integer lattice hosts one randomly-placed
// feature point; the noise value at any sample point is derived from
// the distance(s) to the nearest feature point(s).
//
// Returns:
//   worley*       : vec2(F1, F2)  — distances to 1st and 2nd nearest points
//   voronoi2      : vec2(F1, cellHash)  — F1 plus [0,1) hash of the closest cell
//   voronoi3WithColor : vec3(F1, cellHash, F2 - F1)
//                       — third channel is the classic "Voronoi edge" metric
//                         (≈0 on cell borders, large inside)
//
// jitter ∈ [0, 1]:
//   0.0 — feature points sit at cell centres (perfectly regular grid;
//         useful for flat-shaded cell-id art)
//   1.0 — feature points may sit anywhere inside the cell (standard Worley)
//
// Self-contained: the <noiseWorley> import bundles the <noiseHash> helpers
// ahead of this body (and is safe to combine with other <noise*> imports).

vec2 _zn_cellPoint2(ivec2 i, float jitter) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  vec2 r = vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
  return vec2(0.5) + (r - vec2(0.5)) * jitter;
}
vec3 _zn_cellPoint3(ivec3 i, float jitter) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  vec3 r = vec3(
    _zn_hashToFloat(h),
    _zn_hashToFloat(_zn_hash1u(h)),
    _zn_hashToFloat(_zn_hash1u(_zn_hash1u(h)))
  );
  return vec3(0.5) + (r - vec3(0.5)) * jitter;
}
vec2 _zn_cellPoint2P(ivec2 i, ivec2 period, float jitter) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_cellPoint2(w, jitter);
}
vec3 _zn_cellPoint3P(ivec3 i, ivec3 period, float jitter) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_cellPoint3(w, jitter);
}

// === 2D Worley (F1, F2) ===

vec2 worley2(vec2 p, float jitter) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dy = -1; dy <= 1; ++dy) {
    for (int dx = -1; dx <= 1; ++dx) {
      ivec2 ofs = ivec2(dx, dy);
      vec2 cp = vec2(ofs) + _zn_cellPoint2(i + ofs, jitter);
      vec2 d = cp - f;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; f1 = dd; }
      else if (dd < f2) { f2 = dd; }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

vec2 worley2Periodic(vec2 p, vec2 period, float jitter) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  ivec2 ip = ivec2(period);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dy = -1; dy <= 1; ++dy) {
    for (int dx = -1; dx <= 1; ++dx) {
      ivec2 ofs = ivec2(dx, dy);
      vec2 cp = vec2(ofs) + _zn_cellPoint2P(i + ofs, ip, jitter);
      vec2 d = cp - f;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; f1 = dd; }
      else if (dd < f2) { f2 = dd; }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

// === 3D Worley (F1, F2) ===

vec2 worley3(vec3 p, float jitter) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dz = -1; dz <= 1; ++dz) {
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        ivec3 ofs = ivec3(dx, dy, dz);
        vec3 cp = vec3(ofs) + _zn_cellPoint3(i + ofs, jitter);
        vec3 d = cp - f;
        float dd = dot(d, d);
        if (dd < f1) { f2 = f1; f1 = dd; }
        else if (dd < f2) { f2 = dd; }
      }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

vec2 worley3Periodic(vec3 p, vec3 period, float jitter) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  ivec3 ip = ivec3(period);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dz = -1; dz <= 1; ++dz) {
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        ivec3 ofs = ivec3(dx, dy, dz);
        vec3 cp = vec3(ofs) + _zn_cellPoint3P(i + ofs, ip, jitter);
        vec3 d = cp - f;
        float dd = dot(d, d);
        if (dd < f1) { f2 = f1; f1 = dd; }
        else if (dd < f2) { f2 = dd; }
      }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

// === Voronoi (F1 + cell info) ===

vec2 voronoi2(vec2 p, float jitter) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  float f1 = 9.0;
  ivec2 bestCell = ivec2(0);
  for (int dy = -1; dy <= 1; ++dy) {
    for (int dx = -1; dx <= 1; ++dx) {
      ivec2 ofs = ivec2(dx, dy);
      vec2 cp = vec2(ofs) + _zn_cellPoint2(i + ofs, jitter);
      vec2 d = cp - f;
      float dd = dot(d, d);
      if (dd < f1) { f1 = dd; bestCell = i + ofs; }
    }
  }
  return vec2(sqrt(f1), _zn_latticeHash2(bestCell));
}

vec3 voronoi3WithColor(vec3 p, float jitter) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  float f1 = 9.0;
  float f2 = 9.0;
  ivec3 bestCell = ivec3(0);
  for (int dz = -1; dz <= 1; ++dz) {
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        ivec3 ofs = ivec3(dx, dy, dz);
        vec3 cp = vec3(ofs) + _zn_cellPoint3(i + ofs, jitter);
        vec3 d = cp - f;
        float dd = dot(d, d);
        if (dd < f1) { f2 = f1; f1 = dd; bestCell = i + ofs; }
        else if (dd < f2) { f2 = dd; }
      }
    }
  }
  float f1s = sqrt(f1);
  float f2s = sqrt(f2);
  return vec3(f1s, _zn_latticeHash3(bestCell), f2s - f1s);
}

#endif
`,y=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif

#ifndef ZED_SIMPLEX2D
#define ZED_SIMPLEX2D
// Source: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
// Simplex 2D noise
//
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
  -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
  dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}


#endif

#ifndef ZED_SIMPLEX3D
#define ZED_SIMPLEX3D
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
  dot(p2,x2), dot(p3,x3) ) );
}

#endif

#ifndef ZED_NOISE_SIMPLEX
#define ZED_NOISE_SIMPLEX
// noiseSimplex.glsl
// Periodic and fractal wrappers around the simplex noise from
// <simplex2D> / <simplex3D>. Simplex noise on its own isn't naturally
// periodic; the *Periodic helpers here use the 4-corner (2D) / 8-corner
// (3D) tile-blend trick to approximate periodicity, at the cost of:
//   - 4× the snoise calls per sample in 2D, 8× in 3D
//   - faint diagonal seams visible at low resolutions
// Generally fine for demo use. If you need genuine periodicity prefer
// <noisePerlin>::cnoise2Periodic / cnoise3Periodic — Perlin noise is
// natively periodic via Gustavson's \`pnoise\` mod-trick.
//
// The fbm/turbulence/ridge/billow wrappers below build on the non-periodic
// \`snoise(vec2)\` / \`snoise(vec3)\`. The <noiseSimplex> import is
// self-contained: it bundles the <noiseHash>, <simplex2D> and <simplex3D>
// bodies (which define \`snoise\`) ahead of these wrappers, all guarded so
// they dedup against bare <simplex2D> / <simplex3D> imports.
//
// The aggregator <noise> deliberately OMITS simplex (keeping it free of the
// upstream simplex permute/mod289), so reach for <noiseSimplex> directly.
// Caveat: don't combine <noiseSimplex> with <pnoise2D/3D/4D> or <simplex4D>
// in one shader — those define a colliding \`permute(vec4)\` the guards
// cannot reconcile.

#ifndef NOISE_FBM_MAX_OCTAVES
#define NOISE_FBM_MAX_OCTAVES 8
#endif

// === periodic simplex (tile-blend approximation) ===

float snoise2Periodic(vec2 p, vec2 period) {
  vec2 q = mod(mod(p, period) + period, period);
  vec2 t = q / period;
  vec2 w = t * t * (3.0 - 2.0 * t);
  float a = snoise(q);
  float b = snoise(q - vec2(period.x, 0.0));
  float c = snoise(q - vec2(0.0, period.y));
  float d = snoise(q - period);
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float snoise3Periodic(vec3 p, vec3 period) {
  vec3 q = mod(mod(p, period) + period, period);
  vec3 t = q / period;
  vec3 w = t * t * (3.0 - 2.0 * t);
  float n000 = snoise(q);
  float n100 = snoise(q - vec3(period.x, 0.0,      0.0));
  float n010 = snoise(q - vec3(0.0,      period.y, 0.0));
  float n110 = snoise(q - vec3(period.x, period.y, 0.0));
  float n001 = snoise(q - vec3(0.0,      0.0,      period.z));
  float n101 = snoise(q - vec3(period.x, 0.0,      period.z));
  float n011 = snoise(q - vec3(0.0,      period.y, period.z));
  float n111 = snoise(q - period);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  return mix(mix(x00, x10, w.y), mix(x01, x11, w.y), w.z);
}

// === fractal wrappers for simplex base ===

float fbm2Simplex(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * snoise(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Simplex(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * snoise(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

float turbulence2Simplex(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(snoise(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Simplex(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(snoise(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

float ridge2Simplex(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(snoise(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Simplex(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(snoise(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

float billow2Simplex(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(snoise(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Simplex(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(snoise(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

#endif
`,b=`
#ifndef ZED_NOISE_PERLIN
#define ZED_NOISE_PERLIN
// noisePerlin.glsl
// Classic Perlin noise (cnoise) and periodic Perlin (cnoise*Periodic) in
// 2D and 3D. Internal helpers are namespaced with \`_znp_\` so this file
// does NOT conflict with <pnoise2D> / <pnoise3D> / <simplex3D> on
// permute / mod289 / taylorInvSqrt — you can include them all together
// without redefinition errors.
//
// Based on Stefan Gustavson's webgl-noise (MIT, 2011).
// https://github.com/ashima/webgl-noise

vec3 _znp_mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 _znp_mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 _znp_permute(vec4 x) {
  return _znp_mod289(((x * 34.0) + 1.0) * x);
}
vec4 _znp_taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}
vec2 _znp_fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _znp_fade(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise2(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = _znp_mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = _znp_permute(_znp_permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = _znp_taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01),
                                     dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _znp_fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float cnoise2Periodic(vec2 P, vec2 rep) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy);
  Pi = _znp_mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = _znp_permute(_znp_permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = _znp_taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01),
                                     dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _znp_fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float cnoise3(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = _znp_mod289(Pi0);
  Pi1 = _znp_mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = _znp_permute(_znp_permute(ix) + iy);
  vec4 ixy0 = _znp_permute(ixy + iz0);
  vec4 ixy1 = _znp_permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = _znp_taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010),
                                       dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = _znp_taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011),
                                       dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = _znp_fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110),
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

float cnoise3Periodic(vec3 P, vec3 rep) {
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
  Pi0 = _znp_mod289(Pi0);
  Pi1 = _znp_mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = _znp_permute(_znp_permute(ix) + iy);
  vec4 ixy0 = _znp_permute(ixy + iz0);
  vec4 ixy1 = _znp_permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = _znp_taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010),
                                       dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = _znp_taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011),
                                       dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = _znp_fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110),
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

#endif
`,x=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif

#ifndef ZED_NOISE_DERIVATIVES
#define ZED_NOISE_DERIVATIVES
// noiseDerivatives.glsl
// Gradient noise with analytical derivatives — no finite differences,
// no screen-space dFdx/dFdy. Useful for normal-map generation, flow
// fields, and curl noise. Same base gradient noise as
// <noiseValue>::gnoise2/gnoise3.
//
// Returns vec4(value, ddx, ddy, ddz). 2D variants set ddz to 0.
//
// Derivation: Inigo Quilez's analytic-noise formula
// (https://iquilezles.org/articles/morenoise/), adapted to our hashes
// and gradient construction.
//
// Self-contained: the <noiseDerivatives> import bundles the <noiseHash>
// helpers ahead of this body (safe to combine with other <noise*> imports).

vec4 gnoise2d(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = _zn_gradient2(i + ivec2(0, 0));
  vec2 gb = _zn_gradient2(i + ivec2(1, 0));
  vec2 gc = _zn_gradient2(i + ivec2(0, 1));
  vec2 gd = _zn_gradient2(i + ivec2(1, 1));
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float value = va + u.x * (vb - va) + u.y * (vc - va)
              + u.x * u.y * (va - vb - vc + vd);
  vec2 grad = ga + u.x * (gb - ga) + u.y * (gc - ga)
            + u.x * u.y * (ga - gb - gc + gd)
            + du * (vec2(vb - va, vc - va) + u.yx * (va - vb - vc + vd));
  return vec4(value, grad.x, grad.y, 0.0);
}

vec4 gnoise2dPeriodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec2 ip = ivec2(period);
  vec2 ga = _zn_gradient2P(i + ivec2(0, 0), ip);
  vec2 gb = _zn_gradient2P(i + ivec2(1, 0), ip);
  vec2 gc = _zn_gradient2P(i + ivec2(0, 1), ip);
  vec2 gd = _zn_gradient2P(i + ivec2(1, 1), ip);
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float value = va + u.x * (vb - va) + u.y * (vc - va)
              + u.x * u.y * (va - vb - vc + vd);
  vec2 grad = ga + u.x * (gb - ga) + u.y * (gc - ga)
            + u.x * u.y * (ga - gb - gc + gd)
            + du * (vec2(vb - va, vc - va) + u.yx * (va - vb - vc + vd));
  return vec4(value, grad.x, grad.y, 0.0);
}

vec4 gnoise3d(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec3 g000 = _zn_gradient3(i + ivec3(0, 0, 0));
  vec3 g100 = _zn_gradient3(i + ivec3(1, 0, 0));
  vec3 g010 = _zn_gradient3(i + ivec3(0, 1, 0));
  vec3 g110 = _zn_gradient3(i + ivec3(1, 1, 0));
  vec3 g001 = _zn_gradient3(i + ivec3(0, 0, 1));
  vec3 g101 = _zn_gradient3(i + ivec3(1, 0, 1));
  vec3 g011 = _zn_gradient3(i + ivec3(0, 1, 1));
  vec3 g111 = _zn_gradient3(i + ivec3(1, 1, 1));
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float k0 = v000;
  float k1 = v100 - v000;
  float k2 = v010 - v000;
  float k3 = v001 - v000;
  float k4 = v000 - v100 - v010 + v110;
  float k5 = v000 - v100 - v001 + v101;
  float k6 = v000 - v010 - v001 + v011;
  float k7 = -v000 + v100 + v010 + v001 - v110 - v101 - v011 + v111;
  float value = k0
    + k1 * u.x + k2 * u.y + k3 * u.z
    + k4 * u.x * u.y + k5 * u.x * u.z + k6 * u.y * u.z
    + k7 * u.x * u.y * u.z;
  vec3 grad = g000
    + u.x * (g100 - g000)
    + u.y * (g010 - g000)
    + u.z * (g001 - g000)
    + u.x * u.y * (g000 - g100 - g010 + g110)
    + u.x * u.z * (g000 - g100 - g001 + g101)
    + u.y * u.z * (g000 - g010 - g001 + g011)
    + u.x * u.y * u.z * (-g000 + g100 + g010 + g001 - g110 - g101 - g011 + g111)
    + du * vec3(
        k1 + k4 * u.y + k5 * u.z + k7 * u.y * u.z,
        k2 + k4 * u.x + k6 * u.z + k7 * u.x * u.z,
        k3 + k5 * u.x + k6 * u.y + k7 * u.x * u.y
      );
  return vec4(value, grad);
}

vec4 gnoise3dPeriodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec3 ip = ivec3(period);
  vec3 g000 = _zn_gradient3P(i + ivec3(0, 0, 0), ip);
  vec3 g100 = _zn_gradient3P(i + ivec3(1, 0, 0), ip);
  vec3 g010 = _zn_gradient3P(i + ivec3(0, 1, 0), ip);
  vec3 g110 = _zn_gradient3P(i + ivec3(1, 1, 0), ip);
  vec3 g001 = _zn_gradient3P(i + ivec3(0, 0, 1), ip);
  vec3 g101 = _zn_gradient3P(i + ivec3(1, 0, 1), ip);
  vec3 g011 = _zn_gradient3P(i + ivec3(0, 1, 1), ip);
  vec3 g111 = _zn_gradient3P(i + ivec3(1, 1, 1), ip);
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float k0 = v000;
  float k1 = v100 - v000;
  float k2 = v010 - v000;
  float k3 = v001 - v000;
  float k4 = v000 - v100 - v010 + v110;
  float k5 = v000 - v100 - v001 + v101;
  float k6 = v000 - v010 - v001 + v011;
  float k7 = -v000 + v100 + v010 + v001 - v110 - v101 - v011 + v111;
  float value = k0
    + k1 * u.x + k2 * u.y + k3 * u.z
    + k4 * u.x * u.y + k5 * u.x * u.z + k6 * u.y * u.z
    + k7 * u.x * u.y * u.z;
  vec3 grad = g000
    + u.x * (g100 - g000)
    + u.y * (g010 - g000)
    + u.z * (g001 - g000)
    + u.x * u.y * (g000 - g100 - g010 + g110)
    + u.x * u.z * (g000 - g100 - g001 + g101)
    + u.y * u.z * (g000 - g010 - g001 + g011)
    + u.x * u.y * u.z * (-g000 + g100 + g010 + g001 - g110 - g101 - g011 + g111)
    + du * vec3(
        k1 + k4 * u.y + k5 * u.z + k7 * u.y * u.z,
        k2 + k4 * u.x + k6 * u.z + k7 * u.x * u.z,
        k3 + k5 * u.x + k6 * u.y + k7 * u.x * u.y
      );
  return vec4(value, grad);
}

// 3D curl noise — a divergence-free vector field built from three
// gradient samples. Useful for fluid-look motion, smoke advection, etc.
vec3 curl3(vec3 p) {
  vec4 a = gnoise3d(p);
  vec4 b = gnoise3d(p + vec3(123.0, 234.0, 345.0));
  vec4 c = gnoise3d(p + vec3(456.0, 567.0, 678.0));
  return vec3(b.w - c.z, c.y - a.w, a.z - b.y);
}

#endif
`,S=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif

#ifndef ZED_NOISE_VALUE
#define ZED_NOISE_VALUE
// noiseValue.glsl
// Value and gradient noise on a regular integer lattice with quintic
// interpolation, in 2D and 3D, plus periodic variants.
//
// Output ranges:
//   vnoise* (value):     [0, 1]
//   gnoise* (gradient):  [-1, 1]   (caller can * 0.5 + 0.5 to remap)
//
// Self-contained: the <noiseValue> import bundles the <noiseHash> helpers
// ahead of this body (and is safe to combine with other <noise*> imports).

// === value noise (bilinear / quintic-smoothed scalar lattice) ===

float vnoise2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  float v00 = _zn_latticeHash2(i + ivec2(0, 0));
  float v10 = _zn_latticeHash2(i + ivec2(1, 0));
  float v01 = _zn_latticeHash2(i + ivec2(0, 1));
  float v11 = _zn_latticeHash2(i + ivec2(1, 1));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float vnoise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  float v000 = _zn_latticeHash3(i + ivec3(0, 0, 0));
  float v100 = _zn_latticeHash3(i + ivec3(1, 0, 0));
  float v010 = _zn_latticeHash3(i + ivec3(0, 1, 0));
  float v110 = _zn_latticeHash3(i + ivec3(1, 1, 0));
  float v001 = _zn_latticeHash3(i + ivec3(0, 0, 1));
  float v101 = _zn_latticeHash3(i + ivec3(1, 0, 1));
  float v011 = _zn_latticeHash3(i + ivec3(0, 1, 1));
  float v111 = _zn_latticeHash3(i + ivec3(1, 1, 1));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float vnoise2Periodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  ivec2 ip = ivec2(period);
  float v00 = _zn_latticeHash2P(i + ivec2(0, 0), ip);
  float v10 = _zn_latticeHash2P(i + ivec2(1, 0), ip);
  float v01 = _zn_latticeHash2P(i + ivec2(0, 1), ip);
  float v11 = _zn_latticeHash2P(i + ivec2(1, 1), ip);
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float vnoise3Periodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  ivec3 ip = ivec3(period);
  float v000 = _zn_latticeHash3P(i + ivec3(0, 0, 0), ip);
  float v100 = _zn_latticeHash3P(i + ivec3(1, 0, 0), ip);
  float v010 = _zn_latticeHash3P(i + ivec3(0, 1, 0), ip);
  float v110 = _zn_latticeHash3P(i + ivec3(1, 1, 0), ip);
  float v001 = _zn_latticeHash3P(i + ivec3(0, 0, 1), ip);
  float v101 = _zn_latticeHash3P(i + ivec3(1, 0, 1), ip);
  float v011 = _zn_latticeHash3P(i + ivec3(0, 1, 1), ip);
  float v111 = _zn_latticeHash3P(i + ivec3(1, 1, 1), ip);
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

// === gradient noise (Perlin-style, no permutation table) ===

float gnoise2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  vec2 g00 = _zn_gradient2(i + ivec2(0, 0));
  vec2 g10 = _zn_gradient2(i + ivec2(1, 0));
  vec2 g01 = _zn_gradient2(i + ivec2(0, 1));
  vec2 g11 = _zn_gradient2(i + ivec2(1, 1));
  float v00 = dot(g00, f - vec2(0.0, 0.0));
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float gnoise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  vec3 g000 = _zn_gradient3(i + ivec3(0, 0, 0));
  vec3 g100 = _zn_gradient3(i + ivec3(1, 0, 0));
  vec3 g010 = _zn_gradient3(i + ivec3(0, 1, 0));
  vec3 g110 = _zn_gradient3(i + ivec3(1, 1, 0));
  vec3 g001 = _zn_gradient3(i + ivec3(0, 0, 1));
  vec3 g101 = _zn_gradient3(i + ivec3(1, 0, 1));
  vec3 g011 = _zn_gradient3(i + ivec3(0, 1, 1));
  vec3 g111 = _zn_gradient3(i + ivec3(1, 1, 1));
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float gnoise2Periodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  ivec2 ip = ivec2(period);
  vec2 g00 = _zn_gradient2P(i + ivec2(0, 0), ip);
  vec2 g10 = _zn_gradient2P(i + ivec2(1, 0), ip);
  vec2 g01 = _zn_gradient2P(i + ivec2(0, 1), ip);
  vec2 g11 = _zn_gradient2P(i + ivec2(1, 1), ip);
  float v00 = dot(g00, f - vec2(0.0, 0.0));
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float gnoise3Periodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  ivec3 ip = ivec3(period);
  vec3 g000 = _zn_gradient3P(i + ivec3(0, 0, 0), ip);
  vec3 g100 = _zn_gradient3P(i + ivec3(1, 0, 0), ip);
  vec3 g010 = _zn_gradient3P(i + ivec3(0, 1, 0), ip);
  vec3 g110 = _zn_gradient3P(i + ivec3(1, 1, 0), ip);
  vec3 g001 = _zn_gradient3P(i + ivec3(0, 0, 1), ip);
  vec3 g101 = _zn_gradient3P(i + ivec3(1, 0, 1), ip);
  vec3 g011 = _zn_gradient3P(i + ivec3(0, 1, 1), ip);
  vec3 g111 = _zn_gradient3P(i + ivec3(1, 1, 1), ip);
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

#endif

#ifndef ZED_NOISE_PERLIN
#define ZED_NOISE_PERLIN
// noisePerlin.glsl
// Classic Perlin noise (cnoise) and periodic Perlin (cnoise*Periodic) in
// 2D and 3D. Internal helpers are namespaced with \`_znp_\` so this file
// does NOT conflict with <pnoise2D> / <pnoise3D> / <simplex3D> on
// permute / mod289 / taylorInvSqrt — you can include them all together
// without redefinition errors.
//
// Based on Stefan Gustavson's webgl-noise (MIT, 2011).
// https://github.com/ashima/webgl-noise

vec3 _znp_mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 _znp_mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 _znp_permute(vec4 x) {
  return _znp_mod289(((x * 34.0) + 1.0) * x);
}
vec4 _znp_taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}
vec2 _znp_fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _znp_fade(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise2(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = _znp_mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = _znp_permute(_znp_permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = _znp_taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01),
                                     dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _znp_fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float cnoise2Periodic(vec2 P, vec2 rep) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy);
  Pi = _znp_mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = _znp_permute(_znp_permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = _znp_taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01),
                                     dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _znp_fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float cnoise3(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = _znp_mod289(Pi0);
  Pi1 = _znp_mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = _znp_permute(_znp_permute(ix) + iy);
  vec4 ixy0 = _znp_permute(ixy + iz0);
  vec4 ixy1 = _znp_permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = _znp_taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010),
                                       dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = _znp_taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011),
                                       dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = _znp_fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110),
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

float cnoise3Periodic(vec3 P, vec3 rep) {
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
  Pi0 = _znp_mod289(Pi0);
  Pi1 = _znp_mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = _znp_permute(_znp_permute(ix) + iy);
  vec4 ixy0 = _znp_permute(ixy + iz0);
  vec4 ixy1 = _znp_permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = _znp_taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010),
                                       dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = _znp_taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011),
                                       dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = _znp_fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110),
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

#endif

#ifndef ZED_NOISE_FRACTAL
#define ZED_NOISE_FRACTAL
// noiseFractal.glsl
// Fractal Brownian motion (FBM), turbulence, ridge, and billow wrappers
// over Value, Gradient, and Perlin base noises, in 2D and 3D.
// (Simplex fractal wrappers live in <noiseSimplex> because Simplex needs
//  the upstream <simplex2D> / <simplex3D> which conflict with the
//  aggregator <noise>.)
//
// Octaves are clamped at NOISE_FBM_MAX_OCTAVES (override the define before
// include if you need more). The runtime \`octaves\` argument is honoured
// via an early \`if (i >= octaves) break;\` — the loop bound itself stays a
// compile-time constant so the GLSL compiler can fully unroll.
//
// Function naming: <shape><dim><BaseNoise>
//   fbm2Value, fbm3Gradient, turbulence2Perlin,
//   ridge3Value, billow2Gradient, ...
//
// Output ranges:
//   FBM / Gradient base:  ~[-1, 1]   (caller may remap)
//   FBM / Value base:     ~[ 0, 1]
//   FBM / Perlin base:    ~[-1, 1]
//   Turbulence:           ~[ 0, 1]
//   Ridge:                ~[ 0, offset^2]  (typically dominated by mid octaves)
//   Billow:               ~[-1, 1]
//
// Self-contained: the <noiseFractal> import bundles the <noiseHash>,
// <noiseValue> and <noisePerlin> helpers ahead of this body, covering every
// *Value / *Gradient / *Perlin variant. Safe to combine with other
// <noise*> imports. (Simplex fractal wrappers live in <noiseSimplex>.)

#ifndef NOISE_FBM_MAX_OCTAVES
#define NOISE_FBM_MAX_OCTAVES 8
#endif

// ============================================================
// FBM (sum of octaves, amplitude *= gain, frequency *= lacunarity)
// ============================================================

float fbm2Value(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * vnoise2(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Value(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * vnoise3(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm2Gradient(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * gnoise2(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Gradient(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * gnoise3(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm2Perlin(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * cnoise2(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Perlin(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * cnoise3(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

// ============================================================
// Turbulence (sum of |signed-noise|)
// ============================================================
// vnoise* is unsigned [0,1] — we remap to [-1,1] before abs() so the
// turbulence shape matches the Gradient/Perlin variants.

float turbulence2Value(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(vnoise2(p) * 2.0 - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Value(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(vnoise3(p) * 2.0 - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence2Gradient(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(gnoise2(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Gradient(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(gnoise3(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence2Perlin(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(cnoise2(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Perlin(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(cnoise3(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

// ============================================================
// Ridge ((offset - |noise|)^2, weighted by previous octave)
// ============================================================
// Musgrave-style ridged multifractal. The per-octave weight is the
// previous octave's ridge value, which sharpens features at higher
// frequencies. \`offset\` ≈ 1.0 produces classic ridges; lower offset
// flattens; higher offset accentuates.

float ridge2Value(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(vnoise2(p) * 2.0 - 1.0);
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Value(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(vnoise3(p) * 2.0 - 1.0);
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge2Gradient(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(gnoise2(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Gradient(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(gnoise3(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge2Perlin(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(cnoise2(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Perlin(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(cnoise3(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

// ============================================================
// Billow (sum of 2|signed-noise| - 1; puffy cloud-like)
// ============================================================

float billow2Value(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(vnoise2(p) * 2.0 - 1.0) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Value(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(vnoise3(p) * 2.0 - 1.0) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow2Gradient(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(gnoise2(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Gradient(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(gnoise3(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow2Perlin(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(cnoise2(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Perlin(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(cnoise3(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

#endif
`,C=`
#ifndef ZED_NOISE_HASH
#define ZED_NOISE_HASH
// noiseHash.glsl
// Stateless integer hash primitives for the <noise*> library.
// All public functions are deterministic — same input, same output, every
// driver. Private helpers prefix _zn_ to avoid collisions with existing
// includes (notably <pnoise2D> / <simplex3D> which define their own
// permute / mod289 / taylorInvSqrt).
//
// Range conventions:
//   - whiteN, zHashNN: outputs in [0, 1).
//   - *Periodic variants floor to integer lattice and wrap by the given
//     positive integer period before hashing.
//
// These helpers underpin the rest of the <noise*> library (noiseValue,
// noiseWorley, noiseDerivatives, noiseFractal). You don't need to include
// this file by hand — each of those imports bundles it (guarded) — but
// <noiseHash> is also a valid standalone import for the white/hash funcs.

// === private uint hash primitives (PCG-derived) ===

uint _zn_hash1u(uint x) {
  x ^= x >> 16u;
  x *= 0x21f0aaadu;
  x ^= x >> 15u;
  x *= 0x735a2d97u;
  x ^= x >> 15u;
  return x;
}

uint _zn_hashCombine(uint a, uint b) {
  return a ^ (b + 0x9e3779b9u + (a << 6) + (a >> 2));
}

uint _zn_hash2u(uvec2 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  return _zn_hash1u(h);
}
uint _zn_hash3u(uvec3 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  return _zn_hash1u(h);
}
uint _zn_hash4u(uvec4 v) {
  uint h = _zn_hash1u(v.x);
  h = _zn_hashCombine(h, _zn_hash1u(v.y));
  h = _zn_hashCombine(h, _zn_hash1u(v.z));
  h = _zn_hashCombine(h, _zn_hash1u(v.w));
  return _zn_hash1u(h);
}

// Map 24 low bits of the hash to [0, 1) — fits exactly in float32 mantissa.
float _zn_hashToFloat(uint h) {
  return float(h & 0x00ffffffu) / 16777216.0;
}

// === public float→float hashes (input bit-reinterpreted) ===

float zHash11(float p) {
  return _zn_hashToFloat(_zn_hash1u(floatBitsToUint(p)));
}
vec2 zHash22(vec2 p) {
  uint h = _zn_hash2u(floatBitsToUint(p));
  return vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
}
vec3 zHash33(vec3 p) {
  uint h  = _zn_hash3u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  return vec3(_zn_hashToFloat(h), _zn_hashToFloat(h2), _zn_hashToFloat(h3));
}
vec4 zHash44(vec4 p) {
  uint h  = _zn_hash4u(floatBitsToUint(p));
  uint h2 = _zn_hash1u(h);
  uint h3 = _zn_hash1u(h2);
  uint h4 = _zn_hash1u(h3);
  return vec4(_zn_hashToFloat(h),  _zn_hashToFloat(h2),
              _zn_hashToFloat(h3), _zn_hashToFloat(h4));
}

// === white noise (per-sample, no spatial coherence) ===

float white1(float p) { return zHash11(p); }
float white2(vec2 p)  { return zHash22(p).x; }
float white3(vec3 p)  { return zHash33(p).x; }
float white4(vec4 p)  { return zHash44(p).x; }

// === periodic white (lattice-aligned; tiles cleanly across \`period\`) ===

float white2Periodic(vec2 p, vec2 period) {
  vec2 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash2u(uvec2(w)));
}
float white3Periodic(vec3 p, vec3 period) {
  vec3 w = mod(mod(floor(p), period) + period, period);
  return _zn_hashToFloat(_zn_hash3u(uvec3(w)));
}

// === lattice helpers (consumed by other <noise*> files) ===
// Float-in / float-out hash of an integer-lattice cell. Coordinates are
// biased by 2^20 before casting so negative cells hash uniformly.

float _zn_latticeHash2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  return _zn_hashToFloat(_zn_hash2u(u));
}
float _zn_latticeHash3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  return _zn_hashToFloat(_zn_hash3u(u));
}
float _zn_latticeHash2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_latticeHash2(w);
}
float _zn_latticeHash3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_latticeHash3(w);
}

// Random 2D / 3D gradient at lattice cell (unit-length). Used by
// gradient noise + analytical-derivative variants.

vec2 _zn_gradient2(ivec2 i) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  float a = _zn_hashToFloat(h) * 6.283185307179587;
  return vec2(cos(a), sin(a));
}
vec3 _zn_gradient3(ivec3 i) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  float h1 = _zn_hashToFloat(h);
  float h2 = _zn_hashToFloat(_zn_hash1u(h));
  float theta = h1 * 6.283185307179587;
  float phi = acos(2.0 * h2 - 1.0);
  float sp = sin(phi);
  return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}
vec2 _zn_gradient2P(ivec2 i, ivec2 period) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_gradient2(w);
}
vec3 _zn_gradient3P(ivec3 i, ivec3 period) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_gradient3(w);
}

// Shared quintic smoothing curve (C2-continuous; same formula used by
// the upstream pnoise libraries' \`fade\` helper, but namespaced here).
float _zn_quintic1(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec2 _zn_quintic2(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _zn_quintic3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

#endif

#ifndef ZED_NOISE_VALUE
#define ZED_NOISE_VALUE
// noiseValue.glsl
// Value and gradient noise on a regular integer lattice with quintic
// interpolation, in 2D and 3D, plus periodic variants.
//
// Output ranges:
//   vnoise* (value):     [0, 1]
//   gnoise* (gradient):  [-1, 1]   (caller can * 0.5 + 0.5 to remap)
//
// Self-contained: the <noiseValue> import bundles the <noiseHash> helpers
// ahead of this body (and is safe to combine with other <noise*> imports).

// === value noise (bilinear / quintic-smoothed scalar lattice) ===

float vnoise2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  float v00 = _zn_latticeHash2(i + ivec2(0, 0));
  float v10 = _zn_latticeHash2(i + ivec2(1, 0));
  float v01 = _zn_latticeHash2(i + ivec2(0, 1));
  float v11 = _zn_latticeHash2(i + ivec2(1, 1));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float vnoise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  float v000 = _zn_latticeHash3(i + ivec3(0, 0, 0));
  float v100 = _zn_latticeHash3(i + ivec3(1, 0, 0));
  float v010 = _zn_latticeHash3(i + ivec3(0, 1, 0));
  float v110 = _zn_latticeHash3(i + ivec3(1, 1, 0));
  float v001 = _zn_latticeHash3(i + ivec3(0, 0, 1));
  float v101 = _zn_latticeHash3(i + ivec3(1, 0, 1));
  float v011 = _zn_latticeHash3(i + ivec3(0, 1, 1));
  float v111 = _zn_latticeHash3(i + ivec3(1, 1, 1));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float vnoise2Periodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  ivec2 ip = ivec2(period);
  float v00 = _zn_latticeHash2P(i + ivec2(0, 0), ip);
  float v10 = _zn_latticeHash2P(i + ivec2(1, 0), ip);
  float v01 = _zn_latticeHash2P(i + ivec2(0, 1), ip);
  float v11 = _zn_latticeHash2P(i + ivec2(1, 1), ip);
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float vnoise3Periodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  ivec3 ip = ivec3(period);
  float v000 = _zn_latticeHash3P(i + ivec3(0, 0, 0), ip);
  float v100 = _zn_latticeHash3P(i + ivec3(1, 0, 0), ip);
  float v010 = _zn_latticeHash3P(i + ivec3(0, 1, 0), ip);
  float v110 = _zn_latticeHash3P(i + ivec3(1, 1, 0), ip);
  float v001 = _zn_latticeHash3P(i + ivec3(0, 0, 1), ip);
  float v101 = _zn_latticeHash3P(i + ivec3(1, 0, 1), ip);
  float v011 = _zn_latticeHash3P(i + ivec3(0, 1, 1), ip);
  float v111 = _zn_latticeHash3P(i + ivec3(1, 1, 1), ip);
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

// === gradient noise (Perlin-style, no permutation table) ===

float gnoise2(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  vec2 g00 = _zn_gradient2(i + ivec2(0, 0));
  vec2 g10 = _zn_gradient2(i + ivec2(1, 0));
  vec2 g01 = _zn_gradient2(i + ivec2(0, 1));
  vec2 g11 = _zn_gradient2(i + ivec2(1, 1));
  float v00 = dot(g00, f - vec2(0.0, 0.0));
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float gnoise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  vec3 g000 = _zn_gradient3(i + ivec3(0, 0, 0));
  vec3 g100 = _zn_gradient3(i + ivec3(1, 0, 0));
  vec3 g010 = _zn_gradient3(i + ivec3(0, 1, 0));
  vec3 g110 = _zn_gradient3(i + ivec3(1, 1, 0));
  vec3 g001 = _zn_gradient3(i + ivec3(0, 0, 1));
  vec3 g101 = _zn_gradient3(i + ivec3(1, 0, 1));
  vec3 g011 = _zn_gradient3(i + ivec3(0, 1, 1));
  vec3 g111 = _zn_gradient3(i + ivec3(1, 1, 1));
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float gnoise2Periodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u = _zn_quintic2(f);
  ivec2 ip = ivec2(period);
  vec2 g00 = _zn_gradient2P(i + ivec2(0, 0), ip);
  vec2 g10 = _zn_gradient2P(i + ivec2(1, 0), ip);
  vec2 g01 = _zn_gradient2P(i + ivec2(0, 1), ip);
  vec2 g11 = _zn_gradient2P(i + ivec2(1, 1), ip);
  float v00 = dot(g00, f - vec2(0.0, 0.0));
  float v10 = dot(g10, f - vec2(1.0, 0.0));
  float v01 = dot(g01, f - vec2(0.0, 1.0));
  float v11 = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float gnoise3Periodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u = _zn_quintic3(f);
  ivec3 ip = ivec3(period);
  vec3 g000 = _zn_gradient3P(i + ivec3(0, 0, 0), ip);
  vec3 g100 = _zn_gradient3P(i + ivec3(1, 0, 0), ip);
  vec3 g010 = _zn_gradient3P(i + ivec3(0, 1, 0), ip);
  vec3 g110 = _zn_gradient3P(i + ivec3(1, 1, 0), ip);
  vec3 g001 = _zn_gradient3P(i + ivec3(0, 0, 1), ip);
  vec3 g101 = _zn_gradient3P(i + ivec3(1, 0, 1), ip);
  vec3 g011 = _zn_gradient3P(i + ivec3(0, 1, 1), ip);
  vec3 g111 = _zn_gradient3P(i + ivec3(1, 1, 1), ip);
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float x00 = mix(v000, v100, u.x);
  float x10 = mix(v010, v110, u.x);
  float x01 = mix(v001, v101, u.x);
  float x11 = mix(v011, v111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

#endif

#ifndef ZED_NOISE_WORLEY
#define ZED_NOISE_WORLEY
// noiseWorley.glsl
// Worley (cellular) noise and Voronoi variants. 2D and 3D, with periodic
// wrapping. Each cell of an integer lattice hosts one randomly-placed
// feature point; the noise value at any sample point is derived from
// the distance(s) to the nearest feature point(s).
//
// Returns:
//   worley*       : vec2(F1, F2)  — distances to 1st and 2nd nearest points
//   voronoi2      : vec2(F1, cellHash)  — F1 plus [0,1) hash of the closest cell
//   voronoi3WithColor : vec3(F1, cellHash, F2 - F1)
//                       — third channel is the classic "Voronoi edge" metric
//                         (≈0 on cell borders, large inside)
//
// jitter ∈ [0, 1]:
//   0.0 — feature points sit at cell centres (perfectly regular grid;
//         useful for flat-shaded cell-id art)
//   1.0 — feature points may sit anywhere inside the cell (standard Worley)
//
// Self-contained: the <noiseWorley> import bundles the <noiseHash> helpers
// ahead of this body (and is safe to combine with other <noise*> imports).

vec2 _zn_cellPoint2(ivec2 i, float jitter) {
  uvec2 u = uvec2(i + ivec2(0x100000));
  uint h = _zn_hash2u(u);
  vec2 r = vec2(_zn_hashToFloat(h), _zn_hashToFloat(_zn_hash1u(h)));
  return vec2(0.5) + (r - vec2(0.5)) * jitter;
}
vec3 _zn_cellPoint3(ivec3 i, float jitter) {
  uvec3 u = uvec3(i + ivec3(0x100000));
  uint h = _zn_hash3u(u);
  vec3 r = vec3(
    _zn_hashToFloat(h),
    _zn_hashToFloat(_zn_hash1u(h)),
    _zn_hashToFloat(_zn_hash1u(_zn_hash1u(h)))
  );
  return vec3(0.5) + (r - vec3(0.5)) * jitter;
}
vec2 _zn_cellPoint2P(ivec2 i, ivec2 period, float jitter) {
  ivec2 w = ivec2(mod(mod(vec2(i), vec2(period)) + vec2(period), vec2(period)));
  return _zn_cellPoint2(w, jitter);
}
vec3 _zn_cellPoint3P(ivec3 i, ivec3 period, float jitter) {
  ivec3 w = ivec3(mod(mod(vec3(i), vec3(period)) + vec3(period), vec3(period)));
  return _zn_cellPoint3(w, jitter);
}

// === 2D Worley (F1, F2) ===

vec2 worley2(vec2 p, float jitter) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dy = -1; dy <= 1; ++dy) {
    for (int dx = -1; dx <= 1; ++dx) {
      ivec2 ofs = ivec2(dx, dy);
      vec2 cp = vec2(ofs) + _zn_cellPoint2(i + ofs, jitter);
      vec2 d = cp - f;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; f1 = dd; }
      else if (dd < f2) { f2 = dd; }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

vec2 worley2Periodic(vec2 p, vec2 period, float jitter) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  ivec2 ip = ivec2(period);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dy = -1; dy <= 1; ++dy) {
    for (int dx = -1; dx <= 1; ++dx) {
      ivec2 ofs = ivec2(dx, dy);
      vec2 cp = vec2(ofs) + _zn_cellPoint2P(i + ofs, ip, jitter);
      vec2 d = cp - f;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; f1 = dd; }
      else if (dd < f2) { f2 = dd; }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

// === 3D Worley (F1, F2) ===

vec2 worley3(vec3 p, float jitter) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dz = -1; dz <= 1; ++dz) {
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        ivec3 ofs = ivec3(dx, dy, dz);
        vec3 cp = vec3(ofs) + _zn_cellPoint3(i + ofs, jitter);
        vec3 d = cp - f;
        float dd = dot(d, d);
        if (dd < f1) { f2 = f1; f1 = dd; }
        else if (dd < f2) { f2 = dd; }
      }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

vec2 worley3Periodic(vec3 p, vec3 period, float jitter) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  ivec3 ip = ivec3(period);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int dz = -1; dz <= 1; ++dz) {
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        ivec3 ofs = ivec3(dx, dy, dz);
        vec3 cp = vec3(ofs) + _zn_cellPoint3P(i + ofs, ip, jitter);
        vec3 d = cp - f;
        float dd = dot(d, d);
        if (dd < f1) { f2 = f1; f1 = dd; }
        else if (dd < f2) { f2 = dd; }
      }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

// === Voronoi (F1 + cell info) ===

vec2 voronoi2(vec2 p, float jitter) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  float f1 = 9.0;
  ivec2 bestCell = ivec2(0);
  for (int dy = -1; dy <= 1; ++dy) {
    for (int dx = -1; dx <= 1; ++dx) {
      ivec2 ofs = ivec2(dx, dy);
      vec2 cp = vec2(ofs) + _zn_cellPoint2(i + ofs, jitter);
      vec2 d = cp - f;
      float dd = dot(d, d);
      if (dd < f1) { f1 = dd; bestCell = i + ofs; }
    }
  }
  return vec2(sqrt(f1), _zn_latticeHash2(bestCell));
}

vec3 voronoi3WithColor(vec3 p, float jitter) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  float f1 = 9.0;
  float f2 = 9.0;
  ivec3 bestCell = ivec3(0);
  for (int dz = -1; dz <= 1; ++dz) {
    for (int dy = -1; dy <= 1; ++dy) {
      for (int dx = -1; dx <= 1; ++dx) {
        ivec3 ofs = ivec3(dx, dy, dz);
        vec3 cp = vec3(ofs) + _zn_cellPoint3(i + ofs, jitter);
        vec3 d = cp - f;
        float dd = dot(d, d);
        if (dd < f1) { f2 = f1; f1 = dd; bestCell = i + ofs; }
        else if (dd < f2) { f2 = dd; }
      }
    }
  }
  float f1s = sqrt(f1);
  float f2s = sqrt(f2);
  return vec3(f1s, _zn_latticeHash3(bestCell), f2s - f1s);
}

#endif

#ifndef ZED_NOISE_PERLIN
#define ZED_NOISE_PERLIN
// noisePerlin.glsl
// Classic Perlin noise (cnoise) and periodic Perlin (cnoise*Periodic) in
// 2D and 3D. Internal helpers are namespaced with \`_znp_\` so this file
// does NOT conflict with <pnoise2D> / <pnoise3D> / <simplex3D> on
// permute / mod289 / taylorInvSqrt — you can include them all together
// without redefinition errors.
//
// Based on Stefan Gustavson's webgl-noise (MIT, 2011).
// https://github.com/ashima/webgl-noise

vec3 _znp_mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 _znp_mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 _znp_permute(vec4 x) {
  return _znp_mod289(((x * 34.0) + 1.0) * x);
}
vec4 _znp_taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}
vec2 _znp_fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 _znp_fade(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise2(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = _znp_mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = _znp_permute(_znp_permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = _znp_taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01),
                                     dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _znp_fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float cnoise2Periodic(vec2 P, vec2 rep) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy);
  Pi = _znp_mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = _znp_permute(_znp_permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = _znp_taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01),
                                     dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _znp_fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float cnoise3(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = _znp_mod289(Pi0);
  Pi1 = _znp_mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = _znp_permute(_znp_permute(ix) + iy);
  vec4 ixy0 = _znp_permute(ixy + iz0);
  vec4 ixy1 = _znp_permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = _znp_taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010),
                                       dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = _znp_taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011),
                                       dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = _znp_fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110),
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

float cnoise3Periodic(vec3 P, vec3 rep) {
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
  Pi0 = _znp_mod289(Pi0);
  Pi1 = _znp_mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);
  vec4 ixy = _znp_permute(_znp_permute(ix) + iy);
  vec4 ixy0 = _znp_permute(ixy + iz0);
  vec4 ixy1 = _znp_permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = _znp_taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010),
                                       dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = _znp_taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011),
                                       dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = _znp_fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110),
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

#endif

#ifndef ZED_NOISE_DERIVATIVES
#define ZED_NOISE_DERIVATIVES
// noiseDerivatives.glsl
// Gradient noise with analytical derivatives — no finite differences,
// no screen-space dFdx/dFdy. Useful for normal-map generation, flow
// fields, and curl noise. Same base gradient noise as
// <noiseValue>::gnoise2/gnoise3.
//
// Returns vec4(value, ddx, ddy, ddz). 2D variants set ddz to 0.
//
// Derivation: Inigo Quilez's analytic-noise formula
// (https://iquilezles.org/articles/morenoise/), adapted to our hashes
// and gradient construction.
//
// Self-contained: the <noiseDerivatives> import bundles the <noiseHash>
// helpers ahead of this body (safe to combine with other <noise*> imports).

vec4 gnoise2d(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = _zn_gradient2(i + ivec2(0, 0));
  vec2 gb = _zn_gradient2(i + ivec2(1, 0));
  vec2 gc = _zn_gradient2(i + ivec2(0, 1));
  vec2 gd = _zn_gradient2(i + ivec2(1, 1));
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float value = va + u.x * (vb - va) + u.y * (vc - va)
              + u.x * u.y * (va - vb - vc + vd);
  vec2 grad = ga + u.x * (gb - ga) + u.y * (gc - ga)
            + u.x * u.y * (ga - gb - gc + gd)
            + du * (vec2(vb - va, vc - va) + u.yx * (va - vb - vc + vd));
  return vec4(value, grad.x, grad.y, 0.0);
}

vec4 gnoise2dPeriodic(vec2 p, vec2 period) {
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec2 ip = ivec2(period);
  vec2 ga = _zn_gradient2P(i + ivec2(0, 0), ip);
  vec2 gb = _zn_gradient2P(i + ivec2(1, 0), ip);
  vec2 gc = _zn_gradient2P(i + ivec2(0, 1), ip);
  vec2 gd = _zn_gradient2P(i + ivec2(1, 1), ip);
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float value = va + u.x * (vb - va) + u.y * (vc - va)
              + u.x * u.y * (va - vb - vc + vd);
  vec2 grad = ga + u.x * (gb - ga) + u.y * (gc - ga)
            + u.x * u.y * (ga - gb - gc + gd)
            + du * (vec2(vb - va, vc - va) + u.yx * (va - vb - vc + vd));
  return vec4(value, grad.x, grad.y, 0.0);
}

vec4 gnoise3d(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec3 g000 = _zn_gradient3(i + ivec3(0, 0, 0));
  vec3 g100 = _zn_gradient3(i + ivec3(1, 0, 0));
  vec3 g010 = _zn_gradient3(i + ivec3(0, 1, 0));
  vec3 g110 = _zn_gradient3(i + ivec3(1, 1, 0));
  vec3 g001 = _zn_gradient3(i + ivec3(0, 0, 1));
  vec3 g101 = _zn_gradient3(i + ivec3(1, 0, 1));
  vec3 g011 = _zn_gradient3(i + ivec3(0, 1, 1));
  vec3 g111 = _zn_gradient3(i + ivec3(1, 1, 1));
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float k0 = v000;
  float k1 = v100 - v000;
  float k2 = v010 - v000;
  float k3 = v001 - v000;
  float k4 = v000 - v100 - v010 + v110;
  float k5 = v000 - v100 - v001 + v101;
  float k6 = v000 - v010 - v001 + v011;
  float k7 = -v000 + v100 + v010 + v001 - v110 - v101 - v011 + v111;
  float value = k0
    + k1 * u.x + k2 * u.y + k3 * u.z
    + k4 * u.x * u.y + k5 * u.x * u.z + k6 * u.y * u.z
    + k7 * u.x * u.y * u.z;
  vec3 grad = g000
    + u.x * (g100 - g000)
    + u.y * (g010 - g000)
    + u.z * (g001 - g000)
    + u.x * u.y * (g000 - g100 - g010 + g110)
    + u.x * u.z * (g000 - g100 - g001 + g101)
    + u.y * u.z * (g000 - g010 - g001 + g011)
    + u.x * u.y * u.z * (-g000 + g100 + g010 + g001 - g110 - g101 - g011 + g111)
    + du * vec3(
        k1 + k4 * u.y + k5 * u.z + k7 * u.y * u.z,
        k2 + k4 * u.x + k6 * u.z + k7 * u.x * u.z,
        k3 + k5 * u.x + k6 * u.y + k7 * u.x * u.y
      );
  return vec4(value, grad);
}

vec4 gnoise3dPeriodic(vec3 p, vec3 period) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - vec3(i);
  vec3 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec3 ip = ivec3(period);
  vec3 g000 = _zn_gradient3P(i + ivec3(0, 0, 0), ip);
  vec3 g100 = _zn_gradient3P(i + ivec3(1, 0, 0), ip);
  vec3 g010 = _zn_gradient3P(i + ivec3(0, 1, 0), ip);
  vec3 g110 = _zn_gradient3P(i + ivec3(1, 1, 0), ip);
  vec3 g001 = _zn_gradient3P(i + ivec3(0, 0, 1), ip);
  vec3 g101 = _zn_gradient3P(i + ivec3(1, 0, 1), ip);
  vec3 g011 = _zn_gradient3P(i + ivec3(0, 1, 1), ip);
  vec3 g111 = _zn_gradient3P(i + ivec3(1, 1, 1), ip);
  float v000 = dot(g000, f - vec3(0.0, 0.0, 0.0));
  float v100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
  float v010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
  float v110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
  float v001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
  float v101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
  float v011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
  float v111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
  float k0 = v000;
  float k1 = v100 - v000;
  float k2 = v010 - v000;
  float k3 = v001 - v000;
  float k4 = v000 - v100 - v010 + v110;
  float k5 = v000 - v100 - v001 + v101;
  float k6 = v000 - v010 - v001 + v011;
  float k7 = -v000 + v100 + v010 + v001 - v110 - v101 - v011 + v111;
  float value = k0
    + k1 * u.x + k2 * u.y + k3 * u.z
    + k4 * u.x * u.y + k5 * u.x * u.z + k6 * u.y * u.z
    + k7 * u.x * u.y * u.z;
  vec3 grad = g000
    + u.x * (g100 - g000)
    + u.y * (g010 - g000)
    + u.z * (g001 - g000)
    + u.x * u.y * (g000 - g100 - g010 + g110)
    + u.x * u.z * (g000 - g100 - g001 + g101)
    + u.y * u.z * (g000 - g010 - g001 + g011)
    + u.x * u.y * u.z * (-g000 + g100 + g010 + g001 - g110 - g101 - g011 + g111)
    + du * vec3(
        k1 + k4 * u.y + k5 * u.z + k7 * u.y * u.z,
        k2 + k4 * u.x + k6 * u.z + k7 * u.x * u.z,
        k3 + k5 * u.x + k6 * u.y + k7 * u.x * u.y
      );
  return vec4(value, grad);
}

// 3D curl noise — a divergence-free vector field built from three
// gradient samples. Useful for fluid-look motion, smoke advection, etc.
vec3 curl3(vec3 p) {
  vec4 a = gnoise3d(p);
  vec4 b = gnoise3d(p + vec3(123.0, 234.0, 345.0));
  vec4 c = gnoise3d(p + vec3(456.0, 567.0, 678.0));
  return vec3(b.w - c.z, c.y - a.w, a.z - b.y);
}

#endif

#ifndef ZED_NOISE_FRACTAL
#define ZED_NOISE_FRACTAL
// noiseFractal.glsl
// Fractal Brownian motion (FBM), turbulence, ridge, and billow wrappers
// over Value, Gradient, and Perlin base noises, in 2D and 3D.
// (Simplex fractal wrappers live in <noiseSimplex> because Simplex needs
//  the upstream <simplex2D> / <simplex3D> which conflict with the
//  aggregator <noise>.)
//
// Octaves are clamped at NOISE_FBM_MAX_OCTAVES (override the define before
// include if you need more). The runtime \`octaves\` argument is honoured
// via an early \`if (i >= octaves) break;\` — the loop bound itself stays a
// compile-time constant so the GLSL compiler can fully unroll.
//
// Function naming: <shape><dim><BaseNoise>
//   fbm2Value, fbm3Gradient, turbulence2Perlin,
//   ridge3Value, billow2Gradient, ...
//
// Output ranges:
//   FBM / Gradient base:  ~[-1, 1]   (caller may remap)
//   FBM / Value base:     ~[ 0, 1]
//   FBM / Perlin base:    ~[-1, 1]
//   Turbulence:           ~[ 0, 1]
//   Ridge:                ~[ 0, offset^2]  (typically dominated by mid octaves)
//   Billow:               ~[-1, 1]
//
// Self-contained: the <noiseFractal> import bundles the <noiseHash>,
// <noiseValue> and <noisePerlin> helpers ahead of this body, covering every
// *Value / *Gradient / *Perlin variant. Safe to combine with other
// <noise*> imports. (Simplex fractal wrappers live in <noiseSimplex>.)

#ifndef NOISE_FBM_MAX_OCTAVES
#define NOISE_FBM_MAX_OCTAVES 8
#endif

// ============================================================
// FBM (sum of octaves, amplitude *= gain, frequency *= lacunarity)
// ============================================================

float fbm2Value(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * vnoise2(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Value(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * vnoise3(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm2Gradient(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * gnoise2(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Gradient(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * gnoise3(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm2Perlin(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * cnoise2(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float fbm3Perlin(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * cnoise3(p);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

// ============================================================
// Turbulence (sum of |signed-noise|)
// ============================================================
// vnoise* is unsigned [0,1] — we remap to [-1,1] before abs() so the
// turbulence shape matches the Gradient/Perlin variants.

float turbulence2Value(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(vnoise2(p) * 2.0 - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Value(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(vnoise3(p) * 2.0 - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence2Gradient(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(gnoise2(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Gradient(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(gnoise3(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence2Perlin(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(cnoise2(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float turbulence3Perlin(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * abs(cnoise3(p));
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

// ============================================================
// Ridge ((offset - |noise|)^2, weighted by previous octave)
// ============================================================
// Musgrave-style ridged multifractal. The per-octave weight is the
// previous octave's ridge value, which sharpens features at higher
// frequencies. \`offset\` ≈ 1.0 produces classic ridges; lower offset
// flattens; higher offset accentuates.

float ridge2Value(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(vnoise2(p) * 2.0 - 1.0);
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Value(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(vnoise3(p) * 2.0 - 1.0);
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge2Gradient(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(gnoise2(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Gradient(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(gnoise3(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge2Perlin(vec2 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(cnoise2(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float ridge3Perlin(vec3 p, int octaves, float lacunarity, float gain, float offset) {
  float s = 0.0, a = 1.0, prev = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    float r = offset - abs(cnoise3(p));
    r = r * r * prev;
    s += a * r;
    prev = r;
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

// ============================================================
// Billow (sum of 2|signed-noise| - 1; puffy cloud-like)
// ============================================================

float billow2Value(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(vnoise2(p) * 2.0 - 1.0) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Value(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(vnoise3(p) * 2.0 - 1.0) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow2Gradient(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(gnoise2(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Gradient(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(gnoise3(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow2Perlin(vec2 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(cnoise2(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}
float billow3Perlin(vec3 p, int octaves, float lacunarity, float gain) {
  float s = 0.0, a = 1.0, n = 0.0;
  for (int i = 0; i < NOISE_FBM_MAX_OCTAVES; ++i) {
    if (i >= octaves) break;
    s += a * (2.0 * abs(cnoise3(p)) - 1.0);
    n += a;
    p *= lacunarity;
    a *= gain;
  }
  return s / max(n, 1e-6);
}

#endif
`,w={commonDefs:n,gammaCorrect:r,functions:i,computeNormal:a,simplex2D:o,simplex3D:s,simplex4D:c,rotate2D:l,noises:u,pnoise2D:d,pnoise3D:f,pnoise4D:p,splines:m,hdr:h,noiseHash:g,noiseValue:_,noiseWorley:v,noiseSimplex:y,noisePerlin:b,noiseDerivatives:x,noiseFractal:S,noise:C};export{t};