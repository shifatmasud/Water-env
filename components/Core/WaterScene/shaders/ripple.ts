
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const rippleVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const rippleFragmentShader = `
#define PI 3.141592653589793
uniform sampler2D tPrev;
uniform sampler2D tCurrent;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uStrength;
uniform float uRadius;
uniform float uDamping;
uniform bool uMouseDown;
varying vec2 vUv;
void main() {
    float dx = 1.0 / uResolution.x;
    float dy = 1.0 / uResolution.y;
    float average = (
        texture2D(tCurrent, vUv + vec2(-dx, 0.0)).r +
        texture2D(tCurrent, vUv + vec2(dx, 0.0)).r +
        texture2D(tCurrent, vUv + vec2(0.0, -dy)).r +
        texture2D(tCurrent, vUv + vec2(0.0, dy)).r
    ) * 0.25;
    float prev = texture2D(tPrev, vUv).r;
    float v = (average * 2.0 - prev) * uDamping;
    if (uMouseDown) {
        float dist = distance(vUv, uMouse);
        if (dist < uRadius) {
            // Use a cosine bell for a smoother, more realistic initial disturbance
            float falloff = 0.5 * (1.0 + cos(PI * dist / uRadius));
            v += uStrength * falloff;
        }
    }
    gl_FragColor = vec4(v, 0.0, 0.0, 1.0);
}
`;
