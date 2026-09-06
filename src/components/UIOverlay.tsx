import React, { useState } from 'react';
import {
  AppMode,
  ArmPose,
  CameraView,
  RoverGameControls,
  RoverSkin,
  RoverTelemetry,
  RoverVehicleType,
  ScienceSamplePoint,
} from '../types';
import { ROVER_SKINS } from './RoverModel';
import { LUNAR_ROVER_SKINS } from './LunarRoverModel';
import { exportRoverGLTF, exportRoverOBJ, GAME_ENGINE_CODE_TEMPLATES } from './Exporters';
import { soundManager } from './SoundEffects';
import * as THREE from 'three';
import {
  Compass,
  Zap,
  Gauge,
  Video,
  Volume2,
  VolumeX,
  Download,
  Lightbulb,
  Radio,
  Crosshair,
  Sliders,
  ChevronRight,
  Code,
  Check,
  Copy,
  X,
  Sparkles,
  Layers,
  Activity,
  Maximize2,
  RotateCw,
  Moon,
  Flame,
} from 'lucide-react';

interface UIOverlayProps {
  vehicleType: RoverVehicleType;
  setVehicleType: (vt: RoverVehicleType) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  cameraView: CameraView;
  setCameraView: (v: CameraView) => void;
  telemetry: RoverTelemetry;
  currentSkin: RoverSkin;
  setCurrentSkin: (s: RoverSkin) => void;
  explodeProgress: number;
  setExplodeProgress: (v: number) => void;
  isWireframe: boolean;
  setIsWireframe: (v: boolean) => void;
  isHeadlightsOn: boolean;
  setIsHeadlightsOn: (v: boolean) => void;
  armPose: ArmPose;
  setArmPose: (p: ArmPose) => void;
  controls: RoverGameControls;
  setControls: React.Dispatch<React.SetStateAction<RoverGameControls>>;
  onFireLaser: () => void;
  onFireDrill: () => void;
  discoveredSamples: ScienceSamplePoint[];
  lastDiscovered: ScienceSamplePoint | null;
  roverRefOutput: React.MutableRefObject<THREE.Group | null>;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  vehicleType,
  setVehicleType,
  mode,
  setMode,
  cameraView,
  setCameraView,
  telemetry,
  currentSkin,
  setCurrentSkin,
  explodeProgress,
  setExplodeProgress,
  isWireframe,
  setIsWireframe,
  isHeadlightsOn,
  setIsHeadlightsOn,
  armPose,
  setArmPose,
  controls,
  setControls,
  onFireLaser,
  onFireDrill,
  discoveredSamples,
  lastDiscovered,
  roverRefOutput,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'unity' | 'godot' | 'threejs'>('unity');
  const [copiedCode, setCopiedCode] = useState(false);
  const [exportingGltf, setExportingGltf] = useState(false);

  const isLunar = vehicleType === 'lunar_lrv';

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const handleExportGLB = async () => {
    if (!roverRefOutput.current) return;
    setExportingGltf(true);
    try {
      const filenamePrefix = isLunar ? 'Apollo_LunarRover_LRV' : 'Perseverance_MarsRover';
      await exportRoverGLTF(roverRefOutput.current, true, filenamePrefix);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExportingGltf(false);
    }
  };

  const handleExportOBJ = () => {
    if (!roverRefOutput.current) return;
    const filenamePrefix = isLunar ? 'Apollo_LunarRover_LRV' : 'Perseverance_MarsRover';
    exportRoverOBJ(roverRefOutput.current, filenamePrefix);
  };

  const handleCopyCode = () => {
    const code = GAME_ENGINE_CODE_TEMPLATES[activeCodeTab];
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Get current available skins based on vehicle type
  const availableSkins = isLunar ? LUNAR_ROVER_SKINS : ROVER_SKINS;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden font-sans">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header
        id="rover-top-nav"
        className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 w-full max-w-7xl mx-auto bg-neutral-900/90 backdrop-blur-md border border-neutral-700/60 rounded-xl px-3 py-2.5 shadow-xl text-neutral-100"
      >
        <div className="flex items-center gap-3">
          {/* Planetary Mission / Vehicle Selector */}
          <div className="flex items-center bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
            <button
              id="switch-mars-btn"
              onClick={() => {
                if (vehicleType !== 'mars_perseverance') {
                  setVehicleType('mars_perseverance');
                  setCurrentSkin('nasa_classic');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                !isLunar
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-300" />
              <span>Mars Perseverance</span>
            </button>

            <button
              id="switch-lunar-btn"
              onClick={() => {
                if (vehicleType !== 'lunar_lrv') {
                  setVehicleType('lunar_lrv');
                  setCurrentSkin('apollo_historic');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                isLunar
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-sky-200" />
              <span>Apollo 15 Lunar LRV</span>
            </button>
          </div>

          <div className="hidden sm:block">
            <div className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-white">
              {isLunar ? 'APOLLO 15/17 LRV' : 'PERSEVERANCE M-VI'}
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                isLunar ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              }`}>
                {isLunar ? '4WD WIRE TIRES' : '6WD ROCKER-BOGIE'}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              {isLunar ? 'T-Handle Control • High-Gain Antenna • Regolith Wire Treads' : 'Autonomous 5-DOF Arm • SuperCam Mast • Coring Drill'}
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-neutral-800/90 rounded-lg p-1 border border-neutral-700/50">
          <button
            id="mode-drive-btn"
            onClick={() => setMode('drive')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'drive'
                ? isLunar ? 'bg-sky-600 text-white shadow-sm' : 'bg-orange-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Drive & Simulation
          </button>
          <button
            id="mode-studio-btn"
            onClick={() => setMode('studio')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'studio'
                ? isLunar ? 'bg-sky-600 text-white shadow-sm' : 'bg-orange-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Vehicle Inspector & Rig
          </button>
        </div>

        {/* Camera Views & Quick Actions */}
        <div className="flex items-center gap-2">
          {mode === 'drive' && (
            <div className="flex items-center gap-1 bg-neutral-800/90 rounded-lg p-1 border border-neutral-700/50 text-xs">
              <span className="text-neutral-400 px-1 text-[11px] hidden xs:inline flex items-center gap-1">
                <Video className={`w-3 h-3 ${isLunar ? 'text-sky-400' : 'text-orange-400'}`} />
                Cam:
              </span>
              {(
                [
                  { id: 'chase', label: 'Chase', key: '1' },
                  { id: 'cockpit', label: isLunar ? 'Driver' : 'Cockpit', key: '2' },
                  { id: 'wheel', label: 'Wheel', key: '3' },
                  { id: 'free', label: 'Free', key: '4' },
                ] as const
              ).map(({ id, label, key }) => (
                <button
                  key={id}
                  id={`cam-view-${id}-btn`}
                  onClick={(e) => {
                    setCameraView(id);
                    e.currentTarget.blur();
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    cameraView === id
                      ? isLunar ? 'bg-sky-600 text-white shadow-sm font-semibold' : 'bg-orange-600 text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
                  }`}
                  title={`${label} View [Press ${key} or C to cycle]`}
                >
                  {label} <span className="opacity-50 text-[9px]">[{key}]</span>
                </button>
              ))}
            </div>
          )}

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={toggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 text-neutral-300 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className={`w-4 h-4 ${isLunar ? 'text-sky-400' : 'text-orange-400'}`} />
            )}
          </button>

          {/* Export 3D for Game Button */}
          <button
            id="open-export-modal-btn"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export for Game</span>
          </button>
        </div>
      </header>

      {/* Discovery Notification Toast */}
      {lastDiscovered && (
        <div className="pointer-events-auto self-center mt-3 bg-neutral-900/90 border border-sky-500/50 rounded-lg p-3 text-xs shadow-2xl max-w-md animate-fade-in text-neutral-200 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-sky-400">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>SCIENCE WAYPOINT DETECTED</span>
          </div>
          <div className="font-semibold text-white mt-1">
            {lastDiscovered.name} ({lastDiscovered.type})
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">{lastDiscovered.analysisText}</div>
          <div className="text-[10px] text-sky-300 mt-1 font-mono">
            Approach within 4m & activate Coring Tool [E] to collect sample
          </div>
        </div>
      )}

      {/* ================= MIDDLE / MODE SPECIFIC OVERLAYS ================= */}
      <div className="flex-1 flex justify-between items-end my-2 pointer-events-none">
        {/* DRIVE MODE: Mission Instrument Cluster (Left Side) */}
        {mode === 'drive' ? (
          <div
            id="drive-telemetry-hud"
            className="pointer-events-auto bg-neutral-900/85 backdrop-blur-md border border-neutral-700/70 rounded-xl p-3.5 shadow-2xl text-neutral-100 flex flex-col gap-3 min-w-[220px]"
          >
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
              <span className="text-[11px] font-mono tracking-wider text-neutral-400">
                {isLunar ? 'LUNAR TELEMETRY (APOLLO)' : 'MISSION TELEMETRY (MARS)'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isLunar ? 'VHF HIGH-GAIN' : 'DSN LINK 42.1K'}
              </span>
            </div>

            {/* Speed Gauge & Gear */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
                  {telemetry.speedKmh.toFixed(1)}
                  <span className="text-xs font-normal text-neutral-400">km/h</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400">
                  {telemetry.speedMs.toFixed(1)} m/s ground
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-[10px] text-neutral-400">GEAR</div>
                <div className="font-mono text-lg font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                  {telemetry.driveGear}
                </div>
              </div>
            </div>

            {/* Inclinometer: Pitch & Roll */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-neutral-800/60 p-2 rounded-lg border border-neutral-700/50">
                <div className="text-[10px] text-neutral-400 mb-0.5">PITCH</div>
                <div className="font-mono font-semibold flex items-baseline justify-between">
                  <span>{telemetry.pitchDeg > 0 ? `+${telemetry.pitchDeg}°` : `${telemetry.pitchDeg}°`}</span>
                  <span className={`text-[10px] ${Math.abs(telemetry.pitchDeg) > 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {Math.abs(telemetry.pitchDeg) > 20 ? 'STEEP' : 'NOMINAL'}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-800/60 p-2 rounded-lg border border-neutral-700/50">
                <div className="text-[10px] text-neutral-400 mb-0.5">ROLL</div>
                <div className="font-mono font-semibold flex items-baseline justify-between">
                  <span>{telemetry.rollDeg > 0 ? `+${telemetry.rollDeg}°` : `${telemetry.rollDeg}°`}</span>
                  <span className={`text-[10px] ${Math.abs(telemetry.rollDeg) > 18 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {Math.abs(telemetry.rollDeg) > 18 ? 'BANK' : 'NOMINAL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Battery & Odometer */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center text-neutral-300">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Battery Reserve</span>
                </span>
                <span className="font-mono text-white font-semibold">
                  {telemetry.batteryPct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${telemetry.batteryPct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1 border-t border-neutral-700/40">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-neutral-400" />
                Heading: <b className="text-neutral-200 font-mono">{telemetry.headingDeg}°</b>
              </span>
              <span>
                Traveled: <b className="text-neutral-200 font-mono">{telemetry.distanceTraveledMeters.toFixed(0)}m</b>
              </span>
            </div>

            {/* Science Targets Discovered / Collected */}
            <div className="flex items-center justify-between text-xs bg-neutral-800/80 p-2 rounded-lg border border-neutral-700/60">
              <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span>{isLunar ? 'Lunar Regolith Samples' : 'Martian Rock Samples'}</span>
              </span>
              <span className="font-mono font-bold text-sky-400">
                {telemetry.samplesCollected} / {telemetry.totalSamples}
              </span>
            </div>

            {/* Quick Interactive Tool Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="action-laser-btn"
                onClick={onFireLaser}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600/25 hover:bg-red-600/40 active:bg-red-600/60 border border-red-500/50 text-red-300 text-xs font-semibold shadow-sm transition-all"
                title={isLunar ? 'Optical Sensor Laser Pulse [L]' : 'Fire SuperCam ChemCam Laser [L]'}
              >
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>Laser Pulse [L]</span>
              </button>

              <button
                id="action-drill-btn"
                onClick={onFireDrill}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 active:bg-sky-600/60 border border-sky-500/50 text-sky-300 text-xs font-semibold shadow-sm transition-all"
                title={isLunar ? 'Geological Core Sampler [E]' : 'Activate Robotic Coring Drill [E]'}
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Collect Core [E]</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                id="action-lights-btn"
                onClick={() => setIsHeadlightsOn(!isHeadlightsOn)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  isHeadlightsOn
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Lights [H]</span>
              </button>

              <button
                id="action-pivot-btn"
                onClick={() => setControls((c) => ({ ...c, pivotTurn: !c.pivotTurn }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  controls.pivotTurn
                    ? isLunar ? 'bg-sky-500/20 text-sky-300 border-sky-500/50' : 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Pivot Turn [Q]</span>
              </button>
            </div>
          </div>
        ) : (
          /* STUDIO / INSPECTION MODE (Left Side Customizer & Rig Controls) */
          <div
            id="studio-inspector-panel"
            className="pointer-events-auto bg-neutral-900/85 backdrop-blur-md border border-neutral-700/70 rounded-xl p-4 shadow-2xl text-neutral-100 flex flex-col gap-3.5 max-w-xs"
          >
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
              <span className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                <Sliders className={`w-4 h-4 ${isLunar ? 'text-sky-400' : 'text-orange-400'}`} />
                VEHICLE CUSTOMIZER
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {isLunar ? 'APOLLO LRV RIG' : 'PERSEVERANCE RIG'}
              </span>
            </div>

            {/* Livery / Skin Selector */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1.5">
                VEHICLE LIVERY / MATERIAL
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {(Object.keys(availableSkins) as RoverSkin[]).map((key) => {
                  const skin = availableSkins[key];
                  if (!skin) return null;
                  const active = currentSkin === key;
                  return (
                    <button
                      key={key}
                      id={`skin-select-${key}-btn`}
                      onClick={() => setCurrentSkin(key)}
                      className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        active
                          ? isLunar
                            ? 'bg-sky-500/20 border-sky-500 text-white'
                            : 'bg-orange-500/20 border-orange-500 text-white'
                          : 'bg-neutral-800/70 border-neutral-700/70 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{skin.name}</div>
                      <div className="text-[10px] text-neutral-400 line-clamp-1">{skin.description}</div>
                      <div className="flex gap-1.5 mt-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-600"
                          style={{ backgroundColor: `#${skin.primaryColor.toString(16).padStart(6, '0')}` }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-600"
                          style={{ backgroundColor: `#${skin.chassisFoilColor.toString(16).padStart(6, '0')}` }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-600"
                          style={{ backgroundColor: `#${skin.accentColor.toString(16).padStart(6, '0')}` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modular Explode View Slider */}
            <div>
              <div className="flex justify-between items-center text-[11px] font-semibold text-neutral-300 mb-1">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  EXPLODE COMPONENT VIEW
                </span>
                <span className="font-mono text-sky-400">{Math.round(explodeProgress * 100)}%</span>
              </div>
              <input
                id="explode-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeProgress}
                onChange={(e) => setExplodeProgress(parseFloat(e.target.value))}
                className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
              />
              <div className="text-[10px] text-neutral-400 mt-1">
                {isLunar
                  ? 'Isolates Tubular Chassis, Wire Wheels, Seats, Antenna & Console'
                  : 'Isolates Chassis, Rocker-Bogie, Wheels, Mast & Arm'}
              </div>
            </div>

            {/* Wireframe & Lighting */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="toggle-wireframe-btn"
                onClick={() => setIsWireframe(!isWireframe)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                  isWireframe
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                }`}
              >
                Wireframe: {isWireframe ? 'ON' : 'OFF'}
              </button>

              <button
                id="toggle-lights-studio-btn"
                onClick={() => setIsHeadlightsOn(!isHeadlightsOn)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                  isHeadlightsOn
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                }`}
              >
                Headlights: {isHeadlightsOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Articulation / Robotic Arm Pose Selection */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1.5">
                {isLunar ? 'ANTENNA & SAMPLER ARTICULATION' : '5-DOF ROBOTIC ARM POSE'}
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(['stowed', 'sample', 'scan', 'selfie'] as ArmPose[]).map((pose) => (
                  <button
                    key={pose}
                    id={`arm-pose-${pose}-btn`}
                    onClick={() => setArmPose(pose)}
                    className={`py-1.5 px-2 rounded-md capitalize font-medium transition-all border ${
                      armPose === pose
                        ? 'bg-amber-600/30 text-amber-300 border-amber-500/60'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
                    }`}
                  >
                    {pose}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT SIDE: On-Screen Touch Joystick & Driving Controls for mobile/desktop */}
        {mode === 'drive' && (
          <div id="drive-controls-guide" className="pointer-events-auto flex flex-col items-end gap-2">
            {/* Keyboard Guide Box */}
            <div className="hidden md:flex flex-col bg-neutral-900/85 backdrop-blur-md border border-neutral-700/60 rounded-xl p-3 text-[11px] text-neutral-300 shadow-xl min-w-[210px]">
              <span className="font-bold text-neutral-200 mb-1.5 flex items-center justify-between">
                <span>ROVER CONTROLS</span>
                <span className={`text-[10px] font-mono ${isLunar ? 'text-sky-400' : 'text-orange-400'}`}>
                  WASD / ARROWS
                </span>
              </span>
              <div className="grid grid-cols-2 gap-y-1 gap-x-2.5 font-mono text-[10px]">
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    W / S
                  </span>{' '}
                  Drive
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    A / D
                  </span>{' '}
                  Steer
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    SPACE
                  </span>{' '}
                  Brake
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    SHIFT
                  </span>{' '}
                  Boost
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    Q
                  </span>{' '}
                  Pivot
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    C
                  </span>{' '}
                  Cycle Cam
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    1 - 4
                  </span>{' '}
                  Cameras
                </div>
                <div>
                  <span className="text-white font-bold bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">
                    E / L
                  </span>{' '}
                  Tool/Laser
                </div>
              </div>
            </div>

            {/* Touch D-PAD for Mobile / Mouse Click driving */}
            <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-700/60 rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-1 touch-none select-none">
              <button
                id="touch-forward-btn"
                onPointerDown={(e) => {
                  e.currentTarget.blur();
                  setControls((c) => ({ ...c, forward: true }));
                }}
                onPointerUp={() => setControls((c) => ({ ...c, forward: false }))}
                onPointerLeave={() => setControls((c) => ({ ...c, forward: false }))}
                onPointerCancel={() => setControls((c) => ({ ...c, forward: false }))}
                className="w-12 h-11 bg-neutral-800 hover:bg-neutral-700 active:bg-orange-600 rounded-lg text-white font-bold flex items-center justify-center shadow transition-all active:scale-95"
                title="Drive Forward [W / Up]"
              >
                ▲
              </button>
              <div className="flex gap-1">
                <button
                  id="touch-left-btn"
                  onPointerDown={(e) => {
                    e.currentTarget.blur();
                    setControls((c) => ({ ...c, left: true }));
                  }}
                  onPointerUp={() => setControls((c) => ({ ...c, left: false }))}
                  onPointerLeave={() => setControls((c) => ({ ...c, left: false }))}
                  onPointerCancel={() => setControls((c) => ({ ...c, left: false }))}
                  className="w-12 h-11 bg-neutral-800 hover:bg-neutral-700 active:bg-orange-600 rounded-lg text-white font-bold flex items-center justify-center shadow transition-all active:scale-95"
                  title="Steer Left [A / Left]"
                >
                  ◀
                </button>
                <button
                  id="touch-brake-btn"
                  onPointerDown={(e) => {
                    e.currentTarget.blur();
                    setControls((c) => ({ ...c, handbrake: true }));
                  }}
                  onPointerUp={() => setControls((c) => ({ ...c, handbrake: false }))}
                  onPointerLeave={() => setControls((c) => ({ ...c, handbrake: false }))}
                  onPointerCancel={() => setControls((c) => ({ ...c, handbrake: false }))}
                  className="w-12 h-11 bg-neutral-800 hover:bg-red-900/60 active:bg-red-600 rounded-lg text-red-400 font-bold text-[11px] flex items-center justify-center shadow border border-red-500/30 transition-all active:scale-95"
                  title="Handbrake [Space]"
                >
                  STOP
                </button>
                <button
                  id="touch-right-btn"
                  onPointerDown={(e) => {
                    e.currentTarget.blur();
                    setControls((c) => ({ ...c, right: true }));
                  }}
                  onPointerUp={() => setControls((c) => ({ ...c, right: false }))}
                  onPointerLeave={() => setControls((c) => ({ ...c, right: false }))}
                  onPointerCancel={() => setControls((c) => ({ ...c, right: false }))}
                  className="w-12 h-11 bg-neutral-800 hover:bg-neutral-700 active:bg-orange-600 rounded-lg text-white font-bold flex items-center justify-center shadow transition-all active:scale-95"
                  title="Steer Right [D / Right]"
                >
                  ▶
                </button>
              </div>
              <button
                id="touch-backward-btn"
                onPointerDown={(e) => {
                  e.currentTarget.blur();
                  setControls((c) => ({ ...c, backward: true }));
                }}
                onPointerUp={() => setControls((c) => ({ ...c, backward: false }))}
                onPointerLeave={() => setControls((c) => ({ ...c, backward: false }))}
                onPointerCancel={() => setControls((c) => ({ ...c, backward: false }))}
                className="w-12 h-11 bg-neutral-800 hover:bg-neutral-700 active:bg-orange-600 rounded-lg text-white font-bold flex items-center justify-center shadow transition-all active:scale-95"
                title="Reverse [S / Down]"
              >
                ▼
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= 3D GAME EXPORT MODAL ================= */}
      {showExportModal && (
        <div
          id="export-modal-backdrop"
          className="pointer-events-auto fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Export {isLunar ? 'Apollo Lunar Rover' : 'Mars Rover'} for Game Engine
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Optimized low-draw-call hierarchy for Unity, Godot, Unreal, and Three.js/WebGL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model Download Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700/80 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-sky-400 flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> GLTF / GLB Binary Model
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Complete 3D mesh with embedded PBR materials, named suspension nodes, and origin centered at
                    wheels base.
                  </div>
                </div>
                <button
                  id="download-glb-btn"
                  onClick={handleExportGLB}
                  disabled={exportingGltf}
                  className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-semibold shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {exportingGltf ? 'Exporting...' : 'Download .GLB File (Recommended)'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700/80 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> Wavefront OBJ Model
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Standard geometry file for 3D modeling packages (Blender, Maya) or legacy engine importers.
                  </div>
                </div>
                <button
                  id="download-obj-btn"
                  onClick={handleExportOBJ}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-98 text-white text-xs font-semibold shadow transition-all flex items-center justify-center gap-1.5"
                >
                  Download .OBJ File
                </button>
              </div>
            </div>

            {/* Code Integration Snippets for Game Engines */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-orange-400" />
                  GAME CONTROLLER CODE TEMPLATES
                </span>
                <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg">
                  {(['unity', 'godot', 'threejs'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveCodeTab(tab)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all uppercase ${
                        activeCodeTab === tab
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex-1 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden min-h-[160px]">
                <pre className="p-3 text-[11px] font-mono text-neutral-300 overflow-auto h-full max-h-[180px]">
                  {GAME_ENGINE_CODE_TEMPLATES[activeCodeTab]}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs shadow border border-neutral-700 transition-all"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
