import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";

interface ControlEditButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  inline?: boolean;
}

export function ControlEditButton({ onClick, inline = false }: ControlEditButtonProps) {
  const { t } = useTranslation();

  return (
    <IconButton
      size="small"
      aria-label={t("control.editWidget")}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      sx={{
        flexShrink: 0,
        ...(inline
          ? undefined
          : {
              position: "absolute",
              top: 4,
              right: 4,
              zIndex: 4,
            }),
        bgcolor: "action.hover",
        boxShadow: 1,
        "&:hover": {
          bgcolor: "action.selected",
        },
      }}
    >
      <EditOutlinedIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}
