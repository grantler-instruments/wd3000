import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../store/useAppStore";
import type { MqttConnection } from "../../types";
import { EmptyState, EndpointCard, SubsectionHeader } from "./shared";

function MqttConnectionRow({ connection }: { connection: MqttConnection }) {
  const { t } = useTranslation();
  const updateMqttConnection = useAppStore((state) => state.updateMqttConnection);
  const removeMqttConnection = useAppStore((state) => state.removeMqttConnection);

  return (
    <EndpointCard
      onRemove={() => removeMqttConnection(connection.id)}
      removeLabel={t("common.removeNamed", { name: connection.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={connection.name}
          onChange={(event) => updateMqttConnection(connection.id, { name: event.target.value })}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id={`mqtt-protocol-${connection.id}`}>{t("common.protocol")}</InputLabel>
          <Select
            labelId={`mqtt-protocol-${connection.id}`}
            label={t("common.protocol")}
            value={connection.protocol}
            onChange={(event) =>
              updateMqttConnection(connection.id, {
                protocol: event.target.value as MqttConnection["protocol"],
              })
            }
          >
            <MenuItem value="tcp">{t("protocols.tcp")}</MenuItem>
            <MenuItem value="ws">{t("protocols.ws")}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={t("common.host")}
          size="small"
          fullWidth
          value={connection.host}
          onChange={(event) => updateMqttConnection(connection.id, { host: event.target.value })}
        />
        <TextField
          label={t("common.port")}
          size="small"
          type="number"
          sx={{ width: { xs: "100%", sm: 100 }, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 1, max: 65535 } }}
          value={connection.port}
          onChange={(event) =>
            updateMqttConnection(connection.id, {
              port: Math.min(65535, Math.max(1, Number(event.target.value) || 1)),
            })
          }
        />
      </Stack>
    </EndpointCard>
  );
}

export function MqttSettingsPanel() {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const output = useAppStore((state) => state.output);
  const addMqttConnection = useAppStore((state) => state.addMqttConnection);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t("protocols.mqtt")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("io.mqttIntro")}
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.brokers")}
          description={t("io.brokersDescription")}
          addLabel={t("io.addBroker")}
          onAdd={() =>
            addMqttConnection({
              name: t("io.defaultMqtt", { n: performerIo.mqttConnections.length + 1 }),
              host: output.mqttComposerHost,
              port: output.mqttComposerPort,
              protocol: output.mqttComposerProtocol,
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.mqttConnections.length === 0 ? (
            <EmptyState message={t("io.noBrokers")} />
          ) : (
            performerIo.mqttConnections.map((connection) => (
              <MqttConnectionRow key={connection.id} connection={connection} />
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
