import { useCallback, useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function useWidgetContextMenu(editable: boolean) {
  const selectControl = useAppStore((state) => state.selectControl);
  const [menu, setMenu] = useState<{
    top: number;
    left: number;
    controlId: string;
  } | null>(null);

  const openMenuAt = useCallback(
    (controlId: string, clientX: number, clientY: number) => {
      if (!editable) {
        return;
      }

      selectControl(controlId);
      setMenu({ top: clientY, left: clientX, controlId });
    },
    [editable, selectControl],
  );

  const handleWidgetContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, controlId: string) => {
      if (!editable) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openMenuAt(controlId, event.clientX, event.clientY);
    },
    [editable, openMenuAt],
  );

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  return {
    menu,
    openMenuAt,
    handleWidgetContextMenu,
    closeMenu,
  };
}
