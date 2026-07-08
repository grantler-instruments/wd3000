import {
  Divider,
  Stack,
} from "@mui/material";
import { AddControlMenu } from "./AddControlMenu";
import { ConfigImportExport } from "./ConfigImportExport";

export function PerformerToolbar() {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <AddControlMenu />

      <Divider orientation="vertical" flexItem />

      <ConfigImportExport compact />
    </Stack>
  );
}
