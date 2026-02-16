
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

interface ControlPanelProps {
  btnProps: MetaButtonProps;
  waterConfig: WaterConfig;
  onPropChange: (keyOrObj: string | Partial<MetaButtonProps>, value?: any) => void;
  onWaterPropChange: (updates: Partial<WaterConfig>) => void;
  radiusMotionValue: any; // Using any for MotionValue<number>
  onRadiusCommit: (value: number) => void;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  showTokens: boolean;
  onToggleTokens: () => void;
  // 3D View Props
  view3D: boolean;
  onToggleView3D: () => void;
  layerSpacing: any; // Using any for MotionValue<number>
  viewRotateX: any;
  viewRotateZ: any;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { theme } = useTheme();

  return (
    <>
      <ElementProps
        btnProps={props.btnProps}
        onPropChange={props.onPropChange}
        radiusMotionValue={props.radiusMotionValue}
        onRadiusCommit={props.onRadiusCommit}
      />

      <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.L']} 0` }} />

      <WaterSimulation
        waterConfig={props.waterConfig}
        onWaterPropChange={props.onWaterPropChange}
      />

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
    </>
  );
};

export default ControlPanel;