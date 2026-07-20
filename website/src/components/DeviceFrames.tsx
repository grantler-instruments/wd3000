import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

type FrameShellProps = {
  maxWidth: number | { xs?: number; sm?: number; md?: number };
  children: ReactNode;
  sx?: SxProps<Theme>;
};

function FrameShell({ maxWidth, children, sx }: FrameShellProps) {
  return (
    <Box
      sx={[
        {
          width: "100%",
          maxWidth,
          mx: "auto",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}

type ScreenProps = {
  src?: string | null;
  alt: string;
  placeholder: string;
  aspectRatio: string;
  borderRadius?: string | number;
};

function DeviceScreen({ src, alt, placeholder, aspectRatio, borderRadius = 0 }: ScreenProps) {
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius,
          backgroundColor: "#0a0a0a",
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        aspectRatio,
        borderRadius,
        background: "linear-gradient(165deg, rgba(151,109,121,0.12) 0%, #121011 45%, #0a0a0a 100%)",
        px: 2,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", letterSpacing: "0.04em", opacity: 0.7 }}
      >
        {placeholder}
      </Typography>
    </Box>
  );
}

type DeviceFrameProps = {
  src?: string | null;
  alt: string;
  placeholder: string;
  maxWidth?: number | { xs?: number; sm?: number; md?: number };
};

export function PhoneFrame({ src, alt, placeholder, maxWidth = 260 }: DeviceFrameProps) {
  return (
    <FrameShell maxWidth={maxWidth}>
      <Box
        sx={{
          position: "relative",
          borderRadius: "14.5% / 7.2%",
          p: "3.2%",
          background: "linear-gradient(160deg, #3a3a3c 0%, #1c1c1e 42%, #0a0a0a 100%)",
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.08),
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 28px 70px rgba(0,0,0,0.55)
          `,
          "&::after": {
            content: '""',
            position: "absolute",
            right: "-1.4%",
            top: "18%",
            width: "1.1%",
            height: "9%",
            borderRadius: "2px 3px 3px 2px",
            background: "linear-gradient(90deg, #2c2c2e, #1c1c1e)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: "-1.4%",
            top: "16%",
            width: "1.1%",
            height: "5%",
            borderRadius: "3px 2px 2px 3px",
            background: "linear-gradient(270deg, #2c2c2e, #1c1c1e)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: "-1.4%",
            top: "23%",
            width: "1.1%",
            height: "8%",
            borderRadius: "3px 2px 2px 3px",
            background: "linear-gradient(270deg, #2c2c2e, #1c1c1e)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: "-1.4%",
            top: "33%",
            width: "1.1%",
            height: "8%",
            borderRadius: "3px 2px 2px 3px",
            background: "linear-gradient(270deg, #2c2c2e, #1c1c1e)",
          }}
        />

        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "12.5% / 6.2%",
            backgroundColor: "#000",
            lineHeight: 0,
          }}
        >
          <DeviceScreen src={src} alt={alt} placeholder={placeholder} aspectRatio="9 / 19.5" />
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              left: "50%",
              bottom: "1.4%",
              transform: "translateX(-50%)",
              width: "32%",
              height: "1.1%",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.28)",
            }}
          />
        </Box>
      </Box>
    </FrameShell>
  );
}

export function TabletFrame({ src, alt, placeholder, maxWidth = 340 }: DeviceFrameProps) {
  return (
    <FrameShell maxWidth={maxWidth}>
      <Box
        sx={{
          borderRadius: "4.5% / 3.4%",
          p: "2.4%",
          background: "linear-gradient(160deg, #3a3a3c 0%, #1c1c1e 42%, #0a0a0a 100%)",
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.08),
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 28px 70px rgba(0,0,0,0.55)
          `,
        }}
      >
        <Box
          sx={{
            overflow: "hidden",
            borderRadius: "3.4% / 2.6%",
            backgroundColor: "#000",
            lineHeight: 0,
          }}
        >
          <DeviceScreen src={src} alt={alt} placeholder={placeholder} aspectRatio="3 / 4" />
        </Box>
      </Box>
    </FrameShell>
  );
}

export function DesktopFrame({ src, alt, placeholder, maxWidth = 480 }: DeviceFrameProps) {
  return (
    <FrameShell maxWidth={maxWidth}>
      <Box
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "#0a0a0a",
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.08),
            0 28px 70px rgba(0,0,0,0.55)
          `,
        }}
      >
        <DeviceScreen src={src} alt={alt} placeholder={placeholder} aspectRatio="16 / 10" />
      </Box>
    </FrameShell>
  );
}

export function BrowserFrame({ src, alt, placeholder, maxWidth = 480 }: DeviceFrameProps) {
  return <DesktopFrame src={src} alt={alt} placeholder={placeholder} maxWidth={maxWidth} />;
}
