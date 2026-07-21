import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store/useAppStore";
import { endpointLabel } from "../../../types";
import { type InspectorSectionProps, ProtocolEnableSection } from "../shared";

export function OscSection({ control, compact = false }: InspectorSectionProps) {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);

  return (
    <ProtocolEnableSection
      label={t("protocols.osc")}
      enabled={control.osc.enabled}
      description={control.osc.enabled ? t("control.oscPick") : t("control.oscAssign")}
      compact={compact}
      onToggle={(enabled) =>
        updateControl(control.id, {
          osc: { ...control.osc, enabled },
          oscSenderId: enabled
            ? (control.oscSenderId ?? performerIo.oscSenders[0]?.id ?? null)
            : control.oscSenderId,
        })
      }
    >
      <FormControl fullWidth size="small">
        <InputLabel id="control-osc-sender-label">{t("control.sender")}</InputLabel>
        <Select
          labelId="control-osc-sender-label"
          label={t("control.sender")}
          value={control.oscSenderId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              oscSenderId: event.target.value || null,
            })
          }
        >
          {performerIo.oscSenders.length === 0 && (
            <MenuItem value="" disabled>
              {t("control.addSendersInIo")}
            </MenuItem>
          )}
          {performerIo.oscSenders.map((sender) => (
            <MenuItem key={sender.id} value={sender.id}>
              {endpointLabel(sender.name, `${sender.host}:${sender.port}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="control-osc-receiver-label">{t("control.receiver")}</InputLabel>
        <Select
          labelId="control-osc-receiver-label"
          label={t("control.receiver")}
          value={control.oscReceiverId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              oscReceiverId: event.target.value || null,
            })
          }
        >
          <MenuItem value="">{t("control.anyReceiver")}</MenuItem>
          {performerIo.oscReceivers.map((receiver) => (
            <MenuItem key={receiver.id} value={receiver.id}>
              {endpointLabel(receiver.name, `port ${receiver.port}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t("common.address")}
        size="small"
        fullWidth
        value={control.osc.address}
        onChange={(event) =>
          updateControl(control.id, {
            osc: { ...control.osc, address: event.target.value },
          })
        }
      />
    </ProtocolEnableSection>
  );
}
