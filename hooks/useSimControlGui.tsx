/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// FIX: Import React to make React.Dispatch and React.SetStateAction types available.
import React, { useEffect } from 'react';
import { GUI } from 'lil-gui';
import { WaterConfig } from '../types/index.tsx';

type SetWaterConfig = React.Dispatch<React.SetStateAction<WaterConfig>>;

export const useSimControlGui = (waterConfig: WaterConfig, setWaterConfig: SetWaterConfig) => {
  useEffect(() => {
    const gui = new GUI({ title: 'Sim Control' });
    const params = { ...waterConfig };
    const updateConfig = () => setWaterConfig({ ...params });

    const visualFolder = gui.addFolder('Visuals');
    visualFolder.add(params, 'sunIntensity', 0.0, 5.0).name('Sun Intensity').onChange(updateConfig);
    visualFolder.addColor(params, 'colorShallow').name('Shallow / Light').onChange(updateConfig);
    visualFolder.addColor(params, 'colorDeep').name('Deep / Fog').onChange(updateConfig);
    visualFolder.addColor(params, 'foamColor').name('Foam / Particles').onChange(updateConfig);
    visualFolder.add(params, 'transparency', 0.0, 1.0).name('Transparency').onChange(updateConfig);
    visualFolder.add(params, 'roughness', 0.0, 1.0).name('Roughness').onChange(updateConfig);
    
    const waveFolder = gui.addFolder('Waves');
    waveFolder.add(params, 'waveHeight', 0, 2).name('Height').onChange(updateConfig);
    waveFolder.add(params, 'waveSpeed', 0, 2).name('Speed').onChange(updateConfig);
    waveFolder.add(params, 'waveScale', 0.1, 5.0).name('Scale').onChange(updateConfig);
    waveFolder.add(params, 'normalFlatness', 0, 100).name('Normal Flatness').onChange(updateConfig);

    const uwFolder = gui.addFolder('Underwater');
    uwFolder.add(params, 'underwaterFogDensity', 0.0, 1.0).name('Fog Density').onChange(updateConfig);
    uwFolder.add(params, 'underwaterLightIntensity', 0.1, 10.0).name('Light Intensity').onChange(updateConfig);
    uwFolder.add(params, 'ior', 1.0, 2.33).name('Refraction Index').onChange(updateConfig);

    const rippleFolder = gui.addFolder('Ripple Physics');
    rippleFolder.add(params, 'rippleIntensity', 0.1, 10.0).name('Height Intensity').onChange(updateConfig);
    rippleFolder.add(params, 'rippleNormalIntensity', 0.0, 20.0).name('Normal Intensity').onChange(updateConfig);
    rippleFolder.add(params, 'rippleDamping', 0.80, 0.999).name('Damping').onChange(updateConfig);
    rippleFolder.add(params, 'rippleStrength', 0.01, 1.0).name('Input Strength').onChange(updateConfig);
    rippleFolder.add(params, 'rippleRadius', 0.01, 0.2).name('Input Radius').onChange(updateConfig);
    
    visualFolder.open();
    waveFolder.open();
    uwFolder.open();
    rippleFolder.open();
    
    return () => { gui.destroy(); };
  }, [waterConfig, setWaterConfig]);
};