import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import OpenInBrowserOutlinedIcon from "@mui/icons-material/OpenInBrowserOutlined";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { GITHUB_RELEASES_URL } from "../links";

const webAppUrl = `${import.meta.env.BASE_URL}app/`;

const features = [
  {
    title: "Performer",
    body: "Build playable UI, wire phone sensors, and drive MediaPipe tracking into your show.",
  },
  {
    title: "Protocols",
    body: "Inspect and compose MIDI, OSC, TUIO, Art-Net, and MQTT traffic in one place.",
  },
  {
    title: "Free desktop",
    body: "Open source under LGPL-3.0. Download builds for macOS, Windows, and Linux.",
  },
] as const;

export function HomePage() {
  return (
    <>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 15% 20%, rgba(151, 109, 121, 0.28), transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 10%, rgba(120, 90, 100, 0.18), transparent 50%),
            linear-gradient(180deg, #1a1819 0%, #121011 100%)
          `,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 5, md: 8 }}
            sx={{ alignItems: { xs: "stretch", md: "center" } }}
          >
            <Stack spacing={3} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box
                  component="img"
                  src={`${import.meta.env.BASE_URL}app-logo.svg`}
                  alt=""
                  sx={{
                    width: { xs: 56, md: 72 },
                    height: { xs: 56, md: 72 },
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  component="h1"
                  color="primary"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    fontSize: { xs: "2.75rem", md: "4rem" },
                    lineHeight: 1,
                  }}
                >
                  WD3000
                </Typography>
              </Stack>

              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontWeight: 400, maxWidth: 520, lineHeight: 1.45 }}
              >
                Performer controls and a protocol debugger for MIDI, OSC, TUIO, Art-Net, and MQTT,
                free for desktop.
              </Typography>

              <Typography color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.5 }}>
                Mobile apps coming soon.
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<DownloadOutlinedIcon />}
                  sx={{ py: 1.5, px: 3, fontSize: "1.05rem" }}
                >
                  Download for desktop
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href={webAppUrl}
                  startIcon={<OpenInBrowserOutlinedIcon />}
                  sx={{ py: 1.5, px: 3, fontSize: "1.05rem" }}
                >
                  Try in browser
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                flex: { md: "0 0 42%" },
                display: "flex",
                justifyContent: { xs: "center", md: "flex-end" },
              }}
            >
              <Box
                component="img"
                src={`${import.meta.env.BASE_URL}hero.png`}
                alt="WD3000 performer and debugger home screen"
                sx={{
                  width: "100%",
                  maxWidth: 360,
                  borderRadius: 3,
                  border: 1,
                  borderColor: "divider",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                }}
              />
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 7, md: 10 }, borderTop: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            Built for live systems
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 5, maxWidth: 560 }}>
            One desktop app for shaping performer input and watching the traffic that leaves it.
          </Typography>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 4, md: 6 }}
            sx={{ alignItems: "stretch" }}
          >
            {features.map((feature) => (
              <Box key={feature.title} sx={{ flex: 1 }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {feature.body}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
