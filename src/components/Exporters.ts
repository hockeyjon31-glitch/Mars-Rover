import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

export function exportRoverGLTF(roverRoot: THREE.Group, binary: boolean = true): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    // Clone the rover to strip non-exportable scene helpers if any
    const clone = roverRoot.clone(true);
    // Reset transform so origin is at base center for game engines
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);

    exporter.parse(
      clone,
      (gltf) => {
        try {
          if (gltf instanceof ArrayBuffer) {
            saveArrayBuffer(gltf, 'MarsRover_Vehicle.glb');
          } else {
            const output = JSON.stringify(gltf, null, 2);
            saveString(output, 'MarsRover_Vehicle.gltf');
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      (error) => {
        reject(error);
      },
      {
        binary,
        embedImages: true,
      }
    );
  });
}

export function exportRoverOBJ(roverRoot: THREE.Group): void {
  const exporter = new OBJExporter();
  const clone = roverRoot.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);

  const result = exporter.parse(clone);
  saveString(result, 'MarsRover_Vehicle.obj');
}

function saveArrayBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function saveString(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const GAME_ENGINE_CODE_TEMPLATES = {
  unity: `// Unity 3D - C# Mars Rover Kinematics Controller
using UnityEngine;

public class MarsRoverController : MonoBehaviour
{
    [Header("Drive Motors")]
    public WheelCollider[] leftWheels;  // FL, ML, RL
    public WheelCollider[] rightWheels; // FR, MR, RR
    public float motorTorque = 1200f;
    public float maxSteerAngle = 32f;
    public float brakeTorque = 3000f;

    [Header("Steer Actuators (4-Wheel Ackermann)")]
    public Transform steerPivotFL;
    public Transform steerPivotFR;
    public Transform steerPivotRL;
    public Transform steerPivotRR;

    [Header("Rocker-Bogie Suspension Joints")]
    public Transform rockerLeft;
    public Transform rockerRight;
    public Transform bogieLeft;
    public Transform bogieRight;

    void Update()
    {
        float v = Input.GetAxis("Vertical");
        float h = Input.GetAxis("Horizontal");
        bool handbrake = Input.GetKey(KeyCode.Space);

        // Apply Motor Torque
        foreach (var w in leftWheels)  w.motorTorque = v * motorTorque;
        foreach (var w in rightWheels) w.motorTorque = v * motorTorque;

        // 4-Wheel Steering (Front steer direct, Rear counter-steers)
        float steer = h * maxSteerAngle;
        if (steerPivotFL) steerPivotFL.localEulerAngles = new Vector3(0, steer, 0);
        if (steerPivotFR) steerPivotFR.localEulerAngles = new Vector3(0, steer, 0);
        if (steerPivotRL) steerPivotRL.localEulerAngles = new Vector3(0, -steer * 0.75f, 0);
        if (steerPivotRR) steerPivotRR.localEulerAngles = new Vector3(0, -steer * 0.75f, 0);

        // Brakes
        float currentBrake = handbrake ? brakeTorque : 0f;
        foreach (var w in leftWheels)  w.brakeTorque = currentBrake;
        foreach (var w in rightWheels) w.brakeTorque = currentBrake;
    }
}`,

  godot: `# Godot 4 - GDScript Mars Rover VehicleController
extends VehicleBody3D

@export var engine_force_value : float = 140.0
@export var max_steer_angle : float = 0.55
@export var brake_value : float = 25.0

@onready var wheel_fl = $Wheel_FL
@onready var wheel_fr = $Wheel_FR
@onready var wheel_rl = $Wheel_RL
@onready var wheel_rr = $Wheel_RR

func _physics_process(delta):
    var steer_input = Input.get_axis("ui_right", "ui_left")
    var throttle_input = Input.get_axis("ui_down", "ui_up")
    
    # 4-Wheel Ackermann steering
    steering = steer_input * max_steer_angle
    if wheel_rl and wheel_rr:
        wheel_rl.steering = -steer_input * max_steer_angle * 0.75
        wheel_rr.steering = -steer_input * max_steer_angle * 0.75
        
    engine_force = throttle_input * engine_force_value
    
    if Input.is_action_pressed("ui_select"): # Spacebar
        brake = brake_value
    else:
        brake = 0.0
`,

  threejs: `// Three.js / WebGL Browser Game Integration
import { createRoverModel } from './RoverModel';
import { RoverPhysicsController } from './RoverPhysics';

// 1. Instantiate Rover Model
const { rover, nodes } = createRoverModel('nasa_classic');
scene.add(rover);

// 2. Attach Physics Controller
const controller = new RoverPhysicsController(nodes, scene, (x, z) => getTerrainHeight(x, z));

// 3. Game Loop
function animate(delta) {
  const telemetry = controller.update(delta, {
    forward: keys['KeyW'],
    backward: keys['KeyS'],
    left: keys['KeyA'],
    right: keys['KeyD'],
    handbrake: keys['Space'],
    pivotTurn: keys['KeyQ'],
    boost: keys['ShiftLeft'],
  });
}
`,
};
