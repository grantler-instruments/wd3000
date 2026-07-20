import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { BrowserFrame, DesktopFrame, PhoneFrame, TabletFrame } from "./DeviceFrames";

const base = import.meta.env.BASE_URL;

type PlatformId = "ios" | "android" | "tablet" | "desktop" | "browser";

type Platform = {
  id: PlatformId;
  label: string;
  /** Image paths under `website/public/`. Empty = one placeholder. */
  screenshots: string[];
  alt: string;
  placeholder: string;
};

// Add more paths per platform as you drop files into website/public/platforms/.
const platforms: Platform[] = [
  {
    id: "ios",
    label: "iOS",
    screenshots: [`${base}hero.png`],
    alt: "WD3000 on iPhone",
    placeholder: "iOS screenshot coming soon",
  },
  {
    id: "android",
    label: "Android",
    screenshots: [],
    alt: "WD3000 on Android",
    placeholder: "Android screenshot coming soon",
  },
  {
    id: "tablet",
    label: "Tablet",
    screenshots: [],
    alt: "WD3000 on tablet",
    placeholder: "Tablet screenshot coming soon",
  },
  {
    id: "desktop",
    label: "Desktop",
    screenshots: [`${base}platforms/desktop-1.png`, `${base}platforms/desktop-2.png`],
    alt: "WD3000 on desktop",
    placeholder: "Desktop screenshot coming soon",
  },
  {
    id: "browser",
    label: "Browser",
    screenshots: [`${base}platforms/browser-1.png`],
    alt: "WD3000 in the browser",
    placeholder: "Browser screenshot coming soon",
  },
];

function PlatformPreview({ platform, index }: { platform: Platform; index: number }) {
  const src = platform.screenshots[index] ?? null;
  const frameProps = {
    src,
    alt:
      platform.screenshots.length > 1
        ? `${platform.alt} (${index + 1} of ${platform.screenshots.length})`
        : platform.alt,
    placeholder: platform.placeholder,
  };

  switch (platform.id) {
    case "ios":
    case "android":
      return <PhoneFrame {...frameProps} maxWidth={{ xs: 240, md: 280 }} />;
    case "tablet":
      return <TabletFrame {...frameProps} maxWidth={{ xs: 280, md: 340 }} />;
    case "desktop":
      return <DesktopFrame {...frameProps} maxWidth={{ xs: 360, md: 480 }} />;
    case "browser":
      return <BrowserFrame {...frameProps} maxWidth={{ xs: 360, md: 480 }} />;
  }
}

function ScreenshotDots({
  count,
  index,
  onChange,
  label,
}: {
  count: number;
  index: number;
  onChange: (next: number) => void;
  label: string;
}) {
  if (count <= 1) {
    return null;
  }

  return (
    <Box
      component="nav"
      aria-label={`${label} screenshots`}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
        pt: 0.5,
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const selected = i === index;
        return (
          <Box
            key={i}
            component="button"
            type="button"
            aria-label={`Screenshot ${i + 1} of ${count}`}
            aria-current={selected ? "true" : undefined}
            onClick={() => onChange(i)}
            sx={{
              appearance: "none",
              border: 0,
              p: 0.5,
              m: 0,
              bgcolor: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: selected ? 18 : 7,
                height: 7,
                borderRadius: 999,
                bgcolor: selected ? "primary.main" : "text.secondary",
                opacity: selected ? 1 : 0.35,
                transition: "width 160ms ease, opacity 160ms ease, background-color 160ms ease",
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

export function PlatformShowcase() {
  const [platformId, setPlatformId] = useState<PlatformId>("ios");
  const [shotIndex, setShotIndex] = useState(0);
  const platform = platforms.find((item) => item.id === platformId) ?? platforms[0];

  useEffect(() => {
    setShotIndex(0);
  }, [platformId]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 2,
        width: "100%",
      }}
    >
      <Tabs
        value={platformId}
        onChange={(_, value: PlatformId) => setPlatformId(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Platform screenshots"
        sx={{
          minHeight: 40,
          "& .MuiTabs-flexContainer": { gap: 0.5 },
          "& .MuiTab-root": {
            minHeight: 40,
            minWidth: "auto",
            px: 1.5,
            py: 0.75,
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "text.secondary",
            opacity: 1,
          },
          "& .Mui-selected": {
            color: "primary.main",
          },
          "& .MuiTabs-indicator": {
            height: 2,
            borderRadius: 1,
          },
        }}
      >
        {platforms.map((item) => (
          <Tab key={item.id} value={item.id} label={item.label} disableRipple />
        ))}
      </Tabs>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          minHeight: { xs: 360, md: 420 },
          pt: 1,
        }}
      >
        <PlatformPreview platform={platform} index={shotIndex} />
        <ScreenshotDots
          count={platform.screenshots.length}
          index={shotIndex}
          onChange={setShotIndex}
          label={platform.label}
        />
      </Box>
    </Box>
  );
}
