import CoreMotion
import Foundation
import Tauri
import UIKit

struct StartWatchArgs: Decodable {
  let sensorIds: [String]
  let channel: Channel?
}

private struct SensorDescriptorResponse: Encodable {
  let id: String
  let label: String
  let description: String
  let unit: String?
  let axes: [String]
}

private struct SensorCatalogEntry {
  let id: String
  let label: String
  let description: String
  let unit: String?
  let axes: [String]
}

private struct SensorReadingPayload: Encodable {
  let sensorId: String
  let timestamp: Int
  let values: [String: Double]
}

class SensorsPlugin: Plugin {
  private let motionManager = CMMotionManager()
  private let altimeter = CMAltimeter()
  private let pedometer = CMPedometer()
  private var activeSensorIds = Set<String>()
  private var readingChannel: Channel?
  private var usesSharedDeviceMotion = false

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
      id: "gravity",
      label: "Gravity",
      description: "Gravity vector from fused device motion.",
      unit: "g",
      axes: ["x", "y", "z"]
    ),
    SensorCatalogEntry(
      id: "linear_acceleration",
      label: "Linear acceleration",
      description: "User acceleration without gravity.",
      unit: "g",
      axes: ["x", "y", "z"]
    ),
    SensorCatalogEntry(
      id: "rotation_vector",
      label: "Rotation vector",
      description: "Device orientation as a quaternion.",
      unit: nil,
      axes: ["x", "y", "z", "w"]
    ),
    SensorCatalogEntry(
      id: "device_motion",
      label: "Device motion",
      description: "Fused attitude, gravity, user acceleration, and rotation rate.",
      unit: nil,
      axes: [
        "pitch", "roll", "yaw",
        "gravityX", "gravityY", "gravityZ",
        "userAccelX", "userAccelY", "userAccelZ",
        "rotationX", "rotationY", "rotationZ",
      ]
    ),
    SensorCatalogEntry(
      id: "pressure",
      label: "Barometer",
      description: "Relative altitude and atmospheric pressure from the barometer.",
      unit: "hPa",
      axes: ["pressure", "relativeAltitude"]
    ),
    SensorCatalogEntry(
      id: "pedometer",
      label: "Pedometer",
      description: "Live step count, distance, pace, and floors from Core Motion.",
      unit: nil,
      axes: ["steps", "distance", "pace", "cadence", "floorsAscended", "floorsDescended"]
    ),
  ]

  private var catalogById: [String: SensorCatalogEntry] {
    Dictionary(uniqueKeysWithValues: catalog.map { ($0.id, $0) })
  }

  @objc public func listSensors(_ invoke: Invoke) throws {
    var available: [SensorDescriptorResponse] = []

    if motionManager.isAccelerometerAvailable, let entry = catalogById["accelerometer"] {
      available.append(descriptor(for: entry))
    }
    if motionManager.isGyroAvailable, let entry = catalogById["gyroscope"] {
      available.append(descriptor(for: entry))
    }
    if motionManager.isMagnetometerAvailable, let entry = catalogById["magnetometer"] {
      available.append(descriptor(for: entry))
    }
    if motionManager.isDeviceMotionAvailable {
      for id in ["gravity", "linear_acceleration", "rotation_vector", "device_motion"] {
        if let entry = catalogById[id] {
          available.append(descriptor(for: entry))
        }
      }
    }
    if CMAltimeter.isRelativeAltitudeAvailable(), let entry = catalogById["pressure"] {
      available.append(descriptor(for: entry))
    }
    if CMPedometer.isStepCountingAvailable(), let entry = catalogById["pedometer"] {
      available.append(descriptor(for: entry))
    }

    invoke.resolve(available)
  }

  @objc public func startWatch(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(StartWatchArgs.self)
    stopAll()
    readingChannel = args.channel

    let sharedMotionIds: Set<String> = [
      "device_motion",
      "gravity",
      "linear_acceleration",
      "rotation_vector",
    ]
    let requested = Set(args.sensorIds)
    usesSharedDeviceMotion =
      !requested.isDisjoint(with: sharedMotionIds) && motionManager.isDeviceMotionAvailable

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

      case "gravity", "linear_acceleration", "rotation_vector", "device_motion"
      where motionManager.isDeviceMotionAvailable:
        activeSensorIds.insert(sensorId)

      case "pressure" where CMAltimeter.isRelativeAltitudeAvailable():
        altimeter.startRelativeAltitudeUpdates(to: .main) { [weak self] data, _ in
          guard let self, let data else { return }
          // Core Motion reports kPa; Android barometer uses hPa.
          self.emitReading(
            sensorId: sensorId,
            values: [
              "pressure": data.pressure.doubleValue * 10.0,
              "relativeAltitude": data.relativeAltitude.doubleValue,
            ]
          )
        }
        activeSensorIds.insert(sensorId)

      case "pedometer" where CMPedometer.isStepCountingAvailable():
        pedometer.startUpdates(from: Date()) { [weak self] data, _ in
          guard let self, let data else { return }
          self.emitReading(
            sensorId: sensorId,
            values: [
              "steps": data.numberOfSteps.doubleValue,
              "distance": data.distance?.doubleValue ?? 0,
              "pace": data.currentPace?.doubleValue ?? 0,
              "cadence": data.currentCadence?.doubleValue ?? 0,
              "floorsAscended": data.floorsAscended?.doubleValue ?? 0,
              "floorsDescended": data.floorsDescended?.doubleValue ?? 0,
            ]
          )
        }
        activeSensorIds.insert(sensorId)

      default:
        continue
      }
    }

    if usesSharedDeviceMotion {
      startSharedDeviceMotion()
    }

    invoke.resolve()
  }

  @objc public func stopWatch(_ invoke: Invoke) throws {
    stopAll()
    invoke.resolve()
  }

  private func startSharedDeviceMotion() {
    motionManager.deviceMotionUpdateInterval = 0.1
    motionManager.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
      guard let self, let data else { return }

      if self.activeSensorIds.contains("device_motion") {
        self.emitReading(
          sensorId: "device_motion",
          values: [
            "pitch": data.attitude.pitch,
            "roll": data.attitude.roll,
            "yaw": data.attitude.yaw,
            "gravityX": data.gravity.x,
            "gravityY": data.gravity.y,
            "gravityZ": data.gravity.z,
            "userAccelX": data.userAcceleration.x,
            "userAccelY": data.userAcceleration.y,
            "userAccelZ": data.userAcceleration.z,
            "rotationX": data.rotationRate.x,
            "rotationY": data.rotationRate.y,
            "rotationZ": data.rotationRate.z,
          ]
        )
      }

      if self.activeSensorIds.contains("gravity") {
        self.emitReading(
          sensorId: "gravity",
          values: [
            "x": data.gravity.x,
            "y": data.gravity.y,
            "z": data.gravity.z,
          ]
        )
      }

      if self.activeSensorIds.contains("linear_acceleration") {
        self.emitReading(
          sensorId: "linear_acceleration",
          values: [
            "x": data.userAcceleration.x,
            "y": data.userAcceleration.y,
            "z": data.userAcceleration.z,
          ]
        )
      }

      if self.activeSensorIds.contains("rotation_vector") {
        let q = data.attitude.quaternion
        self.emitReading(
          sensorId: "rotation_vector",
          values: [
            "x": q.x,
            "y": q.y,
            "z": q.z,
            "w": q.w,
          ]
        )
      }
    }
  }

  private func descriptor(for entry: SensorCatalogEntry) -> SensorDescriptorResponse {
    SensorDescriptorResponse(
      id: entry.id,
      label: entry.label,
      description: entry.description,
      unit: entry.unit,
      axes: entry.axes
    )
  }

  private func emitReading(sensorId: String, values: [String: Double]) {
    guard let channel = readingChannel else { return }
    try? channel.send(
      SensorReadingPayload(
        sensorId: sensorId,
        timestamp: Int(Date().timeIntervalSince1970 * 1000),
        values: values
      )
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
    altimeter.stopRelativeAltitudeUpdates()
    pedometer.stopUpdates()

    usesSharedDeviceMotion = false
    activeSensorIds.removeAll()
    readingChannel = nil
  }
}

@_cdecl("init_plugin_sensors")
func initPlugin() -> Plugin {
  return SensorsPlugin()
}
