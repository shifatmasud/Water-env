
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from './common.ts';

export const godRayVertexShader = `
varying vec2 vUv;
varying float vAlpha;
uniform float uTime;
uniform vec3 uCameraPos;
${commonShaderUtils}

void main() {
    vUv = uv;
    vec3 pos = position;
    float sway = snoise(vec3(pos.x * 0.1, pos.z * 0.1, uTime * 0.1)) * 4.0;
    pos.x += sway * uv.y;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    vAlpha = smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.5, uv.y);
}
`;

export const godRayFragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uLightIntensity;
varying vec2 vUv;
varying float vAlpha;
${commonShaderUtils}

void main() {
    float t = uTime * 0.2;
    float n1 = snoise(vec2(vUv.x * 3.0 + t, vUv.y * 1.0 - t));
    float n2 = snoise(vec2(vUv.x * 5.0 - t * 0.5, vUv.y * 2.0 - t * 0.2));
    float beam = smoothstep(0.2, 0.8, n1 * 0.5 + n2 * 0.5 + 0.3);
    float xFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
    xFade = smoothstep(0.0, 0.3, xFade);
    float alpha = vAlpha * beam * xFade * 0.15 * uLightIntensity; 
    gl_FragColor = vec4(uColor, alpha);
}
`;