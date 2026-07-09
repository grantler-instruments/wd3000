import { Box, List, ListItemButton, Typography } from "@mui/material";

interface SettingsSectionNavProps<T extends string> {
  sections: { id: T; label: string }[];
  section: T;
  onSelect: (section: T) => void;
  sidebarWidth?: number;
}

export function SettingsSectionNav<T extends string>({
  sections,
  section,
  onSelect,
  sidebarWidth = 168,
}: SettingsSectionNavProps<T>) {
  return (
    <Box
      component="nav"
      sx={{
        width: { xs: "100%", sm: sidebarWidth },
        flexShrink: 0,
        borderRight: { xs: 0, sm: 1 },
        borderBottom: { xs: 1, sm: 0 },
        borderColor: "divider",
        bgcolor: "background.default",
        py: { xs: 0.5, sm: 1 },
      }}
    >
      <List
        dense
        disablePadding
        sx={{
          display: { xs: "flex", sm: "block" },
          flexDirection: { xs: "row", sm: "column" },
          px: { xs: 1, sm: 0 },
          gap: { xs: 0.5, sm: 0 },
        }}
      >
        {sections.map((item) => {
          const selected = section === item.id;
          return (
            <ListItemButton
              key={item.id}
              selected={selected}
              onClick={() => onSelect(item.id)}
              sx={{
                mx: { xs: 0, sm: 1 },
                my: { xs: 0, sm: 0.25 },
                borderRadius: 1,
                py: 0.75,
                flex: { xs: 1, sm: "none" },
                justifyContent: { xs: "center", sm: "flex-start" },
                minWidth: 0,
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
              }}
            >
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: selected ? 600 : 400 }}
              >
                {item.label}
              </Typography>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
