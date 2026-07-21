import {
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isNativeApp } from "../../lib/platform";
import {
  OUTGOING_CURSOR_COLOR,
  sendTuioCursors,
  startTuioListener,
  stopTuioListener,
  TUIO_ENTITY_COLORS,
  TUIO_ENTITY_KINDS,
  type TuioFrame,
  tuioEntityLabel,
} from "../../lib/tuio";
import { useAppStore } from "../../store/useAppStore";
import { DebuggerSection } from "../DebuggerSection";
import { debuggerFillSx } from "../debuggerLayoutSx";
import {
  DEFAULT_TUIO_PORT,
  drawSurface,
  entityLabel,
  entityPosition,
  formatTime,
  type OutgoingCursor,
  type TuioLogEntry,
} from "./drawing";

export function TuioMonitor() {
  const { t } = useTranslation();
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<TuioFrame | null>(null);
  const outgoingRef = useRef<OutgoingCursor[]>([]);
  const pointerSessionsRef = useRef(new Map<number, number>());
  const nextSessionIdRef = useRef(1);
  const [listenPort, setListenPort] = useState(DEFAULT_TUIO_PORT);
  const [sendHost, setSendHost] = useState("127.0.0.1");
  const [sendPort, setSendPort] = useState(DEFAULT_TUIO_PORT);
  const [sendEnabled, setSendEnabled] = useState(true);
  const [frame, setFrame] = useState<TuioFrame | null>(null);
  const [outgoingCursors, setOutgoingCursors] = useState<OutgoingCursor[]>([]);
  const [logEntries, setLogEntries] = useState<TuioLogEntry[]>([]);
  const logIdRef = useRef(0);

  frameRef.current = frame;
  outgoingRef.current = outgoingCursors;

  const pointerToNormalized = useCallback((clientX: number, clientY: number) => {
    const surface = surfaceRef.current;
    if (!surface) {
      return null;
    }

    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const commitOutgoingFrame = useCallback(
    async (cursors: OutgoingCursor[]) => {
      if (!sendEnabled || sendPort <= 0 || sendHost.trim().length === 0) {
        return;
      }

      try {
        await sendTuioCursors(
          sendHost.trim(),
          sendPort,
          cursors.map((cursor) => ({
            sessionId: cursor.sessionId,
            x: cursor.x,
            y: cursor.y,
          })),
        );
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [sendEnabled, sendHost, sendPort, setLastError],
  );

  const updateOutgoingCursors = useCallback(
    (updater: (current: OutgoingCursor[]) => OutgoingCursor[]) => {
      setOutgoingCursors((current) => {
        const next = updater(current);
        void commitOutgoingFrame(next);
        return next;
      });
    },
    [commitOutgoingFrame],
  );

  useEffect(() => {
    if (!native) {
      return;
    }

    let cancelled = false;

    void startTuioListener(listenPort > 0 ? listenPort : null).catch((error) => {
      if (!cancelled) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => {
      cancelled = true;
      void stopTuioListener();
    };
  }, [listenPort, native, setLastError]);

  useEffect(() => {
    if (!native) {
      return;
    }

    let unlistenFrame: (() => void) | undefined;
    let unlistenDebug: (() => void) | undefined;

    void Promise.all([
      listen<TuioFrame>("tuio-frame", (event) => {
        setFrame(event.payload);
      }),
      listen<{ summary: string }>("tuio-debug-message", (event) => {
        logIdRef.current += 1;
        setLogEntries((entries) => [
          {
            id: logIdRef.current,
            timestamp: Date.now(),
            summary: event.payload.summary,
          },
          ...entries.slice(0, 199),
        ]);
      }),
    ]).then(([frameListener, debugListener]) => {
      unlistenFrame = frameListener;
      unlistenDebug = debugListener;
    });

    return () => {
      unlistenFrame?.();
      unlistenDebug?.();
    };
  }, [native]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) {
      return;
    }

    const render = () => {
      drawSurface(
        canvas,
        frameRef.current,
        outgoingRef.current,
        surface.clientWidth,
        surface.clientHeight,
      );
    };

    render();

    const observer = new ResizeObserver(render);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) {
      return;
    }

    drawSurface(canvas, frame, outgoingCursors, surface.clientWidth, surface.clientHeight);
  }, [frame, outgoingCursors]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!native || !sendEnabled) {
        return;
      }

      const position = pointerToNormalized(event.clientX, event.clientY);
      if (!position) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);

      const sessionId = nextSessionIdRef.current;
      nextSessionIdRef.current += 1;
      pointerSessionsRef.current.set(event.pointerId, sessionId);

      updateOutgoingCursors((current) => [...current, { sessionId, x: position.x, y: position.y }]);
    },
    [native, pointerToNormalized, sendEnabled, updateOutgoingCursors],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!native) {
        return;
      }
      const sessionId = pointerSessionsRef.current.get(event.pointerId);
      if (sessionId == null) {
        return;
      }

      const position = pointerToNormalized(event.clientX, event.clientY);
      if (!position) {
        return;
      }

      updateOutgoingCursors((current) =>
        current.map((cursor) =>
          cursor.sessionId === sessionId ? { ...cursor, x: position.x, y: position.y } : cursor,
        ),
      );
    },
    [native, pointerToNormalized, updateOutgoingCursors],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!native) {
        return;
      }
      const sessionId = pointerSessionsRef.current.get(event.pointerId);
      if (sessionId == null) {
        return;
      }

      pointerSessionsRef.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      updateOutgoingCursors((current) =>
        current.filter((cursor) => cursor.sessionId !== sessionId),
      );
    },
    [native, updateOutgoingCursors],
  );

  const spatialEntities =
    frame?.entities.filter((entity) => entity.x != null && entity.y != null) ?? [];
  const symbolEntities = frame?.entities.filter((entity) => entity.kind === "symbol") ?? [];

  return (
    <>
      <DebuggerSection title={t("monitor.composer")}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ alignItems: "flex-start", flexWrap: "wrap" }}
        >
          <TextField
            label={t("monitor.sendHost")}
            size="small"
            value={sendHost}
            onChange={(event) => setSendHost(event.target.value)}
            disabled={!native}
            sx={{ maxWidth: 180 }}
          />
          <TextField
            label={t("monitor.sendPort")}
            size="small"
            type="number"
            value={sendPort}
            onChange={(event) => setSendPort(Number(event.target.value) || 0)}
            helperText={t("monitor.tuioDefaultPort")}
            disabled={!native}
            sx={{ maxWidth: 160 }}
            slotProps={{
              formHelperText: { sx: { mx: 0 } },
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={sendEnabled}
                onChange={(event) => setSendEnabled(event.target.checked)}
                disabled={!native}
              />
            }
            label={t("monitor.sendFromCanvas")}
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {TUIO_ENTITY_KINDS.map((kind) => (
              <Chip
                key={kind}
                label={tuioEntityLabel(kind)}
                size="small"
                sx={{
                  bgcolor: `${TUIO_ENTITY_COLORS[kind]}33`,
                  borderColor: TUIO_ENTITY_COLORS[kind],
                }}
                variant="outlined"
              />
            ))}
          </Stack>
        </Stack>
      </DebuggerSection>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <DebuggerSection title={t("monitor.monitor")} flexGrow>
          <Stack spacing={2} sx={debuggerFillSx}>
            <TextField
              label={t("common.listenPort")}
              size="small"
              type="number"
              value={listenPort}
              onChange={(event) => setListenPort(Number(event.target.value) || 0)}
              helperText={t("monitor.setListenPortZero")}
              disabled={!native}
              sx={{ maxWidth: 160, flexShrink: 0 }}
              slotProps={{
                formHelperText: { sx: { mx: 0 } },
              }}
            />

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              sx={{
                flex: { xs: "0 0 auto", md: 1 },
                minHeight: { xs: "auto", md: 0 },
                overflow: { xs: "visible", md: "hidden" },
              }}
            >
              <Box
                ref={surfaceRef}
                sx={{
                  flex: 2,
                  minHeight: { xs: 280, lg: 0 },
                  height: { lg: "100%" },
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: "#121212",
                  position: "relative",
                }}
              >
                <Box
                  component="canvas"
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    touchAction: "none",
                    cursor: native && sendEnabled ? "crosshair" : "default",
                    pointerEvents: native ? "auto" : "none",
                  }}
                />
                {spatialEntities.length === 0 && outgoingCursors.length === 0 && listenPort > 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      textAlign: "center",
                      px: 2,
                    }}
                  >
                    {sendEnabled
                      ? t("monitor.listeningOnPortSend", {
                          port: listenPort,
                          host: sendHost,
                          sendPort,
                        })
                      : t("monitor.waitingTuio")}
                  </Typography>
                )}
              </Box>

              <Stack
                spacing={2}
                sx={{
                  flex: { xs: "0 0 auto", md: 1 },
                  minWidth: { xs: 0, lg: 240 },
                  minHeight: { xs: "auto", md: 0 },
                  overflow: { xs: "visible", md: "hidden" },
                }}
              >
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "auto",
                    maxHeight: 220,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                    {t("monitor.activeEntities", {
                      count: (frame?.entities.length ?? 0) + outgoingCursors.length,
                    })}
                  </Typography>
                  <Divider />
                  {outgoingCursors.length > 0 && (
                    <Stack divider={<Divider />}>
                      {outgoingCursors.map((cursor) => (
                        <Stack
                          key={`out-${cursor.sessionId}`}
                          direction="row"
                          spacing={1}
                          sx={{ px: 2, py: 1, alignItems: "center" }}
                        >
                          <Chip
                            label={t("monitor.out")}
                            size="small"
                            sx={{
                              minWidth: 72,
                              bgcolor: `${OUTGOING_CURSOR_COLOR}33`,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>
                              {t("monitor.cursorN", { id: cursor.sessionId })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cursor.x.toFixed(3)}, {cursor.y.toFixed(3)}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                  {frame && frame.entities.length > 0 ? (
                    <Stack divider={<Divider />}>
                      {frame.entities.map((entity) => (
                        <Stack
                          key={`${entity.kind}-${entity.sessionId}`}
                          direction="row"
                          spacing={1}
                          sx={{ px: 2, py: 1, alignItems: "center" }}
                        >
                          <Chip
                            label={tuioEntityLabel(entity.kind)}
                            size="small"
                            sx={{
                              minWidth: 72,
                              bgcolor: `${TUIO_ENTITY_COLORS[entity.kind] ?? "#bdbdbd"}33`,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>
                              {entityLabel(entity)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entityPosition(entity)}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  ) : outgoingCursors.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      {t("monitor.noActiveTuio")}
                    </Typography>
                  ) : null}
                </Box>

                {symbolEntities.length > 0 && (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "auto",
                      maxHeight: 140,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                      {t("monitor.symbols")}
                    </Typography>
                    <Divider />
                    <Stack divider={<Divider />}>
                      {symbolEntities.map((entity) => (
                        <Box key={`symbol-${entity.sessionId}`} sx={{ px: 2, py: 1 }}>
                          <Typography variant="body2">
                            #{entity.sessionId} · {entity.group ?? "group"} ·{" "}
                            {entity.data ?? "data"}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                    {t("monitor.events")}
                  </Typography>
                  <Divider />
                  {logEntries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      {t("monitor.removeEventsHint")}
                    </Typography>
                  ) : (
                    <Stack divider={<Divider />}>
                      {logEntries.map((entry) => (
                        <Stack
                          key={entry.id}
                          direction="row"
                          spacing={1.5}
                          sx={{
                            alignItems: "center",
                            flexWrap: "wrap",
                            rowGap: 0.5,
                            px: { xs: 1.5, sm: 2 },
                            py: 1,
                            fontFamily: "monospace",
                            fontSize: "0.8125rem",
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontFamily: "inherit",
                              minWidth: { xs: 72, sm: 108 },
                              flexShrink: 0,
                            }}
                          >
                            {formatTime(entry.timestamp)}
                          </Typography>
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{
                              fontFamily: "inherit",
                              flex: "1 1 120px",
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {entry.summary}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </DebuggerSection>
      </Box>
    </>
  );
}
