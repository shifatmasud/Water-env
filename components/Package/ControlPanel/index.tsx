




/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useTheme } from '../../../Theme.tsx';
import { MetaButtonProps, WaterConfig } from '../../../types/index.tsx';
import { ElementProps } from './ElementProps.tsx';
import { WaterSimulation } from './WaterSimulation.tsx';
import { InteractionState } from './InteractionState.tsx';
import { Inspector } from './Inspector.tsx';
import type { SkyboxOption } from '../../../environments.ts';

interface ControlPanelProps {
  waterConfig: WaterConfig;
  onWaterPropChange: (updates: Partial<WaterConfig>) => void;
  onSyncFromSky: () => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
  skyboxOptions: SkyboxOption[];
  onHdrUpload: (file: File) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { theme } = useTheme();

  return (
    <>
      {/* 
      <ElementProps
        btnProps={props.btnProps}
        onPropChange={props.onPropChange}
        radiusMotionValue={props.radiusMotionValue}
        onRadiusCommit={props.onRadiusCommit}
      />

      <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.L']} 0` }} />
      */}
      
      <WaterSimulation
        waterConfig={props.waterConfig}
        onWaterPropChange={props.onWaterPropChange}
        onSyncFromSky={props.onSyncFromSky}
        isSplitView={props.isSplitView}
        onToggleSplitView={props.onToggleSplitView}
        skyboxOptions={props.skyboxOptions}
        onHdrUpload={props.onHdrUpload}
      />
      
      {/*
      <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.L']} 0` }} />
      
      <InteractionState
        btnProps={props.btnProps}
        onPropChange={props.onPropChange}
      />

      <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.L']} 0` }} />
      
      <Inspector
        showMeasurements={props.showMeasurements}
        onToggleMeasurements={props.onToggleMeasurements}
        showTokens={props.showTokens}
        onToggleTokens={props.onToggleTokens}
        view3D={props.view3D}
        onToggleView3D={props.onToggleView3D}
        layerSpacing={props.layerSpacing}
        viewRotateX={props.viewRotateX}
        viewRotateZ={props.viewRotateZ}
      />
      */}
    </>
  );
};

export default ControlPanel;