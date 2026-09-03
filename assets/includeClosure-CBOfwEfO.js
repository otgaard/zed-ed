var e={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:3,KeyW:4,KeyA:5,KeyS:6,KeyD:7,Space:8,Enter:9,Escape:10,Tab:11,Backspace:12,KeyQ:13,KeyE:14,KeyR:15,KeyF:16,KeyZ:17,KeyX:18,KeyC:19,KeyV:20,Digit0:21,Digit1:22,Digit2:23,Digit3:24,Digit4:25,Digit5:26,Digit6:27,Digit7:28,Digit8:29,Digit9:30},t={ArrowLeft:`KEY_ARROW_LEFT`,ArrowRight:`KEY_ARROW_RIGHT`,ArrowUp:`KEY_ARROW_UP`,ArrowDown:`KEY_ARROW_DOWN`,KeyW:`KEY_W`,KeyA:`KEY_A`,KeyS:`KEY_S`,KeyD:`KEY_D`,Space:`KEY_SPACE`,Enter:`KEY_ENTER`,Escape:`KEY_ESCAPE`,Tab:`KEY_TAB`,Backspace:`KEY_BACKSPACE`,KeyQ:`KEY_Q`,KeyE:`KEY_E`,KeyR:`KEY_R`,KeyF:`KEY_F`,KeyZ:`KEY_Z`,KeyX:`KEY_X`,KeyC:`KEY_C`,KeyV:`KEY_V`,Digit0:`KEY_0`,Digit1:`KEY_1`,Digit2:`KEY_2`,Digit3:`KEY_3`,Digit4:`KEY_4`,Digit5:`KEY_5`,Digit6:`KEY_6`,Digit7:`KEY_7`,Digit8:`KEY_8`,Digit9:`KEY_9`},n={ShiftLeft:0,ShiftRight:0,ControlLeft:1,ControlRight:1,AltLeft:2,AltRight:2,MetaLeft:3,MetaRight:3};function r(t){let n=0,r=0;for(let i of t){let t=e[i];t!==void 0&&(t<32?n=(n|1<<t)>>>0:r=(r|1<<t-32)>>>0)}return{lo:n,hi:r}}function i(e){let t=0;for(let r of e){let e=n[r];e!==void 0&&(t=(t|1<<e)>>>0)}return t>>>0}function a(e,t){return(i(e)|(t&255)<<8)>>>0}function o(){let n=[];for(let r of Object.keys(e)){let i=t[r];i&&n.push(`#define ${i} ${e[r]}u`)}return n.push(`#define MOD_SHIFT 1u`),n.push(`#define MOD_CTRL 2u`),n.push(`#define MOD_ALT 4u`),n.push(`#define MOD_META 8u`),n.join(`
`)}var s=`layout(std140) uniform ShaderData {
vec4 uResolution;
vec4 uTimeData;
vec4 uMouseData;
vec4 uOutputBuffer;
};
#define screen       uResolution.xy
#define AR           uResolution.z
#define dPR          uResolution.w
#define time         uTimeData.x
#define dt           uTimeData.y
#define frameIndex   uTimeData.z
#define mousePos     uMouseData.xy
#define mouseBtn     uMouseData.z
#define outputScreen uOutputBuffer.xy
#define outputAR     uOutputBuffer.z`,c=`layout(std140) uniform InputData {
vec4 uWheel;
vec4 uPinch;
uvec4 uKeys;
vec4 uTouch[8];
};
#define wheel       uWheel.xy
#define wheelDelta  uWheel.zw
#define pinchScale  uPinch.x
#define pinchDelta  uPinch.y
#define pinchActive (uPinch.z > 0.5)
#define touchCount  int(uPinch.w)
#define mods        uKeys.x
${o()}
bool keyDown(uint k) {
return k < 32u ? (uKeys.y & (1u << k)) != 0u
: (uKeys.z & (1u << (k - 32u))) != 0u;
}
bool modDown(uint m) { return (uKeys.x & m) != 0u; }
vec2 touchPos(int i) { return uTouch[i].xy; }
bool touchActive(int i) { return uTouch[i].w > 0.5; }`,l=`const vec2 position[] = vec2[3](
vec2(-1., -1.),
vec2(3., -1.),
vec2(-1., 3.)
);
out vec2 uv;
#ifdef EDITOR
uniform vec4 uEditView;
#endif
void main() {
gl_Position = vec4(position[gl_VertexID], 0., 1.);
#ifdef EDITOR
gl_Position = vec4(gl_Position.xy * uEditView.xy + gl_Position.w * uEditView.zw, gl_Position.zw);
#endif
uv = position[gl_VertexID] * 0.5 + 0.5;
}`,u=`${s}
in vec2 uv;
#include <renderMain>
void main() {
renderMain(gl_FragCoord.xy);
}`,d=`#include <commonDefs>
out vec4 fragColour;
void renderMain(vec2 fragCoord) {
fragColour = vec4(uv, 1.0 - uv.x, 1.0);
}`,f=`default.frag`;function p(e){return/\bvoid\s+renderMain\s*\(/.test(e)?null:/\bvoid\s+renderImage\s*\(/.test(e)?"`renderImage(out vec4, vec2)` is no longer supported — rename it to `void renderMain(vec2 fragCoord)` and declare `out vec4 fragColour;` yourself (the wrapper no longer injects it). Write directly to each declared `out` variable by name.":"Define `void renderMain(vec2 fragCoord) { ... }` and assign to each declared `out` variable by name. Single-output shaders also need a `out vec4 fragColour;` (or any `out vecK` of your choice)."}var m=[`lite`,`balanced`,`high`],h={lite:0,balanced:1,high:2};function g(e){return typeof e==`string`&&m.includes(e)?e:null}var _=47,v=42,y=256,b=new Map;function x(e){return e.replace(/[^\n\r]/g,` `)}function S(e){if(!e.includes(`/`))return e;let t=e.length,n=``,r=0,i=0,a=!1;for(;i<t;){let o=e.indexOf(`/`,i);if(o<0)break;i=o;let s=e.charCodeAt(i+1);if(s===_){let o=e.indexOf(`
`,i+2),s=o<0?t:o;n+=e.slice(r,i)+` `.repeat(s-i),r=s,i=s,a=!0;continue}if(s===v){let o=e.indexOf(`*/`,i+2),s=o<0?t:o+2;n+=e.slice(r,i)+x(e.slice(i,s)),r=s,i=s,a=!0;continue}i++}return a?n+e.slice(r):e}function C(e){let t=b.get(e);if(t!==void 0)return b.delete(e),b.set(e,t),t;let n=S(e);if(b.size>=y){let e=b.keys().next().value;e!==void 0&&b.delete(e)}return b.set(e,n),n}function w(e,t,n,r){let i=0;for(;i<r.length;){let e=r.charCodeAt(i);if(e!==32&&e!==9&&e!==10&&e!==13)break;i++}return i>=r.length?!1:t.charCodeAt(n+i)!==e.charCodeAt(n+i)}var T=String.raw`^[ \t]*#include\s*<([^>]+)>[ \t]*$`,E=new RegExp(T,`gm`),D=new RegExp(T),O=32,k=512,A=new Map;function j(e){let t=A.get(e);if(t)return t;let n=[],r=C(e);for(let t of e.matchAll(E))w(e,r,t.index,t[0])||n.push(t[1]);if(A.size>=k){let e=A.keys().next().value;e!==void 0&&A.delete(e)}return A.set(e,n),n}function M(e,t){return t[e]??t[`${e}.glsl`]}function N(e,t){let n=Math.max(0,Math.min(t,e.length)),r=e.lastIndexOf(`
`,n-1)+1,i=e.indexOf(`
`,r),a=i<0?e.length:i,o=D.exec(e.slice(r,a));if(!o)return null;let s=r+o.index;if(w(e,C(e),s,o[0]))return null;let c=o[0].length-o[0].trimStart().length;return{name:o[1],from:s+c,to:s+o[0].trimEnd().length}}function P(e,t){let n=[],r=[],i=[],a=[],o=new Set,s=new Set,c=new Set,l=[],u=(e,d)=>{if(!(d>O))for(let f of j(e)){let e=M(f,t);if(e===void 0){s.has(f)||(s.add(f),i.push(f));continue}if(c.has(e)){a.push([...l,f]);continue}o.has(e)||(o.add(e),n.push(e),r.push(f),c.add(e),l.push(f),u(e,d+1),l.pop(),c.delete(e))}};return u(e,0),{bodies:n,names:r,unresolved:i,cycles:a}}function F(e,t,n){let r=n.endsWith(`.glsl`)?n.slice(0,-5):n,i=P(e,t),a=M(n,t);return a!==void 0&&i.bodies.includes(a)?!0:i.unresolved.some(e=>e===n||e===r)}export{l as _,P as a,h as c,f as d,c as f,p as g,u as h,F as i,m as l,d as m,j as n,C as o,s as p,M as r,w as s,N as t,g as u,r as v,a as y};