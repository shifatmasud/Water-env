

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useMotionValue } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';
import { WaterConfig } from '../../../types/index.tsx';
import RangeSlider from '../../Core/RangeSlider.tsx';
import ColorPicker from '../../Core/ColorPicker.tsx';
import Select from '../../Core/Select.tsx';
import { skyboxOptions } from '../../../environments.ts';
import Button from '../../Core/Button.tsx';

interface WaterSimulationPanelProps {
  waterConfig: WaterConfig;
  onWaterPropChange: (updates: Partial<WaterConfig>) => void;
  onSyncFromSky: () => void;
}

// Helper for local motion values to use RangeSlider
const LocalRange: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, onChange }) => {
  const mv = useMotionValue(value);
  
  React.useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return (
    <RangeSlider
      label={label}
      motionValue={mv}
      onCommit={(v) => {
        mv.set(v);
        onChange(v);
      }}
      min={min}
      max={max}
    />
  );
};

export const WaterSimulation: React.FC<WaterSimulationPanelProps> = ({ waterConfig, onWaterPropChange, onSyncFromSky }) => {
  const { theme } = useTheme();
  
  const selectOptions = skyboxOptions.map(opt => ({ value: opt.url, label: opt.name }));

  return (
    <>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.M'], color: theme.Color.Base.Content[2], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Water Simulation
      </label>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
         <Button
            label="Sync Colors from Sky"
            onClick={onSyncFromSky}
            variant="secondary"
            size="S"
            icon="ph-sparkle"
         />
         <Select
            label="Environment"
            value={waterConfig.skyboxUrl}
            onChange={(e) => onWaterPropChange({ skyboxUrl: e.target.value })}
            options={selectOptions}
         />
         <ColorPicker
            label="Deep"
            value={waterConfig.colorDeep}
            onChange={(e) => onWaterPropChange({ colorDeep: e.target.value })}
         />
         <ColorPicker
            label="Shallow"
            value={waterConfig.colorShallow}
            onChange={(e) => onWaterPropChange({ colorShallow: e.target.value })}
         />
         <LocalRange label="Wave Height" value={waterConfig.waveHeight * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ waveHeight: v / 10 })} />
         <LocalRange label="Wave Speed" value={waterConfig.waveSpeed * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ waveSpeed: v / 100 })} />
         <LocalRange label="Scale" value={waterConfig.waveScale * 10} min={1} max={100} onChange={(v) => onWaterPropChange({ waveScale: v / 10 })} />
         <LocalRange label="Roughness" value={waterConfig.roughness * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ roughness: v / 100 })} />
         <LocalRange label="Normal Flatness" value={waterConfig.normalFlatness} min={1} max={100} onChange={(v) => onWaterPropChange({ normalFlatness: v })} />
         <LocalRange label="Fog Near" value={waterConfig.underwaterFogNear} min={0} max={100} onChange={(v) => onWaterPropChange({ underwaterFogNear: v })} />
         <LocalRange label="Fog Far" value={waterConfig.underwaterFogFar} min={1} max={300} onChange={(v) => onWaterPropChange({ underwaterFogFar: v })} />
      </div>
    </>
  );
};