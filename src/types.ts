export type AppMode = 'drive' | 'studio';

export type CameraView = 'chase' | 'cockpit' | 'free' | 'wheel';

export type ArmPose = 'stowed' | 'sample' | 'scan' | 'selfie';

export type RoverSkin = 'nasa_classic' | 'stealth_black' | 'ares_orange' | 'martian_dust';

export interface RoverSkinConfig {
  id: RoverSkin;
  name: string;
  description: string;
  primaryColor: number;
  secondaryColor: number;
  chassisFoilColor: number;
  accentColor: number;
  wheelColor: number;
  roughness: number;
  metalness: number;
}

export interface RoverTelemetry {
  speedKmh: number;
  speedMs: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  batteryPct: number;
  powerDrawWatts: number;
  distanceTraveledMeters: number;
  samplesCollected: number;
  totalSamples: number;
  isHeadlightsOn: boolean;
  isDrilling: boolean;
  isLaserFiring: boolean;
  mastAzimuth: number;
  mastElevation: number;
  driveGear: 'P' | 'D' | 'R' | 'PIVOT';
}

export interface ScienceSamplePoint {
  id: string;
  name: string;
  type: 'Hematite Spherules' | 'Silica Hydrate' | 'Basaltic Regolith' | 'Organic Carbon Candidate';
  position: [number, number, number];
  collected: boolean;
  discovered: boolean;
  analysisText: string;
}

export interface RoverGameControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  pivotTurn: boolean;
  boost: boolean;
}
