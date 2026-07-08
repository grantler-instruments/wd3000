import { useCallback, useEffect, useState } from "react";
import type {
  BrowserMotionReading,
  BrowserOrientationReading,
  BrowserSensorSupport,
} from "./types";

const EMPTY_ORIENTATION: BrowserOrientationReading = {
  alpha: null,
  beta: null,
  gamma: null,
  absolute: false,
};

const EMPTY_MOTION: BrowserMotionReading = {
  acceleration: { x: null, y: null, z: null },
  accelerationIncludingGravity: { x: null, y: null, z: null },
  rotationRate: { alpha: null, beta: null, gamma: null },
};

export function detectBrowserSensorSupport(): BrowserSensorSupport {
  if (typeof window === "undefined") {
    return { orientation: false, motion: false, ambientLight: false };
  }

  return {
    orientation: "DeviceOrientationEvent" in window,
    motion: "DeviceMotionEvent" in window,
    ambientLight: "AmbientLightSensor" in window,
  };
}

export function useBrowserSensors(enabled: boolean) {
  const [support] = useState(detectBrowserSensorSupport);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied" | "unsupported">(
    "unknown",
  );
  const [orientation, setOrientation] = useState<BrowserOrientationReading>(EMPTY_ORIENTATION);
  const [motion, setMotion] = useState<BrowserMotionReading>(EMPTY_MOTION);
  const [active, setActive] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!support.orientation && !support.motion) {
      setPermission("unsupported");
      return false;
    }

    const requester = (
      DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      }
    ).requestPermission;

    if (typeof requester !== "function") {
      setPermission("granted");
      return true;
    }

    try {
      const result = await requester();
      setPermission(result);
      return result === "granted";
    } catch {
      setPermission("denied");
      return false;
    }
  }, [support.motion, support.orientation]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      setActive(false);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
      });
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      setMotion({
        acceleration: {
          x: event.acceleration?.x ?? null,
          y: event.acceleration?.y ?? null,
          z: event.acceleration?.z ?? null,
        },
        accelerationIncludingGravity: {
          x: event.accelerationIncludingGravity?.x ?? null,
          y: event.accelerationIncludingGravity?.y ?? null,
          z: event.accelerationIncludingGravity?.z ?? null,
        },
        rotationRate: {
          alpha: event.rotationRate?.alpha ?? null,
          beta: event.rotationRate?.beta ?? null,
          gamma: event.rotationRate?.gamma ?? null,
        },
      });
    };

    if (support.orientation) {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    if (support.motion) {
      window.addEventListener("devicemotion", handleMotion);
    }

    setActive(true);

    return () => {
      if (support.orientation) {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
      if (support.motion) {
        window.removeEventListener("devicemotion", handleMotion);
      }
      setActive(false);
    };
  }, [enabled, permission, support.motion, support.orientation]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const requester = (
      DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      }
    ).requestPermission;

    if (typeof requester !== "function") {
      setPermission("granted");
    }
  }, [enabled]);

  return {
    support,
    permission,
    requestPermission,
    orientation,
    motion,
    active,
  };
}
