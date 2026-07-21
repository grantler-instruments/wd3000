import { Box, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../store/useAppStore";
import type { OscReceiver, OscSender } from "../../types";
import { EmptyState, EndpointCard, SubsectionHeader } from "./shared";

function OscSenderRow({ sender }: { sender: OscSender }) {
  const { t } = useTranslation();
  const updateOscSender = useAppStore((state) => state.updateOscSender);
  const removeOscSender = useAppStore((state) => state.removeOscSender);

  return (
    <EndpointCard
      onRemove={() => removeOscSender(sender.id)}
      removeLabel={t("common.removeNamed", { name: sender.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={sender.name}
          onChange={(event) => updateOscSender(sender.id, { name: event.target.value })}
        />
        <TextField
          label={t("common.host")}
          size="small"
          fullWidth
          value={sender.host}
          onChange={(event) => updateOscSender(sender.id, { host: event.target.value })}
        />
        <TextField
          label={t("common.port")}
          size="small"
          type="number"
          sx={{ width: { xs: "100%", sm: 100 }, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 1, max: 65535 } }}
          value={sender.port}
          onChange={(event) =>
            updateOscSender(sender.id, {
              port: Math.min(65535, Math.max(1, Number(event.target.value) || 1)),
            })
          }
        />
      </Stack>
    </EndpointCard>
  );
}

function OscReceiverRow({ receiver }: { receiver: OscReceiver }) {
  const { t } = useTranslation();
  const updateOscReceiver = useAppStore((state) => state.updateOscReceiver);
  const removeOscReceiver = useAppStore((state) => state.removeOscReceiver);

  return (
    <EndpointCard
      onRemove={() => removeOscReceiver(receiver.id)}
      removeLabel={t("common.removeNamed", { name: receiver.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={receiver.name}
          onChange={(event) => updateOscReceiver(receiver.id, { name: event.target.value })}
        />
        <TextField
          label={t("common.listenPort")}
          size="small"
          type="number"
          sx={{ width: { xs: "100%", sm: 140 }, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 1, max: 65535 } }}
          value={receiver.port}
          onChange={(event) =>
            updateOscReceiver(receiver.id, {
              port: Math.min(65535, Math.max(1, Number(event.target.value) || 1)),
            })
          }
        />
      </Stack>
    </EndpointCard>
  );
}

export function OscSettingsPanel() {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const addOscSender = useAppStore((state) => state.addOscSender);
  const addOscReceiver = useAppStore((state) => state.addOscReceiver);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t("protocols.osc")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("io.oscIntro")}
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.senders")}
          description={t("io.sendersDescription")}
          addLabel={t("io.addSender")}
          onAdd={() =>
            addOscSender({
              name: t("io.defaultOscSender", { n: performerIo.oscSenders.length + 1 }),
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.oscSenders.length === 0 ? (
            <EmptyState message={t("io.noSenders")} />
          ) : (
            performerIo.oscSenders.map((sender) => <OscSenderRow key={sender.id} sender={sender} />)
          )}
        </Stack>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.receivers")}
          description={t("io.receiversDescription")}
          addLabel={t("io.addReceiver")}
          onAdd={() =>
            addOscReceiver({
              name: t("io.defaultOscReceiver", { n: performerIo.oscReceivers.length + 1 }),
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.oscReceivers.length === 0 ? (
            <EmptyState message={t("io.noReceivers")} />
          ) : (
            performerIo.oscReceivers.map((receiver) => (
              <OscReceiverRow key={receiver.id} receiver={receiver} />
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
