import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { GITHUB_ISSUES_URL, PRIVACY_POLICY_URL } from "../links";

const sections = [
  {
    title: "Overview",
    body: [
      "WD3000 is a performer and protocol tool from Grantler Instruments. This privacy policy explains what information the app may access and how that information is handled.",
      "We do not require an account to use WD3000, and we do not operate a WD3000 cloud service that collects your show data.",
    ],
  },
  {
    title: "Information the app may access",
    body: [
      "Camera: when you use MediaPipe features, WD3000 may access the camera to analyze pose or hand tracking on your device. Camera frames are processed locally for that purpose and are not uploaded to Grantler Instruments.",
      "Sensors: when you enable sensor input, WD3000 may read device motion and related sensors you choose to use. Sensor values are processed on your device and only leave the device if you map them to protocols you configure.",
      "Network protocols: WD3000 can send and receive MIDI, OSC, TUIO, Art-Net, MQTT, and similar traffic to destinations you configure (for example local devices or hosts on your network). That traffic is under your control.",
      "Local settings: the app may store preferences and project-related settings on your device so your setup persists between sessions.",
    ],
  },
  {
    title: "What we do not collect",
    body: [
      "Grantler Instruments does not collect analytics, advertising identifiers, or personal profile data through WD3000 for marketing purposes.",
      "We do not sell your personal information.",
    ],
  },
  {
    title: "Third parties",
    body: [
      "Protocol traffic you send reaches only the hosts, devices, or brokers you configure. Those systems are outside Grantler Instruments’ control and may have their own privacy practices.",
      "Optional support links on the website (for example Buy Me a Coffee or GitHub) are operated by those services under their own policies.",
    ],
  },
  {
    title: "Children",
    body: [
      "WD3000 is not directed at children under 13, and we do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this privacy policy from time to time. The updated policy will be posted at this URL with a revised “Last updated” date.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about this policy or privacy in WD3000 can be raised through the project issue tracker.",
    ],
  },
] as const;

export function PrivacyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Stack spacing={4}>
        <Box>
          <Typography component="h1" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            Privacy Policy
          </Typography>
          <Typography color="text.secondary">Last updated: July 19, 2026</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Canonical URL:{" "}
            <Link href={PRIVACY_POLICY_URL} color="primary" underline="hover">
              {PRIVACY_POLICY_URL}
            </Link>
          </Typography>
        </Box>

        {sections.map((section) => (
          <Box key={section.title} component="section">
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
              {section.title}
            </Typography>
            <Stack spacing={1.5}>
              {section.body.map((paragraph) => (
                <Typography key={paragraph} color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {paragraph}
                </Typography>
              ))}
            </Stack>
          </Box>
        ))}

        <Typography color="text.secondary">
          Report privacy questions or concerns via{" "}
          <Link href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer" underline="hover">
            GitHub Issues
          </Link>
          , or return to the{" "}
          <Link component={RouterLink} to="/" underline="hover">
            home page
          </Link>
          .
        </Typography>
      </Stack>
    </Container>
  );
}
