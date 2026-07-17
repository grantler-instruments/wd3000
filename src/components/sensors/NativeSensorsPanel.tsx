import {
  Alert,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAppPlatform } from "../../lib/platform";
import {
  listNativeSensors,
  listenNativeSensorReadings,
  startNativeSensorWatch,
  stopNativeSensorWatch,
} from "../../lib/sensors/native";
import { sendSensorReadingOutput } from "../../lib/sensors/output";
import type { SensorDescriptor, SensorReading } from "../../lib/sensors/types";
import { useAppStore } from "../../store/useAppStore";
import { SensorAxisMappingEditor } from "./SensorAxisMappingEditor";
import { SensorCard } from "./SensorCard";

export function NativeSensorsPanel() {
  const { t } = useTranslation();
  const platform = getAppPlatform();
  const performerIo = useAppStore((state) => state.performerIo);
  const sensorMappings = useAppStore((state) => state.sensorMappings);
  const setLastError = useAppStore((state) => state.setLastError);
  const [sensors, setSensors] = useState<SensorDescriptor[]>([]);
  const [activeSensorIds, setActiveSensorIds] = useState<string[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading>>({});
  const [loading, setLoading] = useState(true);
  const performerIoRef = useRef(performerIo);
  const activeSensorIdsRef = useRef(activeSensorIds);
  const sensorMappingsRef = useRef(sensorMappings);
  performerIoRef.current = performerIo;
  activeSensorIdsRef.current = activeSensorIds;
  sensorMappingsRef.current = sensorMappings;

  const platformDescription =
    platform === "desktop"
      ? t("sensors.nativeDesktopIntro")
      : platform === "mobile"
        ? t("sensors.nativeMobileIntro")
        : "";

  useEffect(() => {
    let cancelled = false;

    void listNativeSensors()
      .then((available) => {
        if (!cancelled) {
          setSensors(available);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setLastError]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listenNativeSensorReadings((reading) => {
      if (!activeSensorIdsRef.current.includes(reading.sensorId)) {
        return;
      }

      setReadings((current) => ({
        ...current,
        [reading.sensorId]: reading,
      }));

      void sendSensorReadingOutput(
        performerIoRef.current,
        sensorMappingsRef.current,
        reading,
      );
    }).then((handler) => {
      unlisten = handler;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const applySensorWatch = useCallback(async (nextIds: string[]) => {
    await stopNativeSensorWatch();
    if (nextIds.length > 0) {
      await startNativeSensorWatch(nextIds);
    }
    setActiveSensorIds(nextIds);
  }, []);

  const handleToggleSensor = useCallback(
    async (sensorId: string, watching: boolean) => {
      try {
        const nextIds = watching
          ? [...activeSensorIdsRef.current.filter((id) => id !== sensorId), sensorId]
          : activeSensorIdsRef.current.filter((id) => id !== sensorId);

        if (!watching) {
          setReadings((current) => {
            const next = { ...current };
            delete next[sensorId];
            return next;
          });
        }

        await applySensorWatch(nextIds);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [applySensorWatch, setLastError],
  );

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {platformDescription}
        </Typography>
      </Box>

      {loading ? (
        <Typography color="text.secondary">{t("sensors.detecting")}</Typography>
      ) : sensors.length === 0 ? (
        <Alert severity="info">
          {platform === "desktop"
            ? t("sensors.noNativeSensorsDesktop")
            : t("sensors.noNativeSensors")}
        </Alert>
      ) : (
        <Stack spacing={1}>
          {sensors.map((sensor) => {
            const reading = readings[sensor.id];
            const watching = activeSensorIds.includes(sensor.id);
            const axes = sensor.axes ?? Object.keys(reading?.values ?? {});

            return (
              <SensorCard
                key={sensor.id}
                title={sensor.label}
                description={sensor.description}
                watching={watching}
                onToggleWatch={(nextWatching) =>
                  void handleToggleSensor(sensor.id, nextWatching)
                }
              >
                {axes.length > 0 ? (
                  axes.map((axis) => (
                    <SensorAxisMappingEditor
                      key={axis}
                      sensorId={sensor.id}
                      axis={axis}
                      value={reading?.values[axis]}
                      unit={sensor.unit}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {watching
                      ? t("sensors.waitingReadings")
                      : t("sensors.turnOnToConfigure")}
                  </Typography>
                )}
              </SensorCard>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
