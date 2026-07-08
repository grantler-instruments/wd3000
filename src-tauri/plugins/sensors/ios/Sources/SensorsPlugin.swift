import CoreMotion
import Foundation
import Tauri
import UIKit

struct StartWatchArgs: Decodable {
  let sensorIds: [String]
}

private struct SensorCatalogEntry {
  let id: String
  let label: String
  let description: String
  let unit: String?
  let axes: [String]
}

class SensorsPlugin: Plugin {
  private let motionManager = CMMotionManager()
  private var activeSensorIds = Set<String>()

  private let catalog: [SensorCatalogEntry] = [
    SensorCatalogEntry(
      id: "accelerometer",
      label: "Accelerometer",
      description: "Device acceleration including gravity.",
      unit: "g",
      axes: ["x", "y", "z"]
    ),
    SensorCatalogEntry(
      id: "gyroscope",
      label: "Gyroscope",
      description: "Device rotation rate.",
      unit: "rad/s",
      axes: ["x", "y", "z"]
    ),
    SensorCatalogEntry(
      id: "magnetometer",
      label: "Magnetometer",
      description: "Ambient magnetic field.",
      unit: "µT",
      axes: ["x", "y", "z"]
    ),
    SensorCatalogEntry(
      id: "device_motion",
      label: "Device motion",
      description: "Fused attitude, gravity, and user acceleration.",
      unit: nil,
      axes: ["pitch", "roll", "yaw", "gravityX", "gravityY", "gravityZ"]
    ),
  ]

  @objc public func listSensors(_ invoke: Invoke) throws {
    var available: [JSObject] = []

    if motionManager.isAccelerometerAvailable {
      available.append(descriptor(for: catalog[0]))
    }
    if motionManager.isGyroAvailable {
      available.append(descriptor(for: catalog[1]))
    }
    if motionManager.isMagnetometerAvailable {
      available.append(descriptor(for: catalog[2]))
    }
    if motionManager.isDeviceMotionAvailable {
      available.append(descriptor(for: catalog[3]))
    }

    invoke.resolve(available)
  }

  @objc public func startWatch(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(StartWatchArgs.self)
    stopAll()

    for sensorId in args.sensorIds {
      switch sensorId {
      case "accelerometer" where motionManager.isAccelerometerAvailable:
        motionManager.accelerometerUpdateInterval = 0.1
        motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
          guard let self, let data else { return }
          self.emitReading(
            sensorId: sensorId,
            values: [
              "x": data.acceleration.x,
              "y": data.acceleration.y,
              "z": data.acceleration.z,
            ]
          )
        }
        activeSensorIds.insert(sensorId)

      case "gyroscope" where motionManager.isGyroAvailable:
        motionManager.gyroUpdateInterval = 0.1
        motionManager.startGyroUpdates(to: .main) { [weak self] data, _ in
          guard let self, let data else { return }
          self.emitReading(
            sensorId: sensorId,
            values: [
              "x": data.rotationRate.x,
              "y": data.rotationRate.y,
              "z": data.rotationRate.z,
            ]
          )
        }
        activeSensorIds.insert(sensorId)

      case "magnetometer" where motionManager.isMagnetometerAvailable:
        motionManager.magnetometerUpdateInterval = 0.1
        motionManager.startMagnetometerUpdates(to: .main) { [weak self] data, _ in
          guard let self, let data else { return }
          self.emitReading(
            sensorId: sensorId,
            values: [
              "x": data.magneticField.x,
              "y": data.magneticField.y,
              "z": data.magneticField.z,
            ]
          )
        }
        activeSensorIds.insert(sensorId)

      case "device_motion" where motionManager.isDeviceMotionAvailable:
        motionManager.deviceMotionUpdateInterval = 0.1
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
          guard let self, let data else { return }
          self.emitReading(
            sensorId: sensorId,
            values: [
              "pitch": data.attitude.pitch,
              "roll": data.attitude.roll,
              "yaw": data.attitude.yaw,
              "gravityX": data.gravity.x,
              "gravityY": data.gravity.y,
              "gravityZ": data.gravity.z,
            ]
          )
        }
        activeSensorIds.insert(sensorId)

      default:
        continue
      }
    }

    invoke.resolve()
  }

  @objc public func stopWatch(_ invoke: Invoke) throws {
    stopAll()
    invoke.resolve()
  }

  private func descriptor(for entry: SensorCatalogEntry) -> JSObject {
    var object: JSObject = [
      "id": entry.id,
      "label": entry.label,
      "description": entry.description,
      "axes": entry.axes,
    ]
    if let unit = entry.unit {
      object["unit"] = unit
    }
    return object
  }

  private func emitReading(sensorId: String, values: [String: Double]) {
    trigger(
      "sensor-reading",
      [
        "sensorId": sensorId,
        "timestamp": Int(Date().timeIntervalSince1970 * 1000),
        "values": values,
      ]
    )
  }

  private func stopAll() {
    if motionManager.isAccelerometerActive {
      motionManager.stopAccelerometerUpdates()
    }
    if motionManager.isGyroActive {
      motionManager.stopGyroUpdates()
    }
    if motionManager.isMagnetometerActive {
      motionManager.stopMagnetometerUpdates()
    }
    if motionManager.isDeviceMotionActive {
      motionManager.stopDeviceMotionUpdates()
    }
    activeSensorIds.removeAll()
  }
}

@_cdecl("init_plugin_sensors")
func initPlugin() -> Plugin {
  return SensorsPlugin()
}
