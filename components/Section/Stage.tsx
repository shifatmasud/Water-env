

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { WaterConfig } from '../../types/index.tsx';
// FIX: Corrected the import path for the WaterScene component.
import WaterScene from '../Core/WaterScene/index.tsx';
import { motion } from 'framer-motion';
import { SceneController } from '../App/MetaPrototype.tsx';

interface StageProps {
  waterConfig: WaterConfig;
  sceneController: React.MutableRefObject<Partial<SceneController>>;
  isSplitView: boolean;
}

const Stage: React.FC<StageProps> = ({ 
    waterConfig,
    sceneController,
    isSplitView,
}) => {
  return (
    <div style={{ 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '0px',
        width: '100%',
        height: '100%',
        backgroundColor: '#000', 
    }}>
        <motion.div
            {...({
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 1 }
            } as any)}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
        >
            <WaterScene config={waterConfig} sceneController={sceneController} isSplitView={isSplitView} />
        </motion.div>
    </div>
  );
};

export default Stage;