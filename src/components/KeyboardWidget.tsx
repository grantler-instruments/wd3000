import { Box } from "@mui/material";
import { useCallback, useMemo, useRef } from "react";
import { sendKeyboardNote } from "../lib/output";
import { useAppStore } from "../store/useAppStore";
import { type Control, isBlackKey, keyboardNotes } from "../types";

interface KeyboardWidgetProps {
  control: Control;
  editable: boolean;
  accentColor?: string;
}

interface WhiteKeyLayout {
  note: number;
  index: number;
}

interface BlackKeyLayout {
  note: number;
  leftPercent: number;
}

function findPrecedingWhiteKey(
  whiteKeys: WhiteKeyLayout[],
  blackNote: number,
): WhiteKeyLayout | undefined {
  let preceding: WhiteKeyLayout | undefined;

  for (const key of whiteKeys) {
    if (key.note < blackNote) {
      preceding = key;
      continue;
    }

    break;
  }

  return preceding;
}

function buildKeyLayout(notes: number[]): {
  whiteKeys: WhiteKeyLayout[];
  blackKeys: BlackKeyLayout[];
} {
  const whiteKeys: WhiteKeyLayout[] = [];
  const blackKeys: BlackKeyLayout[] = [];

  for (const note of notes) {
    if (isBlackKey(note)) {
      continue;
    }

    whiteKeys.push({ note, index: whiteKeys.length });
  }

  const whiteKeyWidth = whiteKeys.length > 0 ? 100 / whiteKeys.length : 0;

  for (const note of notes) {
    if (!isBlackKey(note)) {
      continue;
    }

    const precedingWhite = findPrecedingWhiteKey(whiteKeys, note);
    if (!precedingWhite) {
      continue;
    }

    blackKeys.push({
      note,
      leftPercent: (precedingWhite.index + 0.68) * whiteKeyWidth,
    });
  }

  return { whiteKeys, blackKeys };
}

const EMPTY_ACTIVE_NOTES: number[] = [];

export function KeyboardWidget({ control, editable, accentColor }: KeyboardWidgetProps) {
  const performerIo = useAppStore((state) => state.performerIo);
  const activeNotes = useAppStore(
    (state) => state.controlActiveNotes[control.id] ?? EMPTY_ACTIVE_NOTES,
  );
  const setControlNoteActive = useAppStore((state) => state.setControlNoteActive);
  const setLastError = useAppStore((state) => state.setLastError);
  const pointerNotes = useRef(new Map<number, number>());
  const notePressCounts = useRef(new Map<number, number>());

  const notes = useMemo(() => keyboardNotes(control), [control]);
  const { whiteKeys, blackKeys } = useMemo(() => buildKeyLayout(notes), [notes]);
  const activeNoteSet = useMemo(() => new Set(activeNotes), [activeNotes]);

  const pressNote = useCallback(
    async (note: number) => {
      if (editable) {
        return;
      }

      const pressCount = notePressCounts.current.get(note) ?? 0;
      notePressCounts.current.set(note, pressCount + 1);
      if (pressCount > 0) {
        return;
      }

      setControlNoteActive(control.id, note, true);

      try {
        await sendKeyboardNote(control, performerIo, note, true);
        setLastError(null);
      } catch (error) {
        notePressCounts.current.set(note, 0);
        setControlNoteActive(control.id, note, false);
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [control, editable, performerIo, setControlNoteActive, setLastError],
  );

  const releaseNote = useCallback(
    async (note: number) => {
      if (editable) {
        return;
      }

      const pressCount = notePressCounts.current.get(note) ?? 0;
      if (pressCount <= 0) {
        return;
      }

      const nextCount = pressCount - 1;
      if (nextCount > 0) {
        notePressCounts.current.set(note, nextCount);
        return;
      }

      notePressCounts.current.delete(note);
      setControlNoteActive(control.id, note, false);

      try {
        await sendKeyboardNote(control, performerIo, note, false);
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [control, editable, performerIo, setControlNoteActive, setLastError],
  );

  const handlePointerDown = (note: number) => (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    if (editable) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerNotes.current.set(event.pointerId, note);
    void pressNote(note);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const note = pointerNotes.current.get(event.pointerId);
    if (note === undefined) {
      return;
    }

    pointerNotes.current.delete(event.pointerId);
    void releaseNote(note);
  };

  const blackKeyPressedSx = accentColor
    ? {
        bgcolor: accentColor,
        filter: "brightness(1.08)",
      }
    : {
        bgcolor: "primary.main",
      };

  const blackKeyHeight = "62%";

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        width: "100%",
        minHeight: 0,
        borderRadius: 1,
        border: 2,
        borderColor: "secondary.main",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        opacity: editable ? 0.72 : 1,
        bgcolor: "background.default",
        p: 0.5,
        boxSizing: "border-box",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <Box
        sx={{
          display: "flex",
          height: "calc(100% - 8px)",
        }}
      >
        {whiteKeys.map((key) => {
          const active = activeNoteSet.has(key.note);
          return (
            <Box
              key={key.note}
              component="button"
              type="button"
              disabled={editable}
              onPointerDown={handlePointerDown(key.note)}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onLostPointerCapture={handlePointerEnd}
              sx={(theme) => {
                const pressedColor = accentColor ?? theme.palette.primary.main;
                const outlineColor = theme.palette.secondary.main;

                return {
                  flex: 1,
                  height: "100%",
                  alignSelf: "stretch",
                  cursor: editable ? "default" : "pointer",
                  p: 0,
                  minWidth: 0,
                  boxSizing: "border-box",
                  borderRadius: "0 0 4px 4px",
                  border: 2,
                  borderStyle: "solid",
                  transition: "background-color 80ms ease, border-color 80ms ease",
                  ...(active
                    ? {
                        bgcolor: pressedColor,
                        borderColor: pressedColor,
                        color: accentColor
                          ? theme.palette.getContrastText(accentColor)
                          : theme.palette.primary.contrastText,
                        filter: "brightness(0.92)",
                      }
                    : {
                        bgcolor: "transparent",
                        borderColor: outlineColor,
                      }),
                };
              }}
            />
          );
        })}
      </Box>

      {blackKeys.map((key) => {
        const active = activeNoteSet.has(key.note);
        return (
          <Box
            key={key.note}
            component="button"
            type="button"
            disabled={editable}
            onPointerDown={handlePointerDown(key.note)}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            sx={(theme) => ({
              position: "absolute",
              top: 4,
              left: `${key.leftPercent}%`,
              width: `${100 / whiteKeys.length / 1.5}%`,
              minWidth: 10,
              height: blackKeyHeight,
              transform: "translateX(-50%)",
              border: 2,
              borderColor: theme.palette.secondary.dark,
              borderTop: 0,
              borderRadius: "0 0 4px 4px",
              bgcolor: active ? undefined : theme.palette.secondary.main,
              color: theme.palette.secondary.contrastText,
              cursor: editable ? "default" : "pointer",
              p: 0,
              zIndex: 2,
              boxShadow: theme.shadows[4],
              transition: "background-color 80ms ease, filter 80ms ease",
              ...(active ? blackKeyPressedSx : undefined),
            })}
          />
        );
      })}
    </Box>
  );
}
