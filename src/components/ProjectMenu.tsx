import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import SaveIcon from "@mui/icons-material/Save";
import {
  Button,
  type ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { exportConfigToFile, parseConfigImport } from "../lib/config";
import { createSavedProject, findProjectByName } from "../lib/projectLibrary";
import { useAppStore } from "../store/useAppStore";
import { useProjectLibraryStore } from "../store/useProjectLibraryStore";
import { AppDialogTitle } from "./AppDialogHeader";

interface ProjectMenuProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

function formatSavedAt(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ProjectMenu({ size = "small", variant = "outlined" }: ProjectMenuProps) {
  const { t, i18n } = useTranslation();
  const controls = useAppStore((state) => state.controls);
  const output = useAppStore((state) => state.output);
  const performerIo = useAppStore((state) => state.performerIo);
  const layoutSettings = useAppStore((state) => state.layoutSettings);
  const importConfig = useAppStore((state) => state.importConfig);
  const newProject = useAppStore((state) => state.newProject);
  const setLastError = useAppStore((state) => state.setLastError);
  const projects = useProjectLibraryStore((state) => state.projects);
  const saveProject = useProjectLibraryStore((state) => state.saveProject);
  const removeProject = useProjectLibraryStore((state) => state.removeProject);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [openLibraryOpen, setOpenLibraryOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [openConfirmOpen, setOpenConfirmOpen] = useState(false);
  const menuOpen = anchorEl !== null;

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [projects],
  );

  const existingSaveMatch = findProjectByName(projects, saveName);
  const currentConfig = { controls, output, performerIo, layoutSettings };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    exportConfigToFile(currentConfig);
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

  const handleSaveClick = () => {
    handleClose();
    setSaveName("");
    setSaveOpen(true);
  };

  const handleConfirmSave = () => {
    try {
      const project = createSavedProject(saveName, currentConfig);
      saveProject(project);
      setSaveOpen(false);
      setSaveName("");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleOpenLibraryClick = () => {
    handleClose();
    setSelectedProjectId(sortedProjects[0]?.id ?? null);
    setOpenLibraryOpen(true);
  };

  const handleRequestOpenProject = () => {
    if (!selectedProjectId) {
      return;
    }

    setOpenLibraryOpen(false);
    setOpenConfirmOpen(true);
  };

  const handleConfirmOpenProject = () => {
    const project = projects.find((entry) => entry.id === selectedProjectId);
    if (!project) {
      setOpenConfirmOpen(false);
      setSelectedProjectId(null);
      return;
    }

    try {
      importConfig(project.config);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpenConfirmOpen(false);
      setSelectedProjectId(null);
    }
  };

  const handleDeleteProject = (id: string) => {
    removeProject(id);
    if (selectedProjectId === id) {
      const remaining = sortedProjects.filter((project) => project.id !== id);
      setSelectedProjectId(remaining[0]?.id ?? null);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={menuOpen ? "true" : undefined}
        aria-controls={menuOpen ? "project-menu" : undefined}
      >
        {t("project.title")}
      </Button>
      <Menu
        id="project-menu"
        anchorEl={anchorEl}
        open={menuOpen}
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
        <MenuItem onClick={handleSaveClick}>
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("project.save")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenLibraryClick}>
          <ListItemIcon>
            <FolderOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("project.open")}</ListItemText>
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

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth maxWidth="xs">
        <AppDialogTitle onClose={() => setSaveOpen(false)}>{t("project.saveTitle")}</AppDialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("common.name")}
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder={t("project.saveNamePlaceholder")}
            helperText={
              existingSaveMatch
                ? t("project.saveOverwriteHint", { name: existingSaveMatch.name })
                : undefined
            }
            sx={{ mt: 1 }}
            slotProps={{
              formHelperText: { sx: { mx: 0 } },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleConfirmSave} disabled={!saveName.trim()}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openLibraryOpen}
        onClose={() => setOpenLibraryOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <AppDialogTitle onClose={() => setOpenLibraryOpen(false)}>
          {t("project.openTitle")}
        </AppDialogTitle>
        <DialogContent>
          {sortedProjects.length === 0 ? (
            <DialogContentText>{t("project.openEmpty")}</DialogContentText>
          ) : (
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {sortedProjects.map((project) => {
                const selected = project.id === selectedProjectId;
                return (
                  <ListItem
                    key={project.id}
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label={t("common.delete")}
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      selected={selected}
                      onClick={() => setSelectedProjectId(project.id)}
                      onDoubleClick={() => {
                        setSelectedProjectId(project.id);
                        setOpenLibraryOpen(false);
                        setOpenConfirmOpen(true);
                      }}
                    >
                      <ListItemText
                        primary={project.name}
                        secondary={formatSavedAt(project.savedAt, i18n.language)}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLibraryOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleRequestOpenProject}
            disabled={!selectedProjectId}
          >
            {t("project.open")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmOpen} onClose={() => setOpenConfirmOpen(false)}>
        <AppDialogTitle onClose={() => setOpenConfirmOpen(false)}>
          {t("project.openConfirmTitle")}
        </AppDialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("project.openConfirmBody", {
              name:
                projects.find((project) => project.id === selectedProjectId)?.name ??
                t("project.title"),
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleConfirmOpenProject}>
            {t("project.open")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
