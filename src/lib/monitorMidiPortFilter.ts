export type MonitorMidiPortFilterState = Set<string> | null;

export function defaultMonitorMidiPortFilter(): MonitorMidiPortFilterState {
  return null;
}

export function isMidiPortFilterActive(filter: MonitorMidiPortFilterState) {
  return filter !== null;
}

export function matchesMidiPortFilter(
  portName: string | null | undefined,
  filter: MonitorMidiPortFilterState,
) {
  if (!isMidiPortFilterActive(filter)) {
    return true;
  }

  const key = portName?.trim() || "";
  return filter.has(key);
}

export function collectMonitorMidiPorts(
  entries: Array<{ portName?: string | null }>,
  inputPorts: string[],
  outputPorts: string[],
) {
  const ports = new Set<string>();

  for (const entry of entries) {
    const port = entry.portName?.trim();
    if (port) {
      ports.add(port);
    }
  }

  for (const port of inputPorts) {
    if (port.trim()) {
      ports.add(port.trim());
    }
  }

  for (const port of outputPorts) {
    if (port.trim()) {
      ports.add(port.trim());
    }
  }

  return [...ports].sort((left, right) => left.localeCompare(right));
}

export function toggleMonitorMidiPort(
  filter: MonitorMidiPortFilterState,
  ports: string[],
  port: string,
  enabled: boolean,
): MonitorMidiPortFilterState {
  const current = filter ?? new Set(ports);
  const next = new Set(current);

  if (enabled) {
    next.add(port);
  } else {
    next.delete(port);
  }

  if (next.size === ports.length) {
    return null;
  }

  return next;
}
