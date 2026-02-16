

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from './common.ts';

export const waterVertexShader = `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform float uWaveScale;
uniform sampler2D tRipple;
uniform float uRippleIntensity;
uniform float uRippleNormalIntensity;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vElevation;
${commonShaderUtils}
vec3 calculateTotalNormal(vec2 pos, vec2 uv, float scale, float speed, float height) {
    float e = 0.5; 
    float uv_e = 0.001;
    #define H(p) (fbm(p + vec2(uTime*speed*0.5, uTime*speed*0.5*0.4), 3, 0.5, 2.0) * height)
    vec2 p = pos * scale * 0.02;
    vec2 px = (pos + vec2(e, 0.0)) * scale * 0.02;
    vec2 pz = (pos + vec2(0.0, e)) * scale * 0.02;
    float h_base = H(p);
    float h_base_x = H(px);
    float h_base_z = H(pz);
    
    // Sample raw ripple values
    float r_val = texture2D(tRipple, uv).r;
    float r_x_val = texture2D(tRipple, uv + vec2(uv_e, 0.0)).r;
    float r_z_val = texture2D(tRipple, uv + vec2(0.0, uv_e)).r;

    // Calculate the height field used *only* for normal calculation
    float h_for_norm = h_base + r_val * uRippleNormalIntensity;
    float hx_for_norm = h_base_x + r_x_val * uRippleNormalIntensity;
    float hz_for_norm = h_base_z + r_z_val * uRippleNormalIntensity;
    
    vec3 v1 = vec3(e, hx_for_norm - h_for_norm, 0.0);
    vec3 v2 = vec3(0.0, hz_for_norm - h_for_norm, e);
    return normalize(cross(v2, v1));
}
void main() {
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vec2 p = worldPosition.xz * uWaveScale * 0.02;
    float t = uTime * uWaveSpeed * 0.5;
    float displacement = fbm(p + vec2(t, t * 0.4), 3, 0.5, 2.0) * uWaveHeight * 10.0;
    displacement += sin(p.x * 5.0 + t * 2.0) * uWaveHeight * 0.5;
    displacement += cos(p.y * 4.0 + t * 2.5) * uWaveHeight * 0.5;

    // Use uRippleIntensity for geometric displacement
    float ripple = texture2D(tRipple, uv).r * uRippleIntensity;
    pos.y += displacement + ripple;

    vElevation = pos.y;
    vec4 finalWorldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = finalWorldPos.xyz;

    // Use calculateTotalNormal which internally uses uRippleNormalIntensity
    vNormal = calculateTotalNormal(worldPosition.xz, uv, uWaveScale, uWaveSpeed, uWaveHeight * 10.0);
    
    vec4 mvPosition = viewMatrix * finalWorldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const waterFragmentShader = `
${commonShaderUtils}
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform vec3 uSunPosition;
uniform float uTransparency;
uniform float uRoughness;
uniform float uSunIntensity;
uniform float uNormalFlatness;
uniform float uIOR;
uniform sampler2D tSky;
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vElevation;

// Equirectangular mapping for fake reflection/refraction
vec3 getSkyColor(vec3 dir) {
    // Standard Equirectangular mapping
    vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
    uv *= vec2(0.1591, 0.3183); // inv(2*PI), inv(PI)
    uv += 0.5;
    return texture2D(tSky, uv).rgb;
}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    // Apply normal flatness
    vec3 normal = vNormal;
    normal.xz *= (1.0 - uNormalFlatness * 0.01); 
    normal = normalize(normal);
    
    // Correct normal for backfaces
    vec3 faceNormal = normalize(gl_FrontFacing ? normal : -normal);
    
    float NdotV = max(0.0, dot(faceNormal, viewDir));
    float fresnel = pow(1.0 - NdotV, 5.0); 
    vec3 finalColor;

    if (gl_FrontFacing) {
        // --- SURFACE (Looking Down) ---
        vec3 refDir = reflect(-viewDir, faceNormal);
        
        // Sample HDR Skybox for Reflection
        vec3 reflection = getSkyColor(refDir);
        
        vec3 body = mix(uColorDeep, uColorShallow, 0.2 + 0.3 * NdotV);
        vec3 sunDir = normalize(uSunPosition);
        vec3 halfVec = normalize(sunDir + viewDir);
        float NdotH = max(0.0, dot(faceNormal, halfVec));
        float specular = pow(NdotH, 100.0 * (1.0 - uRoughness));
        
        // Mix reflection with water body
        finalColor = mix(body, reflection, fresnel);
        finalColor += specular * vec3(1.0, 0.95, 0.8) * uSunIntensity;
        
        gl_FragColor = vec4(finalColor, uTransparency);
    } else {
        // --- UNDERWATER (Looking Up) ---
        vec3 I = viewDir;
        vec3 N = faceNormal;
        float eta = 1.0 / uIOR; // Water to Air

        vec3 refractedDir = refract(I, N, eta);
        
        float R0 = pow((1.0 - uIOR) / (1.0 + uIOR), 2.0);
        float cosTheta = max(0.0, dot(I, N));
        float fresnelFactor = R0 + (1.0 - R0) * pow(1.0 - cosTheta, 5.0);
        
        vec3 refractedColor;
        if (length(refractedDir) > 0.0) {
            refractedColor = getSkyColor(refractedDir);
        } else {
            refractedColor = vec3(0.0);
        }

        vec3 reflectedDir = reflect(-I, N);
        float noise = fbm(vWorldPos.xz * 0.05 + reflectedDir.xz * 0.1 + uTime * 0.1, 3, 0.5, 2.0);
        vec3 reflectedColor = mix(uColorDeep, uColorShallow, 0.3 + noise * 0.3);
        
        float k = 1.0 - eta * eta * (1.0 - cosTheta * cosTheta);
        float finalFresnel = k < 0.0 ? 1.0 : fresnelFactor;

        finalColor = mix(refractedColor, reflectedColor, finalFresnel);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
}
`;