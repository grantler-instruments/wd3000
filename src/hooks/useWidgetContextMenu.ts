import { useCallback, useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function useWidgetContextMenu(editable: boolean) {
  const selectControl = useAppStore((state) => state.selectControl);
  const [menu, setMenu] = useState<{
    top: number;
    left: number;
    controlId: string;
  } | null>(null);

  const handleWidgetContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, controlId: string) => {
      if (!editable) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      selectControl(controlId);
      setMenu({ top: event.clientY, left: event.clientX, controlId });
    },
    [editable, selectControl],
  );

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  return {
    menu,
    handleWidgetContextMenu,
    closeMenu,
  };
}
