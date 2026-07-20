import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import OpenInBrowserOutlinedIcon from "@mui/icons-material/OpenInBrowserOutlined";
import { Box, Button, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { PlatformShowcase } from "../components/PlatformShowcase";
import { GITHUB_RELEASES_URL } from "../links";

const webAppUrl = `${import.meta.env.BASE_URL}app/`;

const features = [
  {
    title: "Performer",
    body: "Build playable controls and drive tracking into your show.",
    bullets: [
      { label: "UI", description: "Design playable controls for live performance." },
      { label: "Sensor", description: "Map phone motion and orientation into your show." },
      { label: "MediaPipe", description: "Track hands, face, and body as control input." },
    ],
  },
  {
    title: "Debuggers",
    body: "Composers and monitors for show traffic in one place.",
    bullets: [
      { label: "MIDI", description: "Compose and monitor MIDI messages." },
      { label: "OSC", description: "Compose and monitor OSC traffic." },
      { label: "TUIO", description: "Compose and monitor TUIO touch streams." },
      { label: "Art-Net", description: "Compose and monitor Art-Net / DMX." },
      { label: "MQTT", description: "Compose and monitor MQTT topics." },
    ],
  },
  {
    title: "Free desktop & browser",
    body: "Open source under LGPL-3.0. Download builds for macOS, Windows, and Linux, or run in the browser.",
  },
] as const;

const showFlow = [
  {
    title: "Input",
    body: "UI, sensors, and MediaPipe tracking from the performer.",
  },
  {
    title: "Map",
    body: "Route and shape values into the signals your show needs.",
  },
  {
    title: "Out",
    body: "Send and inspect MIDI, OSC, TUIO, Art-Net, and MQTT.",
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
                free for desktop & browser.
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
                flex: { md: "0 0 48%" },
                minWidth: 0,
                display: "flex",
                justifyContent: { xs: "center", md: "flex-end" },
              }}
            >
              <PlatformShowcase />
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 8 }, borderTop: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            Who it&apos;s for
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ maxWidth: 720, lineHeight: 1.6, fontSize: "1.1rem" }}
          >
            Built for lighting, AV, interactive installations, and performers. Also for anyone who
            just needs a debugger: send a MIDI or DMX message, monitor what&apos;s coming in, and
            replay it when something misbehaves.
          </Typography>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 8 }, borderTop: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            How it fits a show
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 560, lineHeight: 1.6 }}>
            One path from performer input to show traffic.
          </Typography>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 3, md: 2 }}
            sx={{ alignItems: { xs: "stretch", md: "flex-start" } }}
          >
            {showFlow.map((step, index) => (
              <Stack
                key={step.title}
                direction={{ xs: "column", md: "row" }}
                spacing={{ xs: 0, md: 2 }}
                sx={{ flex: 1, alignItems: { md: "flex-start" } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    color="primary"
                    sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {step.body}
                  </Typography>
                </Box>
                {index < showFlow.length - 1 && (
                  <Typography
                    aria-hidden
                    color="text.disabled"
                    sx={{
                      display: { xs: "none", md: "block" },
                      pt: 3.5,
                      flexShrink: 0,
                      fontSize: "1.25rem",
                      lineHeight: 1,
                    }}
                  >
                    →
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 7, md: 10 }, borderTop: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            Built for live systems
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 5, maxWidth: 560 }}>
            Performer tools and protocol debuggers, free on desktop and in the browser.
          </Typography>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2.5, md: 3 }}
            sx={{ alignItems: "stretch" }}
          >
            {features.map((feature) => (
              <Card
                key={feature.title}
                variant="outlined"
                sx={{
                  flex: 1,
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  borderColor: "divider",
                }}
              >
                <CardContent
                  sx={{ p: { xs: 2.5, md: 3 }, "&:last-child": { pb: { xs: 2.5, md: 3 } } }}
                >
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.body}
                  </Typography>
                  {"bullets" in feature && (
                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        mt: 1.5,
                        pl: 2.25,
                        color: "text.secondary",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      {feature.bullets.map((item) => (
                        <Box component="li" key={item.label} sx={{ lineHeight: 1.45 }}>
                          <Typography
                            component="span"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            {item.label}
                          </Typography>
                          <Typography component="span" color="text.secondary">
                            {": "}
                            {item.description}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
