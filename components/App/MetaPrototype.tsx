/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import Stage from '../Section/Stage.tsx';
import Dock from '../Section/Dock.tsx';
import FloatingWindow from '../Package/FloatingWindow.tsx';
import ThemeToggleButton from '../Core/ThemeToggleButton.tsx';
import ControlPanel from '../Package/ControlPanel/index.tsx';
import CodePanel from '../Package/CodePanel.tsx';
import ConsolePanel from '../Package/ConsolePanel.tsx';
import { WaterConfig, WindowId, WindowState, LogEntry } from '../../types/index.tsx';
import { skyboxOptions, type SkyboxOption } from '../../environments.ts';

interface Palette {
  colorDeep: string;
  colorShallow: string;
}

export interface SceneController {
  extractPalette: () => Promise<Palette | null>;
  updateWaterConfigFromPalette: (palette: Palette) => void;
}

const getInitialWindowState = (): Record<WindowId, WindowState> => ({
  control: { id: 'control', title: 'Controls', isOpen: true, zIndex: 10, x: 0, y: 0 },
  code: { id: 'code', title: 'Code', isOpen: false, zIndex: 10, x: 0, y: 0 },
  console: { id: 'console', title: 'Console', isOpen: false, zIndex: 10, x: 0, y: 0 },
});

/**
 * 🏎️ Meta Prototype App
 * Acts as the main state orchestrator for the application.
 */
const MetaPrototype = () => {
  const { theme } = useTheme();
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(getInitialWindowState);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sceneControllerRef = useRef<Partial<SceneController>>({});
  const [isSplitView, setIsSplitView] = useState(false);
  const [skyboxOptionsState, setSkyboxOptionsState] = useState<SkyboxOption[]>(skyboxOptions);

  const addLog = useCallback((message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
    };
    setLogs(prev => [...prev.slice(-100), newLog]); // Keep last 100 logs
  }, []);

  // -- Water Simulation State --
  const [waterConfig, setWaterConfig] = useState<WaterConfig>({
    skyboxUrl: skyboxOptions[0].url,
    sunIntensity: 1.2,
    colorShallow: '#41737c',
    colorDeep: '#7aa8d6',
    transparency: 0.65,
    roughness: 0.1,
    waveHeight: 0.15,
    waveSpeed: 0.108,
    waveScale: 0.7223,
    normalFlatness: 50,
    underwaterDimming: 0.4,
    underwaterLightIntensity: 2.0,
    ior: 1.33,
    fogCutoffStart: 80,
    fogCutoffEnd: 300,
    rippleDamping: 0.98,
    rippleStrength: 0.5,
    rippleRadius: 0.04,
    rippleIntensity: 2.5,
    rippleNormalIntensity: 8.0,
  });

  const handleWaterConfigChange = (updates: Partial<WaterConfig>) => {
    setWaterConfig(prev => ({ ...prev, ...updates }));
    const changedKeys = Object.keys(updates).join(', ');
    addLog(`Water config updated: ${changedKeys}`);
  };

  // Expose a method for WaterScene to call back and update colors
  sceneControllerRef.current.updateWaterConfigFromPalette = (palette) => {
    if (palette) {
      setWaterConfig(prev => ({
        ...prev,
        colorDeep: palette.colorDeep,
        colorShallow: palette.colorShallow,
      }));
      addLog(`🎨 Scene colors synced from environment.`);
    }
  };

  // -- Window Management --
  const bringToFront = (id: WindowId) => {
    setWindows(prev => {
      // FIX: Explicitly type `w` as `WindowState` to resolve a TypeScript type inference issue.
      const maxZ = Math.max(...Object.values(prev).map((w: WindowState) => w.zIndex));
      if (prev[id].zIndex === maxZ) return prev; // Already in front
      return {
        ...prev,
        [id]: { ...prev[id], zIndex: maxZ + 1 },
      };
    });
  };

  const toggleWindow = (id: WindowId) => {
    setWindows(prev => {
      const isOpen = !prev[id].isOpen;
      if (isOpen) bringToFront(id);
      addLog(`Window '${id}' ${isOpen ? 'opened' : 'closed'}.`);
      return { ...prev, [id]: { ...prev[id], isOpen } };
    });
  };
  
  const handleSyncFromSky = async () => {
    if (sceneControllerRef.current?.extractPalette && sceneControllerRef.current?.updateWaterConfigFromPalette) {
      addLog('Syncing colors from environment...');
      const palette = await sceneControllerRef.current.extractPalette();
      if (palette) {
        // Re-use the existing update logic which includes logging
        sceneControllerRef.current.updateWaterConfigFromPalette(palette);
      } else {
        addLog('Skybox texture not loaded yet. Cannot sync.');
      }
    }
  };

  const handleToggleSplitView = () => {
    const nextState = !isSplitView;
    setIsSplitView(nextState);
    addLog(`Split view ${nextState ? 'enabled' : 'disabled'}.`);
  };

  const handleHdrUpload = (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.hdr')) {
      addLog('Error: Please select a valid .hdr file.');
      return;
    }
    const url = URL.createObjectURL(file);
    const newOption = { name: `Custom: ${file.name}`, url };
    
    setSkyboxOptionsState(prev => [...prev, newOption]);
    handleWaterConfigChange({ skyboxUrl: url });
    addLog(`Custom HDR '${file.name}' loaded.`);
  };

  // -- Code Panel State --
  const [codeText, setCodeText] = useState(JSON.stringify(waterConfig, null, 2));
  React.useEffect(() => {
    setCodeText(JSON.stringify(waterConfig, null, 2));
  }, [waterConfig]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: theme.Color.Base.Surface[1],
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Stage waterConfig={waterConfig} sceneController={sceneControllerRef} isSplitView={isSplitView} />
      <ThemeToggleButton />
      
      {/* Container for Floating Windows */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {windows.control.isOpen && (
            <FloatingWindow
              {...windows.control}
              onClose={() => toggleWindow('control')}
              onFocus={() => bringToFront('control')}
            >
              <ControlPanel
                waterConfig={waterConfig}
                onWaterPropChange={handleWaterConfigChange}
                onSyncFromSky={handleSyncFromSky}
                isSplitView={isSplitView}
                onToggleSplitView={handleToggleSplitView}
                skyboxOptions={skyboxOptionsState}
                onHdrUpload={handleHdrUpload}
              />
            </FloatingWindow>
          )}
          {windows.code.isOpen && (
            <FloatingWindow
              {...windows.code}
              onClose={() => toggleWindow('code')}
              onFocus={() => bringToFront('code')}
            >
              <CodePanel
                waterConfig={waterConfig}
                codeText={codeText}
                onCodeChange={(e) => setCodeText(e.target.value)}
                onCopyCode={() => { navigator.clipboard.writeText(codeText); addLog('Code copied to clipboard.'); }}
                onFocus={() => {}}
                onBlur={() => {
                  try {
                    const newConfig = JSON.parse(codeText);
                    setWaterConfig(newConfig);
                    addLog('Water config updated from JSON.');
                  } catch (err) {
                    addLog('Error parsing JSON.');
                  }
                }}
              />
            </FloatingWindow>
          )}
          {windows.console.isOpen && (
            <FloatingWindow
              {...windows.console}
              onClose={() => toggleWindow('console')}
              onFocus={() => bringToFront('console')}
            >
              <ConsolePanel logs={logs} />
            </FloatingWindow>
          )}
        </AnimatePresence>
      </div>

      <Dock windows={windows} toggleWindow={toggleWindow} />
    </div>
  );
};

export default MetaPrototype;