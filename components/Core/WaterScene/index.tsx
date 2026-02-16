

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { WaterConfig } from '../../../types/index.tsx';
import { createSandTexture } from './utils/createSandTexture.ts';
import { godRayVertexShader, godRayFragmentShader } from './shaders/godray.ts';
import { rippleVertexShader, rippleFragmentShader } from './shaders/ripple.ts';
import { waterVertexShader, waterFragmentShader } from './shaders/water.ts';
import { terrainVertexShader, terrainFragmentShader } from './shaders/terrain.ts';
import { SceneController } from '../../App/MetaPrototype.tsx';


interface WaterSceneProps {
  config: WaterConfig;
  initialCameraState?: { position: [number, number, number], target: [number, number, number] } | null;
  sceneController?: React.MutableRefObject<Partial<SceneController>>;
}

const extractPaletteFromTexture = (texture: THREE.DataTexture) => {
  if (!texture || !texture.image) return null;

  const data = texture.image.data; // Float32Array
  const width = texture.image.width;
  const height = texture.image.height;

  const samples: THREE.Color[] = [];
  const sampleCount = 200;

  for (let i = 0; i < sampleCount; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const idx = (y * width + x) * 3; // RGB format for HDR
      
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Simple Reinhard tone mapping for analysis
      const toneMappedR = r / (r + 1);
      const toneMappedG = g / (g + 1);
      const toneMappedB = b / (b + 1);

      const color = new THREE.Color(toneMappedR, toneMappedG, toneMappedB);
      // Convert to sRGB for consistent HSL analysis
      color.convertLinearToSRGB();
      samples.push(color);
  }

  // Convert to HSL and sort by luminance
  const hslSamples = samples.map(c => {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return { color: c, hsl };
  }).sort((a, b) => a.hsl.l - b.hsl.l);

  // Pick colors from luminance percentiles
  const deepColor = hslSamples[Math.floor(hslSamples.length * 0.25)].color.clone();
  const shallowColor = hslSamples[Math.floor(hslSamples.length * 0.75)].color.clone();

  // Adjust colors to be more suitable for water
  const deepHSL = { h: 0, s: 0, l: 0 };
  deepColor.getHSL(deepHSL);
  deepColor.setHSL(deepHSL.h, Math.min(1.0, deepHSL.s * 1.3), Math.max(0.1, deepHSL.l * 0.8));

  const shallowHSL = { h: 0, s: 0, l: 0 };
  shallowColor.getHSL(shallowHSL);
  shallowColor.setHSL(shallowHSL.h, Math.min(1.0, shallowHSL.s * 1.2), Math.min(0.8, shallowHSL.l * 1.1));

  return {
      colorDeep: '#' + deepColor.getHexString(),
      colorShallow: '#' + shallowColor.getHexString(),
  };
};

const WaterScene: React.FC<WaterSceneProps> = ({ config, initialCameraState, sceneController }) => {
  // FIX: Corrected typo from HTMLDivDivElement to HTMLDivElement.
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const frameIdRef = useRef<number>(0);
  const materialsRef = useRef<THREE.Material[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sandTextureRef = useRef<THREE.Texture | null>(null);
  const skyTextureRef = useRef<THREE.DataTexture | null>(null);
  const envMapRef = useRef<THREE.Texture | null>(null);
  const hdrLoaderRef = useRef<HDRLoader | null>(null);
  const pmremGeneratorRef = useRef<THREE.PMREMGenerator | null>(null);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const isUnderwater = useRef<boolean>(false);
  
  // --- SIMULATION REFS ---
  const simSceneRef = useRef<THREE.Scene | null>(null);
  const simCameraRef = useRef<THREE.Camera | null>(null);
  const simMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const renderTargetA = useRef<THREE.WebGLRenderTarget | null>(null);
  const renderTargetB = useRef<THREE.WebGLRenderTarget | null>(null);
  
  // Interaction Refs
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const interactionPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // God Rays & Bubbles Refs
  const raysGroupRef = useRef<THREE.Group | null>(null);
  const bubblesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Generate Sand Texture
    sandTextureRef.current = createSandTexture();
    
    // 2. Initialize Loaders & Generators
    hdrLoaderRef.current = new HDRLoader();
    
    // Default placeholder 1x1 grey
    const defaultTex = new THREE.DataTexture(new Float32Array([0.5, 0.5, 0.5, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
    defaultTex.needsUpdate = true;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    pmremGeneratorRef.current = new THREE.PMREMGenerator(renderer);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Initial State - use a dark neutral color to avoid gray flash
    scene.background = new THREE.Color(0x101015);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    cameraRef.current = camera;
    if (initialCameraState) camera.position.set(...initialCameraState.position);
    else camera.position.set(0, 15, 60);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.maxDistance = 400;
    controls.minDistance = 1;
    if (initialCameraState) controls.target.set(...initialCameraState.target);

    // --- GOD RAYS SETUP ---
    const rayGeo = new THREE.ConeGeometry(20, 150, 32, 1, true); 
    rayGeo.translate(0, -75, 0); // Pivot at top
    rayGeo.rotateX(-Math.PI); // Point down
    
    const rayMat = new THREE.ShaderMaterial({
        vertexShader: godRayVertexShader,
        fragmentShader: godRayFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(configRef.current.colorShallow) },
            uLightIntensity: { value: configRef.current.underwaterLightIntensity },
            uCameraPos: { value: new THREE.Vector3() }
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    materialsRef.current.push(rayMat);

    const raysGroup = new THREE.Group();
    raysGroup.position.y = -2; // Just below surface
    raysGroupRef.current = raysGroup;
    scene.add(raysGroup);

    for (let i = 0; i < 20; i++) {
        const ray = new THREE.Mesh(rayGeo, rayMat);
        const r = 10 + Math.random() * 80;
        const a = Math.random() * Math.PI * 2;
        ray.position.set(Math.cos(a)*r, 0, Math.sin(a)*r);
        ray.rotation.x = (Math.random() - 0.5) * 0.3;
        ray.rotation.z = (Math.random() - 0.5) * 0.3;
        ray.scale.setScalar(0.8 + Math.random() * 1.5);
        raysGroup.add(ray);
    }

    // --- BUBBLES SETUP ---
    const bubbleCount = 300;
    const bubblePositions = new Float32Array(bubbleCount * 3);
    const bubbleVelocities = new Float32Array(bubbleCount * 3);
    const bubbleGeo = new THREE.BufferGeometry();

    for (let i = 0; i < bubbleCount; i++) {
        const i3 = i * 3;
        bubblePositions[i3] = (Math.random() - 0.5) * 400; // x
        bubblePositions[i3 + 1] = -100 - Math.random() * 200; // y
        bubblePositions[i3 + 2] = (Math.random() - 0.5) * 400; // z

        bubbleVelocities[i3 + 1] = 0.5 + Math.random() * 1.5; // vy (upwards speed)
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
    bubbleGeo.setAttribute('velocity', new THREE.BufferAttribute(bubbleVelocities, 3));

    const bubbleMat = new THREE.PointsMaterial({
        size: 0.8,
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    materialsRef.current.push(bubbleMat);
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
    bubblesRef.current = bubbles;
    scene.add(bubbles);

    // --- RIPPLE SIMULATION SETUP ---
    const simSize = 512;
    const rtOptions = {
        type: THREE.HalfFloatType, 
        minFilter: THREE.NearestFilter, 
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    };
    renderTargetA.current = new THREE.WebGLRenderTarget(simSize, simSize, rtOptions);
    renderTargetB.current = new THREE.WebGLRenderTarget(simSize, simSize, rtOptions);
    
    const simScene = new THREE.Scene();
    simSceneRef.current = simScene;
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    simCameraRef.current = simCamera;
    
    const simGeometry = new THREE.PlaneGeometry(2, 2);
    const simMaterial = new THREE.ShaderMaterial({
        vertexShader: rippleVertexShader,
        fragmentShader: rippleFragmentShader,
        uniforms: {
            tPrev: { value: null },
            tCurrent: { value: null },
            uResolution: { value: new THREE.Vector2(simSize, simSize) },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uStrength: { value: configRef.current.rippleStrength },
            uRadius: { value: configRef.current.rippleRadius },
            uDamping: { value: configRef.current.rippleDamping },
            uMouseDown: { value: false }
        }
    });
    simMaterialRef.current = simMaterial;
    simScene.add(new THREE.Mesh(simGeometry, simMaterial));

    // --- 1. SEABED ---
    const bedGeo = new THREE.PlaneGeometry(1000, 1000, 256, 256);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new THREE.ShaderMaterial({
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorDeep: { value: new THREE.Color(configRef.current.colorDeep) },
            uColorShallow: { value: new THREE.Color(configRef.current.colorShallow) },
            uLightIntensity: { value: configRef.current.underwaterLightIntensity },
            uFogDensity: { value: configRef.current.underwaterFogDensity },
            tSand: { value: sandTextureRef.current }
        }
    });
    materialsRef.current.push(bedMat);
    const seabed = new THREE.Mesh(bedGeo, bedMat);
    seabed.position.y = -80;
    scene.add(seabed);

    // --- 2. WATER SURFACE ---
    const waterGeo = new THREE.PlaneGeometry(1000, 1000, 256, 256);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorDeep: { value: new THREE.Color(configRef.current.colorDeep) },
            uColorShallow: { value: new THREE.Color(configRef.current.colorShallow) },
            uSunPosition: { value: new THREE.Vector3(50, 100, -100) },
            uTransparency: { value: configRef.current.transparency },
            uRoughness: { value: configRef.current.roughness },
            uSunIntensity: { value: configRef.current.sunIntensity },
            uWaveHeight: { value: configRef.current.waveHeight },
            uWaveSpeed: { value: configRef.current.waveSpeed },
            uWaveScale: { value: configRef.current.waveScale },
            uFogDensity: { value: configRef.current.underwaterFogDensity },
            uNormalFlatness: { value: configRef.current.normalFlatness },
            uIOR: { value: configRef.current.ior },
            tRipple: { value: null },
            uRippleIntensity: { value: configRef.current.rippleIntensity },
            uRippleNormalIntensity: { value: configRef.current.rippleNormalIntensity },
            tSky: { value: defaultTex },
        },
        transparent: true,
        side: THREE.DoubleSide,
    });
    materialsRef.current.push(waterMat);
    const water = new THREE.Mesh(waterGeo, waterMat);
    scene.add(water);

    const clock = new THREE.Clock();
    
    const animate = () => {
        const time = clock.getElapsedTime();
        const currentConfig = configRef.current;
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;

        if (!renderer || !scene || !camera) {
            frameIdRef.current = requestAnimationFrame(animate);
            return;
        }

        // --- RIPPLE STEP ---
        if (simMaterialRef.current && simSceneRef.current && simCameraRef.current && renderTargetA.current && renderTargetB.current) {
            const temp = renderTargetA.current;
            renderTargetA.current = renderTargetB.current;
            renderTargetB.current = temp;
            
            simMaterialRef.current.uniforms.tCurrent.value = renderTargetB.current.texture;
            simMaterialRef.current.uniforms.tPrev.value = renderTargetA.current.texture; 
            
            renderer.setRenderTarget(renderTargetA.current);
            renderer.render(simSceneRef.current, simCameraRef.current);
            renderer.setRenderTarget(null);
            
            waterMat.uniforms.tRipple.value = renderTargetA.current.texture;
        }

        materialsRef.current.forEach(mat => {
            if(mat instanceof THREE.ShaderMaterial && mat.uniforms.uTime) mat.uniforms.uTime.value = time;
        });

        // --- CAMERA & ENVIRONMENT LOGIC (PER-FRAME) ---
        const camY = camera.position.y;
        const waveApprox = Math.sin(camera.position.x * 0.1 * currentConfig.waveScale + time * currentConfig.waveSpeed) * currentConfig.waveHeight;
        isUnderwater.current = camY < (waveApprox);

        if (isUnderwater.current) {
            // UNDERWATER STATE
            scene.background = new THREE.Color(currentConfig.colorDeep);
            scene.environment = null;
            scene.fog = new THREE.FogExp2(currentConfig.colorDeep, currentConfig.underwaterFogDensity * 0.3);
            
            if(raysGroupRef.current) {
                raysGroupRef.current.visible = true;
                const snapSize = 20;
                raysGroupRef.current.position.x = Math.round(camera.position.x / snapSize) * snapSize;
                raysGroupRef.current.position.z = Math.round(camera.position.z / snapSize) * snapSize;
            }
            if(bubblesRef.current) {
                bubblesRef.current.visible = true;
                const positions = bubblesRef.current.geometry.attributes.position;
                const velocities = bubblesRef.current.geometry.attributes.velocity;
                const bubbleCount = positions.count;
                
                for(let i=0; i < bubbleCount; i++) {
                    const i3 = i * 3;
                    positions.array[i3+1] += velocities.array[i3+1] * 0.05; // Move up
                    positions.array[i3] += Math.sin(time + positions.array[i3+2]) * 0.1; // Sway
                    
                    if(positions.array[i3+1] > 5) {
                        positions.array[i3+1] = -120;
                        positions.array[i3] = camera.position.x + (Math.random() - 0.5) * 200;
                        positions.array[i3+2] = camera.position.z + (Math.random() - 0.5) * 200;
                    }
                }
                positions.needsUpdate = true;
            }
        } else {
            // SURFACE STATE
            if (skyTextureRef.current && envMapRef.current) {
                scene.background = skyTextureRef.current;
                scene.environment = envMapRef.current;
            } else {
                scene.background = new THREE.Color(0x101015); 
                scene.environment = null;
            }
            scene.fog = new THREE.FogExp2(new THREE.Color(currentConfig.colorShallow).lerp(new THREE.Color(0xffffff), 0.4), 0.0015);
            
            if(raysGroupRef.current) raysGroupRef.current.visible = false;
            if(bubblesRef.current) bubblesRef.current.visible = false;
        }

        controlsRef.current?.update();
        renderer.render(scene, camera);
        frameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
        if(!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        rendererRef.current.setSize(w, h);
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // --- INTERACTION HANDLERS ---
    const updateMouse = (e: MouseEvent | PointerEvent) => {
        if (!containerRef.current || !cameraRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        mouse.current.set(x, y);
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        
        const target = new THREE.Vector3();
        const intersection = raycaster.current.ray.intersectPlane(interactionPlane.current, target);
        
        if (intersection) {
            const u = (target.x + 500) / 1000;
            const vCorrected = ( -target.z + 500 ) / 1000;

            if (simMaterialRef.current) {
                simMaterialRef.current.uniforms.uMouse.value.set(u, vCorrected);
            }
        }
    };

    const onPointerDown = (e: PointerEvent) => {
        if(simMaterialRef.current) simMaterialRef.current.uniforms.uMouseDown.value = true;
        updateMouse(e);
    };
    const onPointerMove = (e: PointerEvent) => {
        updateMouse(e);
    };
    const onPointerUp = () => {
        if(simMaterialRef.current) simMaterialRef.current.uniforms.uMouseDown.value = false;
    };

    containerRef.current.addEventListener('pointerdown', onPointerDown);
    containerRef.current.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
        cancelAnimationFrame(frameIdRef.current);
        window.removeEventListener('resize', handleResize);
        if(containerRef.current && rendererRef.current) {
            containerRef.current.removeEventListener('pointerdown', onPointerDown);
            containerRef.current.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            containerRef.current.innerHTML = '';
        }
        renderTargetA.current?.dispose();
        renderTargetB.current?.dispose();
        
        // Clean up textures and generators
        pmremGeneratorRef.current?.dispose();
        envMapRef.current?.dispose();
        if (sandTextureRef.current) sandTextureRef.current.dispose();
        if (skyTextureRef.current) skyTextureRef.current.dispose();
        defaultTex.dispose();
        if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []); 

  // --- Environment Loading ---
  useEffect(() => {
    if (!hdrLoaderRef.current || !sceneRef.current || !pmremGeneratorRef.current) return;

    const loader = hdrLoaderRef.current;
    const pmremGenerator = pmremGeneratorRef.current;
    
    loader.load(config.skyboxUrl, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const newEnvMap = pmremGenerator.fromEquirectangular(texture).texture;
        
        envMapRef.current = newEnvMap;
        skyTextureRef.current = texture;
        
        materialsRef.current.forEach(mat => {
            if (mat instanceof THREE.ShaderMaterial && mat.uniforms.tSky) mat.uniforms.tSky.value = texture;
        });
        
        if (sceneController) {
          sceneController.current.extractPalette = () => {
            return new Promise((resolve) => {
              const palette = extractPaletteFromTexture(texture);
              resolve(palette);
            });
          };

          // Auto-sync colors on load
          const palette = extractPaletteFromTexture(texture);
          if (palette && sceneController.current.updateWaterConfigFromPalette) {
            sceneController.current.updateWaterConfigFromPalette(palette);
          }
        }
    });
  }, [config.skyboxUrl, sceneController]);


  // --- CONFIG UPDATE ---
  useEffect(() => {
    const deep = new THREE.Color(config.colorDeep);
    const shallow = new THREE.Color(config.colorShallow);
    
    // Update Main Shaders
    // FIX: Replaced forEach with a for...of loop to help TypeScript with type narrowing.
    for (const mat of materialsRef.current) {
        if (mat instanceof THREE.ShaderMaterial) {
            if(mat.uniforms.uColorDeep) mat.uniforms.uColorDeep.value.copy(deep);
            if(mat.uniforms.uColorShallow) mat.uniforms.uColorShallow.value.copy(shallow);
            if(mat.uniforms.uTransparency) mat.uniforms.uTransparency.value = config.transparency;
            if(mat.uniforms.uRoughness) mat.uniforms.uRoughness.value = config.roughness;
            if(mat.uniforms.uWaveHeight) mat.uniforms.uWaveHeight.value = config.waveHeight;
            if(mat.uniforms.uWaveSpeed) mat.uniforms.uWaveSpeed.value = config.waveSpeed;
            if(mat.uniforms.uWaveScale) mat.uniforms.uWaveScale.value = config.waveScale;
            if(mat.uniforms.uLightIntensity) mat.uniforms.uLightIntensity.value = config.underwaterLightIntensity;
            if(mat.uniforms.uSunIntensity) mat.uniforms.uSunIntensity.value = config.sunIntensity;
            if(mat.uniforms.uFogDensity) mat.uniforms.uFogDensity.value = config.underwaterFogDensity;
            if(mat.uniforms.uRippleIntensity) mat.uniforms.uRippleIntensity.value = config.rippleIntensity;
            if(mat.uniforms.uRippleNormalIntensity) mat.uniforms.uRippleNormalIntensity.value = config.rippleNormalIntensity;
            if(mat.uniforms.uNormalFlatness) mat.uniforms.uNormalFlatness.value = config.normalFlatness;
            if(mat.uniforms.uIOR) mat.uniforms.uIOR.value = config.ior;
            if(mat.uniforms.uColor) mat.uniforms.uColor.value.copy(shallow);
        }
    }

    if (simMaterialRef.current) {
        simMaterialRef.current.uniforms.uDamping.value = config.rippleDamping;
        simMaterialRef.current.uniforms.uStrength.value = config.rippleStrength;
        simMaterialRef.current.uniforms.uRadius.value = config.rippleRadius;
    }
  }, [config]);

  return <div ref={containerRef} style={{width:'100%', height:'100%', background:'#000'}} />;
};

export default WaterScene;