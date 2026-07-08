package com.grantler_instruments.wd3000.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class StartWatchArgs {
    lateinit var sensorIds: Array<String>
}

@TauriPlugin
class SensorsPlugin(private val activity: android.app.Activity) : Plugin(activity) {
    private val sensorManager =
        activity.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val listeners = mutableMapOf<String, SensorEventListener>()
    private val activeSensors = mutableMapOf<String, Sensor>()

    private val catalog = listOf(
        SensorCatalogEntry(
            "accelerometer",
            "Accelerometer",
            "Device linear acceleration.",
            "m/s²",
            listOf("x", "y", "z"),
            Sensor.TYPE_ACCELEROMETER,
        ),
        SensorCatalogEntry(
            "gyroscope",
            "Gyroscope",
            "Device rotation rate.",
            "rad/s",
            listOf("x", "y", "z"),
            Sensor.TYPE_GYROSCOPE,
        ),
        SensorCatalogEntry(
            "magnetometer",
            "Magnetometer",
            "Ambient magnetic field.",
            "µT",
            listOf("x", "y", "z"),
            Sensor.TYPE_MAGNETIC_FIELD,
        ),
        SensorCatalogEntry(
            "gravity",
            "Gravity",
            "Gravity vector estimate.",
            "m/s²",
            listOf("x", "y", "z"),
            Sensor.TYPE_GRAVITY,
        ),
        SensorCatalogEntry(
            "linear_acceleration",
            "Linear acceleration",
            "Acceleration without gravity.",
            "m/s²",
            listOf("x", "y", "z"),
            Sensor.TYPE_LINEAR_ACCELERATION,
        ),
        SensorCatalogEntry(
            "rotation_vector",
            "Rotation vector",
            "Device orientation as a rotation vector.",
            null,
            listOf("x", "y", "z", "w"),
            Sensor.TYPE_ROTATION_VECTOR,
        ),
        SensorCatalogEntry(
            "light",
            "Ambient light",
            "Illuminance from the ambient light sensor.",
            "lx",
            listOf("level"),
            Sensor.TYPE_LIGHT,
        ),
        SensorCatalogEntry(
            "proximity",
            "Proximity",
            "Distance to the nearest object in front of the device.",
            "cm",
            listOf("distance"),
            Sensor.TYPE_PROXIMITY,
        ),
        SensorCatalogEntry(
            "pressure",
            "Barometer",
            "Atmospheric pressure.",
            "hPa",
            listOf("pressure"),
            Sensor.TYPE_PRESSURE,
        ),
    )

    @Command
    fun listSensors(invoke: Invoke) {
        try {
            val available = catalog.mapNotNull { entry ->
                val sensor = sensorManager.getDefaultSensor(entry.type) ?: return@mapNotNull null
                JSObject().apply {
                    put("id", entry.id)
                    put("label", entry.label)
                    put("description", entry.description)
                    entry.unit?.let { put("unit", it) }
                    put("axes", entry.axes.toTypedArray())
                }
            }

            invoke.resolve(available.toTypedArray())
        } catch (ex: Exception) {
            invoke.reject(ex.message)
        }
    }

    @Command
    fun startWatch(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(StartWatchArgs::class.java)
            stopAllListeners()

            for (sensorId in args.sensorIds) {
                val entry = catalog.firstOrNull { it.id == sensorId }
                    ?: continue
                val sensor = sensorManager.getDefaultSensor(entry.type) ?: continue

                val listener = object : SensorEventListener {
                    override fun onSensorChanged(event: SensorEvent) {
                        val values = JSObject()
                        when (entry.axes.size) {
                            1 -> values.put(entry.axes[0], event.values[0].toDouble())
                            3 -> {
                                values.put("x", event.values[0].toDouble())
                                values.put("y", event.values[1].toDouble())
                                values.put("z", event.values[2].toDouble())
                            }
                            4 -> {
                                values.put("x", event.values[0].toDouble())
                                values.put("y", event.values[1].toDouble())
                                values.put("z", event.values[2].toDouble())
                                if (event.values.size > 3) {
                                    values.put("w", event.values[3].toDouble())
                                }
                            }
                        }

                        trigger(
                            "sensor-reading",
                            JSObject().apply {
                                put("sensorId", sensorId)
                                put("timestamp", System.currentTimeMillis())
                                put("values", values)
                            },
                        )
                    }

                    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
                }

                sensorManager.registerListener(
                    listener,
                    sensor,
                    SensorManager.SENSOR_DELAY_GAME,
                )
                listeners[sensorId] = listener
                activeSensors[sensorId] = sensor
            }

            invoke.resolve()
        } catch (ex: Exception) {
            invoke.reject(ex.message)
        }
    }

    @Command
    fun stopWatch(invoke: Invoke) {
        try {
            stopAllListeners()
            invoke.resolve()
        } catch (ex: Exception) {
            invoke.reject(ex.message)
        }
    }

    private fun stopAllListeners() {
        listeners.forEach { (sensorId, listener) ->
            activeSensors[sensorId]?.let { sensor ->
                sensorManager.unregisterListener(listener, sensor)
            }
        }
        listeners.clear()
        activeSensors.clear()
    }

    private data class SensorCatalogEntry(
        val id: String,
        val label: String,
        val description: String,
        val unit: String?,
        val axes: List<String>,
        val type: Int,
    )
}
