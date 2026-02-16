/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from './common.ts';

export const terrainVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vElevation;
${commonShaderUtils}

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Scale down coord for broader dunes
    vec2 p = pos.xy * 0.002; 
    
    // Rolling dunes: Less jagged, more flowy
    // We combine sine waves with noise
    float dune = sin(p.x * 2.0 + p.y * 0.5) * 5.0; 
    float detail = fbm(p * 2.0, 3, 0.5, 2.0) * 15.0;
    
    float elevation = dune + detail;
    
    // Flatten near edges if you want, but here we just apply
    pos.z += elevation;
    vElevation = elevation;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    
    vec4 mvPosition = viewMatrix * worldPosition;
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const terrainFragmentShader = `
uniform float uTime;
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform float uLightIntensity;
uniform sampler2D tSand; // Generated Noise Texture
uniform sampler2D tCaustics; // Pre-blurred caustics texture

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vElevation;

${commonShaderUtils}

void main() {
    // 1. TEXTURE MAPPING
    // Sample our procedurally generated sand texture
    // Repeat it often for granular detail
    vec4 sandTex = texture2D(tSand, vWorldPos.xz * 0.1);
    float grainVal = sandTex.r; // 0..1
    
    // 2. BUMP MAPPING (Fake Normal)
    // We use the grain value to perturb the normal slightly
    vec3 normal = vec3(0.0, 1.0, 0.0);
    // Cheap trick: use derivative of texture or just noise to tilt normal
    float d = 0.05;
    float hL = texture2D(tSand, (vWorldPos.xz - vec2(d, 0.0)) * 0.1).r;
    float hR = texture2D(tSand, (vWorldPos.xz + vec2(d, 0.0)) * 0.1).r;
    float hU = texture2D(tSand, (vWorldPos.xz - vec2(0.0, d)) * 0.1).r;
    float hD = texture2D(tSand, (vWorldPos.xz + vec2(0.0, d)) * 0.1).r;
    
    vec3 bumpNormal = normalize(vec3(hL - hR, 1.0, hU - hD));
    
    // 3. BASE COLOR
    vec3 baseSand = vec3(0.94, 0.87, 0.70); // Warm Sand
    vec3 wetSand = vec3(0.65, 0.55, 0.40); // Darker Wet
    
    // Blend based on texture noise (variation)
    vec3 albedo = mix(wetSand, baseSand, grainVal * 0.8 + 0.2);

    // Apply lighting to bump
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.2));
    float diff = max(0.0, dot(bumpNormal, lightDir));
    
    albedo *= (0.6 + 0.4 * diff); // Shadows in grains

    // 4. SPARKLES (Silica Specular)
    // High reflection only on bright texture spots (grains)
    vec3 viewDir = normalize(vViewPosition);
    vec3 halfVec = normalize(lightDir + viewDir);
    float NdotH = max(0.0, dot(bumpNormal, halfVec));
    
    // Sparkle mask: Only brightest 5% of grains sparkle
    float sparkleMask = smoothstep(0.95, 1.0, grainVal);
    float specular = pow(NdotH, 100.0) * sparkleMask * 2.0;
    
    albedo += vec3(1.0) * specular;

    // 5. DEPTH
    // Vertical Absorption
    float depth = max(0.0, -vWorldPos.y);
    float absorption = 1.0 - exp(-depth * 0.015); // Reduced vertical absorption
    vec3 finalColor = mix(albedo, uColorDeep * 0.2, absorption * 0.8);

    // 6. CAUSTICS (Optimized)
    // The texture coordinates need to move with time to simulate water movement
    vec2 causticUv = vWorldPos.xz * 0.01;
    causticUv.x += uTime * 0.01;
    causticUv.y += uTime * 0.005;

    // The caustic pattern itself is animated in the texture, but we can also scroll it
    // for a more dynamic effect.
    float causticStrength = texture2D(tCaustics, causticUv).r;
    
    float causticVis = exp(-depth * 0.05); // Caustics fade with depth
    vec3 causticLight = causticStrength * uColorShallow * uLightIntensity * 2.5; // Boosted intensity
    
    finalColor += causticLight * causticVis;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;