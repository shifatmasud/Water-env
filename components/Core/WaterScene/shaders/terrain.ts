

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

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vElevation;

${commonShaderUtils}

// Voronoi Caustics
float voronoi( in vec2 x, float t ) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float m = 1.0;
    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ ) {
        vec2 g = vec2( float(i), float(j) );
        vec2 o = hash2( n + g );
        o = 0.5 + 0.5*sin( t + 6.2831*o ); 
        vec2 r = g + o - f;
        float d = dot(r,r);
        if( d<m ) m=d;
    }
    return m;
}

vec3 getCausticRGB(vec2 uv) {
    vec3 col = vec3(0.0);
    float t = uTime;
    for(int i=0; i<3; i++) {
        float shift = float(i) * 0.005; 
        vec2 p = uv + shift;
        float v = voronoi(p * 0.8, t * 1.5);
        float intensity = pow(v * 2.0, 5.0) * 10.0;
        col[i] = intensity;
    }
    return col;
}

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

    // 6. CAUSTICS
    vec3 caustics = getCausticRGB(vWorldPos.xz * 0.15); 
    float causticVis = exp(-depth * 0.05);
    vec3 causticLight = caustics * uColorShallow * uLightIntensity * 1.5;
    
    finalColor += causticLight * causticVis;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;