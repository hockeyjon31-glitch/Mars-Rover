import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  AppMode,
  ArmPose,
  CameraView,
  RoverGameControls,
  RoverSkin,
  RoverTelemetry,
  RoverVehicleType,
  ScienceSamplePoint,
} from './types';
import { RoverStudio } from './components/RoverStudio';
import { UIOverlay } from './components/UIOverlay';

export default function App() {
  const [vehicleType, setVehicleType] = useState<RoverVehicleType>('lunar_lrv');
  const [mode, setMode] = useState<AppMode>('drive');
  const [cameraView, setCameraView] = useState<CameraView>('chase');
  const [currentSkin, setCurrentSkin] = useState<RoverSkin>('apollo_historic');
  const [explodeProgress, setExplodeProgress] = useState<number>(0);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isHeadlightsOn, setIsHeadlightsOn] = useState<boolean>(true);
  const [armPose, setArmPose] = useState<ArmPose>('stowed');

  const [controls, setControls] = useState<RoverGameControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    pivotTurn: false,
    boost: false,
  });

  const [telemetry, setTelemetry] = useState<RoverTelemetry>({
    speedKmh: 0,
    speedMs: 0,
    headingDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    batteryPct: 100,
    powerDrawWatts: 110,
    distanceTraveledMeters: 0,
    samplesCollected: 0,
    totalSamples: 4,
    isHeadlightsOn: true,
    isDrilling: false,
    isLaserFiring: false,
    mastAzimuth: 0,
    mastElevation: 0,
    driveGear: 'P',
  });

  const [discoveredSamples, setDiscoveredSamples] = useState<ScienceSamplePoint[]>([]);
  const [lastDiscovered, setLastDiscovered] = useState<ScienceSamplePoint | null>(null);

  const roverRefOutput = useRef<THREE.Group | null>(null);
  const triggerLaserRef = useRef<(() => void) | null>(null);
  const triggerDrillRef = useRef<(() => void) | null>(null);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing input if an input field is focused
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      // Prevent window scrolling on arrow keys or space bar
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) ||
        [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
      ) {
        e.preventDefault();
      }

      // Driving controls
      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
        setControls((prev) => (prev.forward ? prev : { ...prev, forward: true }));
      } else if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
        setControls((prev) => (prev.backward ? prev : { ...prev, backward: true }));
      } else if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
        setControls((prev) => (prev.left ? prev : { ...prev, left: true }));
      } else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
        setControls((prev) => (prev.right ? prev : { ...prev, right: true }));
      } else if (code === 'Space' || key === ' ') {
        setControls((prev) => (prev.handbrake ? prev : { ...prev, handbrake: true }));
      } else if (code === 'ShiftLeft' || code === 'ShiftRight' || e.shiftKey) {
        setControls((prev) => (prev.boost ? prev : { ...prev, boost: true }));
      } else if (code === 'KeyQ' || key === 'q') {
        setControls((prev) => ({ ...prev, pivotTurn: !prev.pivotTurn }));
      } else if (code === 'KeyH' || key === 'h') {
        setIsHeadlightsOn((prev) => !prev);
      } else if (code === 'KeyL' || key === 'l') {
        if (triggerLaserRef.current) triggerLaserRef.current();
      } else if (code === 'KeyE' || key === 'e') {
        if (triggerDrillRef.current) triggerDrillRef.current();
      } else if (code === 'KeyC' || key === 'c') {
        // Cycle cameras: chase -> cockpit -> wheel -> free -> chase
        setCameraView((prev) => {
          const cycle: Record<CameraView, CameraView> = {
            chase: 'cockpit',
            cockpit: 'wheel',
            wheel: 'free',
            free: 'chase',
          };
          return cycle[prev] || 'chase';
        });
      } else if (code === 'Digit1' || code === 'Numpad1' || key === '1') {
        setCameraView('chase');
      } else if (code === 'Digit2' || code === 'Numpad2' || key === '2') {
        setCameraView('cockpit');
      } else if (code === 'Digit3' || code === 'Numpad3' || key === '3') {
        setCameraView('wheel');
      } else if (code === 'Digit4' || code === 'Numpad4' || key === '4') {
        setCameraView('free');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
        setControls((prev) => (!prev.forward ? prev : { ...prev, forward: false }));
      } else if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
        setControls((prev) => (!prev.backward ? prev : { ...prev, backward: false }));
      } else if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
        setControls((prev) => (!prev.left ? prev : { ...prev, left: false }));
      } else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
        setControls((prev) => (!prev.right ? prev : { ...prev, right: false }));
      } else if (code === 'Space' || key === ' ') {
        setControls((prev) => (!prev.handbrake ? prev : { ...prev, handbrake: false }));
      } else if (code === 'ShiftLeft' || code === 'ShiftRight' || !e.shiftKey) {
        setControls((prev) => (!prev.boost ? prev : { ...prev, boost: false }));
      }
    };

    // Reset all controls when window loses focus
    const handleBlur = () => {
      setControls({
        forward: false,
        backward: false,
        left: false,
        right: false,
        handbrake: false,
        pivotTurn: false,
        boost: false,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleSampleDiscovered = useCallback((sample: ScienceSamplePoint) => {
    setDiscoveredSamples((prev) => {
      if (prev.some((s) => s.id === sample.id)) return prev;
      return [...prev, sample];
    });
    setLastDiscovered(sample);
    setTimeout(() => setLastDiscovered(null), 7000);
  }, []);

  const handleSampleCollected = useCallback((sample: ScienceSamplePoint) => {
    setDiscoveredSamples((prev) =>
      prev.map((s) => (s.id === sample.id ? { ...s, collected: true } : s))
    );
  }, []);

  const handleFireLaser = () => {
    if (triggerLaserRef.current) triggerLaserRef.current();
  };

  const handleFireDrill = () => {
    if (triggerDrillRef.current) triggerDrillRef.current();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {/* 3D WebGL Canvas */}
      <RoverStudio
        vehicleType={vehicleType}
        mode={mode}
        cameraView={cameraView}
        currentSkin={currentSkin}
        explodeProgress={explodeProgress}
        isWireframe={isWireframe}
        isHeadlightsOn={isHeadlightsOn}
        armPose={armPose}
        controls={controls}
        onTelemetryUpdate={setTelemetry}
        onSampleDiscovered={handleSampleDiscovered}
        onSampleCollected={handleSampleCollected}
        roverRefOutput={roverRefOutput}
        triggerLaserRef={triggerLaserRef}
        triggerDrillRef={triggerDrillRef}
      />

      {/* Sci-Fi NASA / Apollo Telemetry & Game Dev HUD */}
      <UIOverlay
        vehicleType={vehicleType}
        setVehicleType={setVehicleType}
        mode={mode}
        setMode={setMode}
        cameraView={cameraView}
        setCameraView={setCameraView}
        telemetry={telemetry}
        currentSkin={currentSkin}
        setCurrentSkin={setCurrentSkin}
        explodeProgress={explodeProgress}
        setExplodeProgress={setExplodeProgress}
        isWireframe={isWireframe}
        setIsWireframe={setIsWireframe}
        isHeadlightsOn={isHeadlightsOn}
        setIsHeadlightsOn={setIsHeadlightsOn}
        armPose={armPose}
        setArmPose={setArmPose}
        controls={controls}
        setControls={setControls}
        onFireLaser={handleFireLaser}
        onFireDrill={handleFireDrill}
        discoveredSamples={discoveredSamples}
        lastDiscovered={lastDiscovered}
        roverRefOutput={roverRefOutput}
      />
    </main>
  );
}
