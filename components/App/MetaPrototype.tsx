
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import Stage from '../Section/Stage.tsx';
import { WaterConfig } from '../../types/index.tsx';
import { useSimControlGui } from '../../hooks/useSimControlGui.tsx';

/**
 * 🏎️ Meta Prototype App
 * Acts as the main state orchestrator for the application.
 */
const MetaPrototype = () => {
  const { theme } = useTheme();

  // -- Water Simulation State --
  const [waterConfig, setWaterConfig] = useState<WaterConfig>({
    // User Defaults from Screenshot
    sunIntensity: 1.0,
    colorShallow: '#41737c',
    colorDeep: '#7aa8d6',
    foamColor: '#ffffff',
    transparency: 0.349,
    roughness: 0.2,          
    waveHeight: 0.1,         
    waveSpeed: 0.108,          
    waveScale: 0.7223,
    normalFlatness: 50, // Default mid-range
    
    underwaterFogDensity: 0.15, 
    underwaterLightIntensity: 2.0, 
    ior: 1.33,
    
    rippleDamping: 0.98,
    rippleStrength: 0.5,
    rippleRadius: 0.04,
    rippleIntensity: 2.5,
    rippleNormalIntensity: 8.0,
  });

  useSimControlGui(waterConfig, setWaterConfig);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: theme.Color.Base.Surface[1],
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Stage waterConfig={waterConfig} />
    </div>
  );
};

export default MetaPrototype;