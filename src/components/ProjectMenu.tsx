import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import {
  Button,
  type ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { type ChangeEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { exportConfigToFile, parseConfigImport } from "../lib/config";
import { useAppStore } from "../store/useAppStore";
import { AppDialogTitle } from "./AppDialogHeader";

interface ProjectMenuProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export function ProjectMenu({ size = "small", variant = "outlined" }: ProjectMenuProps) {
  const { t } = useTranslation();
  const controls = useAppStore((state) => state.controls);
  const output = useAppStore((state) => state.output);
  const performerIo = useAppStore((state) => state.performerIo);
  const layoutSettings = useAppStore((state) => state.layoutSettings);
  const importConfig = useAppStore((state) => state.importConfig);
  const newProject = useAppStore((state) => state.newProject);
  const setLastError = useAppStore((state) => state.setLastError);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const open = anchorEl !== null;

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    exportConfigToFile({ controls, output, performerIo, layoutSettings });
    handleClose();
  };

  const handleImportClick = () => {
    handleClose();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      parseConfigImport(raw);
      setPendingImport(raw);
      setImportOpen(true);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport) {
      return;
    }

    try {
      const config = parseConfigImport(pendingImport);
      importConfig(config);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingImport(null);
      setImportOpen(false);
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setImportOpen(false);
  };

  const handleNewProjectClick = () => {
    handleClose();
    setNewProjectOpen(true);
  };

  const handleConfirmNewProject = () => {
    newProject();
    setNewProjectOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
        aria-controls={open ? "project-menu" : undefined}
      >
        {t("project.title")}
      </Button>
      <Menu
        id="project-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem onClick={handleNewProjectClick}>
          <ListItemIcon>
            <NoteAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("project.newProject")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleImportClick}>
          <ListItemIcon>
            <FileUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.import")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExport}>
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.export")}</ListItemText>
        </MenuItem>
      </Menu>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleFileChange}
      />

      <Dialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)}>
        <AppDialogTitle onClose={() => setNewProjectOpen(false)}>
          {t("project.newProjectConfirmTitle")}
        </AppDialogTitle>
        <DialogContent>
          <DialogContentText>{t("project.newProjectConfirmBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewProjectOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleConfirmNewProject}>
            {t("project.newProject")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={handleCancelImport}>
        <AppDialogTitle onClose={handleCancelImport}>
          {t("project.importConfirmTitle")}
        </AppDialogTitle>
        <DialogContent>
          <DialogContentText>{t("project.importConfirmBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelImport}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleConfirmImport}>
            {t("common.import")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
