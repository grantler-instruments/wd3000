import CloseIcon from "@mui/icons-material/Close";
import { Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";

function normalizeTopic(topic: string) {
  return topic.trim();
}

interface MqttSubscriberProps {
  disabled?: boolean;
}

export function MqttSubscriber({ disabled = false }: MqttSubscriberProps) {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const topics = output.mqttSubscribeTopics ?? [];

  const [topicInput, setTopicInput] = useState("");

  const addTopic = () => {
    const nextTopic = normalizeTopic(topicInput);
    if (!nextTopic || topics.includes(nextTopic)) {
      return;
    }
    setOutput({ mqttSubscribeTopics: [...topics, nextTopic] });
    setTopicInput("");
  };

  const removeTopic = (topic: string) => {
    setOutput({ mqttSubscribeTopics: topics.filter((entry) => entry !== topic) });
  };

  return (
    <Stack spacing={1.5} sx={{ textTransform: "none" }}>
      <Typography variant="subtitle2">{t("monitor.subscribe")}</Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          label={t("common.topic")}
          size="small"
          value={topicInput}
          onChange={(event) => setTopicInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTopic();
            }
          }}
          disabled={disabled}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              sx: { textTransform: "none" },
            },
            htmlInput: {
              autoCapitalize: "off",
              autoCorrect: "off",
              spellCheck: "false",
            },
          }}
        />
        <Button
          variant="contained"
          onClick={addTopic}
          disabled={disabled || !normalizeTopic(topicInput)}
          sx={{ flexShrink: 0 }}
        >
          {t("monitor.subscribe")}
        </Button>
      </Stack>

      {topics.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {topics.map((topic) => (
            <Chip
              key={topic}
              label={topic}
              size="small"
              onDelete={disabled ? undefined : () => removeTopic(topic)}
              deleteIcon={<CloseIcon />}
              sx={{
                textTransform: "none",
                "& .MuiChip-label": { textTransform: "none" },
              }}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("monitor.addTopicStart")}
        </Typography>
      )}
    </Stack>
  );
}
