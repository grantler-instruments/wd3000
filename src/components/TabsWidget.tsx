import { Box, Tab, Tabs } from "@mui/material";
import { useCallback } from "react";
import { sendTabsValue } from "../lib/output";
import { useAppStore } from "../store/useAppStore";
import { type Control, controlTabs } from "../types";
import { TabPanelContent } from "./TabPanelContent";

interface TabsWidgetProps {
  control: Control;
  sendOnChange: boolean;
  editable: boolean;
  layoutPreview?: boolean;
  accentColor?: string;
}

export function TabsWidget({
  control,
  sendOnChange,
  editable,
  layoutPreview = false,
  accentColor,
}: TabsWidgetProps) {
  const performerIo = useAppStore((state) => state.performerIo);
  const layoutSettings = useAppStore((state) => state.layoutSettings);
  const tabs = controlTabs(control);
  const activeIndex = useAppStore((state) => state.controlTabIndex[control.id] ?? 0);
  const setControlTabIndex = useAppStore((state) => state.setControlTabIndex);
  const setLastError = useAppStore((state) => state.setLastError);
  const safeIndex = Math.min(activeIndex, Math.max(0, tabs.length - 1));

  const handleTabChange = useCallback(
    async (_: React.SyntheticEvent, nextIndex: number) => {
      setControlTabIndex(control.id, nextIndex);

      if (!sendOnChange) {
        return;
      }

      try {
        await sendTabsValue(control, performerIo, nextIndex);
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [control, performerIo, sendOnChange, setControlTabIndex, setLastError],
  );

  const indicatorColor = accentColor ?? "primary.main";
  const childEditable = editable;
  const childLayoutPreview = layoutPreview;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <Tabs
        value={safeIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            minHeight: 40,
            py: 0,
            textTransform: "none",
          },
          "& .MuiTabs-indicator": {
            bgcolor: indicatorColor,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.id} label={tab.label} />
        ))}
      </Tabs>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          mt: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {tabs.map((tab, index) => (
          <TabPanelContent
            key={tab.id}
            parentControl={control}
            tab={tab}
            active={safeIndex === index}
            editable={childEditable}
            layoutPreview={childLayoutPreview}
            gridSize={layoutSettings.gridSize}
          />
        ))}
      </Box>
    </Box>
  );
}
