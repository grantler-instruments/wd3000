import i18n from "./i18n";

export type ControlType = "button" | "slider" | "keyboard" | "pad" | "tabs";

export const CONTROL_WIDGET_TYPES = [
  "button",
  "slider",
  "keyboard",
  "pad",
  "tabs",
] as const satisfies readonly ControlType[];

export function controlTypeLabel(type: ControlType): string {
  switch (type) {
    case "button":
      return i18n.t("controlTypes.button");
    case "slider":
      return i18n.t("controlTypes.slider");
    case "keyboard":
      return i18n.t("controlTypes.keyboard");
    case "pad":
      return i18n.t("controlTypes.pad");
    case "tabs":
      return i18n.t("controlTypes.tabs");
  }
}

/** @deprecated Legacy exclusive protocol selector; migrated to per-mapping `enabled`. */
export type ControlProtocol = "osc" | "midi" | "mqtt" | "both";

export type AppMode = "edit" | "play";

export type DashboardView = "home" | "performer" | "debugger";

export type PerformerSubView = "ui" | "sensors" | "mediapipe";

export type DebuggerSubView = "midi" | "osc" | "tuio" | "artnet" | "mqtt";

export interface MqttMapping {
  enabled: boolean;
  topic: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}

export interface OscMapping {
  enabled: boolean;
  address: string;
}

export interface MidiMapping {
  enabled: boolean;
  channel: number;
  note: number;
  cc: number;
  ccY?: number;
  octaves?: number;
  velocity?: number;
}

export function controlOutputsFromLegacyProtocol(protocol: ControlProtocol): {
  oscEnabled: boolean;
  midiEnabled: boolean;
  mqttEnabled: boolean;
} {
  return {
    oscEnabled: protocol === "osc" || protocol === "both",
    midiEnabled: protocol === "midi" || protocol === "both",
    mqttEnabled: protocol === "mqtt",
  };
}

export interface ControlLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export interface LayoutSettings {
  gridSize: number;
}

export type SliderOrientation = "horizontal" | "vertical";

export interface ControlTab {
  id: string;
  label: string;
}

export interface TabDropPreview {
  tabsControlId: string;
  tabId: string;
  x: number;
  y: number;
  sourceControlId?: string;
}

export interface Control {
  id: string;
  type: ControlType;
  label: string;
  color?: string | null;
  sliderOrientation?: SliderOrientation;
  tabs?: ControlTab[];
  parentId?: string;
  tabId?: string;
  oscSenderId?: string | null;
  midiOutputId?: string | null;
  oscReceiverId?: string | null;
  midiInputId?: string | null;
  mqttConnectionId?: string | null;
  osc: OscMapping;
  midi: MidiMapping;
  mqtt: MqttMapping;
  layout: ControlLayout;
}

export const CONTROL_COLOR_PRESETS = [
  "#f44336",
  "#ff9800",
  "#ffeb3b",
  "#4caf50",
  "#2196f3",
  "#9c27b0",
  "#e91e63",
  "#00bcd4",
] as const;

export function isValidControlColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export interface OutputConfig {
  oscHost: string;
  oscPort: number;
  oscListenPort: number;
  mqttBrokerPort: number;
  mqttBrokerWsPort: number;
  mqttBrokerEnabled: boolean;
  mqttSubscribeTopics: string[];
  mqttMonitorHost: string;
  mqttMonitorPort: number;
  mqttMonitorProtocol: "tcp" | "ws";
  mqttComposerHost: string;
  mqttComposerPort: number;
  mqttComposerProtocol: "tcp" | "ws";
  midiPortName: string | null;
  midiInputPortName: string | null;
}

export interface OscSender {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface OscReceiver {
  id: string;
  name: string;
  port: number;
}

export interface MidiOutputEndpoint {
  id: string;
  name: string;
  portName: string;
}

export interface MidiInputEndpoint {
  id: string;
  name: string;
  portName: string;
}

export interface MqttConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: "tcp" | "ws";
}

export interface PerformerIoConfig {
  oscSenders: OscSender[];
  oscReceivers: OscReceiver[];
  midiOutputs: MidiOutputEndpoint[];
  midiInputs: MidiInputEndpoint[];
  mqttConnections: MqttConnection[];
}

export const CONTROL_MIN_WIDTH = 180;
export const CONTROL_DEFAULT_WIDTH = 240;
export const KEYBOARD_MIN_WIDTH = 360;
export const KEYBOARD_DEFAULT_WIDTH = 480;
export const LAYOUT_GRID_SIZE = 16;
export const CONTROL_MIN_HEIGHT = 120;
export const CONTROL_ESTIMATED_HEIGHT = 168;
export const SLIDER_VERTICAL_ESTIMATED_HEIGHT = 280;
export const KEYBOARD_ESTIMATED_HEIGHT = 200;

export const KEYBOARD_MIN_OCTAVES = 1;
export const KEYBOARD_MAX_OCTAVES = 3;
export const KEYBOARD_DEFAULT_OCTAVES = 2;
export const KEYBOARD_DEFAULT_VELOCITY = 100;
export const KEYBOARD_BODY_HEIGHT = 120;
export const PAD_BODY_HEIGHT = 160;
export const PAD_ESTIMATED_HEIGHT = 200;
export const TABS_ESTIMATED_HEIGHT = 240;
export const TABS_MIN_HEIGHT = 160;
export function createTabChildLayout(
  index: number,
  control: Control,
): Pick<ControlLayout, "x" | "y"> {
  const width = control.layout.width;
  const column = index % 2;
  const row = Math.floor(index / 2);

  return {
    x: LAYOUT_GRID_SIZE + column * (width + LAYOUT_GRID_SIZE),
    y: LAYOUT_GRID_SIZE + row * (controlLayoutHeight(control) + LAYOUT_GRID_SIZE),
  };
}

export function tabPanelContentSize(
  children: Control[],
  panelSize: { width: number; height: number },
): { width: number; height: number } {
  if (children.length === 0) {
    return panelSize;
  }

  const contentWidth =
    Math.max(...children.map((control) => control.layout.x + control.layout.width)) +
    LAYOUT_GRID_SIZE * 2;
  const contentHeight =
    Math.max(...children.map((control) => control.layout.y + controlLayoutHeight(control))) +
    LAYOUT_GRID_SIZE * 2;

  return {
    width: Math.max(panelSize.width, contentWidth),
    height: Math.max(panelSize.height, contentHeight),
  };
}

export function createDefaultTabs(): ControlTab[] {
  return [
    { id: crypto.randomUUID(), label: i18n.t("control.tabN", { n: 1 }) },
    { id: crypto.randomUUID(), label: i18n.t("control.tabN", { n: 2 }) },
  ];
}

export function controlTabs(control: Control): ControlTab[] {
  return control.tabs ?? createDefaultTabs();
}

export function isTopLevelControl(control: Control): boolean {
  return !control.parentId;
}

export function topLevelControls(controls: Control[]): Control[] {
  return sortControlsByOrder(controls.filter(isTopLevelControl));
}

export function tabChildControls(controls: Control[], parentId: string, tabId: string): Control[] {
  return sortControlsByOrder(
    controls.filter((control) => control.parentId === parentId && control.tabId === tabId),
  );
}

export function pruneOrphanTabChildren(
  controls: Control[],
  tabsControlId: string,
  validTabIds: Set<string>,
): Control[] {
  return controls.filter(
    (control) =>
      control.parentId !== tabsControlId ||
      (control.tabId !== undefined && validTabIds.has(control.tabId)),
  );
}

export const CONTROL_DRAG_MIME = "application/x-wd40-control-id";

export function readControlDragId(dataTransfer: DataTransfer): string | null {
  const id = dataTransfer.getData("text/plain") || dataTransfer.getData(CONTROL_DRAG_MIME);
  return id.length > 0 ? id : null;
}

export function writeControlDragId(dataTransfer: DataTransfer, controlId: string): void {
  dataTransfer.setData("text/plain", controlId);
  dataTransfer.setData(CONTROL_DRAG_MIME, controlId);
  dataTransfer.effectAllowed = "move";
}

export interface ControlPadValue {
  x: number;
  y: number;
}

export const DEFAULT_CONTROL_PAD_VALUE: ControlPadValue = { x: 50, y: 50 };

export const defaultLayoutSettings = (): LayoutSettings => ({
  gridSize: LAYOUT_GRID_SIZE,
});

export const defaultOutputConfig = (): OutputConfig => ({
  oscHost: "127.0.0.1",
  oscPort: 9000,
  oscListenPort: 9001,
  mqttBrokerPort: 1883,
  mqttBrokerWsPort: 9001,
  mqttBrokerEnabled: false,
  mqttSubscribeTopics: [],
  mqttMonitorHost: "localhost",
  mqttMonitorPort: 1883,
  mqttMonitorProtocol: "tcp",
  mqttComposerHost: "localhost",
  mqttComposerPort: 1883,
  mqttComposerProtocol: "tcp",
  midiPortName: null,
  midiInputPortName: null,
});

export function normalizeOutputConfig(
  value?: Partial<OutputConfig> & { mqttSubscribeFilter?: string },
): OutputConfig {
  const defaults = defaultOutputConfig();
  if (!value) {
    return defaults;
  }

  const subscribeTopics = Array.isArray(value.mqttSubscribeTopics)
    ? value.mqttSubscribeTopics.filter((topic): topic is string => typeof topic === "string")
    : typeof value.mqttSubscribeFilter === "string" && value.mqttSubscribeFilter.trim()
      ? [value.mqttSubscribeFilter]
      : defaults.mqttSubscribeTopics;

  return {
    ...defaults,
    ...value,
    mqttSubscribeTopics: subscribeTopics,
    mqttMonitorHost:
      typeof value.mqttMonitorHost === "string"
        ? value.mqttMonitorHost
        : typeof value.mqttComposerHost === "string"
          ? value.mqttComposerHost
          : defaults.mqttMonitorHost,
    mqttMonitorPort:
      typeof value.mqttMonitorPort === "number"
        ? value.mqttMonitorPort
        : typeof value.mqttComposerPort === "number"
          ? value.mqttComposerPort
          : defaults.mqttMonitorPort,
    mqttMonitorProtocol:
      value.mqttMonitorProtocol === "tcp" || value.mqttMonitorProtocol === "ws"
        ? value.mqttMonitorProtocol
        : value.mqttComposerProtocol === "tcp" || value.mqttComposerProtocol === "ws"
          ? value.mqttComposerProtocol
          : defaults.mqttMonitorProtocol,
  };
}

export function createMqttConnection(
  patch: Partial<MqttConnection> & Pick<MqttConnection, "name">,
): MqttConnection {
  return {
    id: crypto.randomUUID(),
    host: "localhost",
    port: 1883,
    protocol: "tcp",
    ...patch,
  };
}

export function createOscSender(patch: Partial<OscSender> & Pick<OscSender, "name">): OscSender {
  return {
    id: crypto.randomUUID(),
    host: "127.0.0.1",
    port: 9000,
    ...patch,
  };
}

export function createOscReceiver(
  patch: Partial<OscReceiver> & Pick<OscReceiver, "name">,
): OscReceiver {
  return {
    id: crypto.randomUUID(),
    port: 9001,
    ...patch,
  };
}

export function createMidiOutputEndpoint(
  patch: Partial<MidiOutputEndpoint> & Pick<MidiOutputEndpoint, "name">,
): MidiOutputEndpoint {
  return {
    id: crypto.randomUUID(),
    portName: "",
    ...patch,
  };
}

export function createMidiInputEndpoint(
  patch: Partial<MidiInputEndpoint> & Pick<MidiInputEndpoint, "name">,
): MidiInputEndpoint {
  return {
    id: crypto.randomUUID(),
    portName: "",
    ...patch,
  };
}

export function defaultPerformerIoConfig(output?: OutputConfig): PerformerIoConfig {
  const connection = output ?? defaultOutputConfig();
  const oscSender = createOscSender({
    name: i18n.t("io.defaultOscSender", { n: 1 }),
    host: connection.oscHost,
    port: connection.oscPort,
  });
  const oscReceiver = createOscReceiver({
    name: i18n.t("io.defaultOscReceiver", { n: 1 }),
    port: connection.oscListenPort,
  });

  const mqttConnection = createMqttConnection({
    name: i18n.t("io.defaultMqtt", { n: 1 }),
    host: connection.mqttComposerHost,
    port: connection.mqttComposerPort,
    protocol: connection.mqttComposerProtocol,
  });

  return {
    oscSenders: [oscSender],
    oscReceivers: connection.oscListenPort > 0 ? [oscReceiver] : [],
    midiOutputs: connection.midiPortName
      ? [
          createMidiOutputEndpoint({
            name: i18n.t("io.defaultMidiOutput", { n: 1 }),
            portName: connection.midiPortName,
          }),
        ]
      : [],
    midiInputs: connection.midiInputPortName
      ? [
          createMidiInputEndpoint({
            name: i18n.t("io.defaultMidiInput", { n: 1 }),
            portName: connection.midiInputPortName,
          }),
        ]
      : [],
    mqttConnections: [mqttConnection],
  };
}

export function normalizePerformerIoConfig(
  value?: Partial<PerformerIoConfig>,
  output?: OutputConfig,
): PerformerIoConfig {
  const defaults = defaultPerformerIoConfig(output);
  if (!value) {
    return defaults;
  }

  return {
    oscSenders: Array.isArray(value.oscSenders) ? value.oscSenders : defaults.oscSenders,
    oscReceivers: Array.isArray(value.oscReceivers) ? value.oscReceivers : defaults.oscReceivers,
    midiOutputs: Array.isArray(value.midiOutputs) ? value.midiOutputs : defaults.midiOutputs,
    midiInputs: Array.isArray(value.midiInputs) ? value.midiInputs : defaults.midiInputs,
    mqttConnections: Array.isArray(value.mqttConnections)
      ? value.mqttConnections
      : defaults.mqttConnections,
  };
}

export function defaultControlIoAssignments(
  performerIo: PerformerIoConfig,
): Pick<
  Control,
  "oscSenderId" | "midiOutputId" | "oscReceiverId" | "midiInputId" | "mqttConnectionId"
> {
  return {
    oscSenderId: performerIo.oscSenders[0]?.id ?? null,
    midiOutputId: performerIo.midiOutputs[0]?.id ?? null,
    mqttConnectionId: performerIo.mqttConnections[0]?.id ?? null,
    oscReceiverId: performerIo.oscReceivers[0]?.id ?? null,
    midiInputId: performerIo.midiInputs[0]?.id ?? null,
  };
}

export function findMqttConnection(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): MqttConnection | null {
  if (!id) {
    return null;
  }

  return performerIo.mqttConnections.find((connection) => connection.id === id) ?? null;
}

export function findOscSender(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): OscSender | null {
  if (!id) {
    return null;
  }

  return performerIo.oscSenders.find((sender) => sender.id === id) ?? null;
}

export function findOscReceiver(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): OscReceiver | null {
  if (!id) {
    return null;
  }

  return performerIo.oscReceivers.find((receiver) => receiver.id === id) ?? null;
}

export function findMidiOutputEndpoint(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): MidiOutputEndpoint | null {
  if (!id) {
    return null;
  }

  return performerIo.midiOutputs.find((endpoint) => endpoint.id === id) ?? null;
}

export function findMidiInputEndpoint(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): MidiInputEndpoint | null {
  if (!id) {
    return null;
  }

  return performerIo.midiInputs.find((endpoint) => endpoint.id === id) ?? null;
}

export function controlUsesMqttOutput(control: Control): boolean {
  return control.mqtt.enabled && !!control.mqttConnectionId;
}

export function controlUsesOscOutput(control: Control): boolean {
  return control.osc.enabled && !!control.oscSenderId;
}

export function controlUsesMidiOutput(control: Control): boolean {
  return control.midi.enabled && !!control.midiOutputId;
}

export function endpointLabel(name: string, detail: string): string {
  return detail ? `${name} (${detail})` : name;
}

export function createControlLayout(index: number): ControlLayout {
  const width = CONTROL_DEFAULT_WIDTH;
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: LAYOUT_GRID_SIZE + column * (width + LAYOUT_GRID_SIZE),
    y: LAYOUT_GRID_SIZE + row * (CONTROL_ESTIMATED_HEIGHT + LAYOUT_GRID_SIZE),
    width,
    height: CONTROL_ESTIMATED_HEIGHT,
    order: index,
  };
}

function controlDefaultWidth(type: ControlType): number {
  if (type === "keyboard") {
    return KEYBOARD_DEFAULT_WIDTH;
  }

  if (type === "pad") {
    return CONTROL_DEFAULT_WIDTH;
  }

  return CONTROL_DEFAULT_WIDTH;
}

function createControlLayoutForType(type: ControlType, index: number): ControlLayout {
  const width = controlDefaultWidth(type);
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: LAYOUT_GRID_SIZE + column * (width + LAYOUT_GRID_SIZE),
    y: LAYOUT_GRID_SIZE + row * (CONTROL_ESTIMATED_HEIGHT + LAYOUT_GRID_SIZE),
    width,
    height: defaultHeightForType(type),
    order: index,
  };
}

function defaultHeightForType(type: ControlType, control?: Control): number {
  if (control && isVerticalSlider(control)) {
    return SLIDER_VERTICAL_ESTIMATED_HEIGHT;
  }

  switch (type) {
    case "keyboard":
      return KEYBOARD_ESTIMATED_HEIGHT;
    case "pad":
      return PAD_ESTIMATED_HEIGHT;
    case "tabs":
      return TABS_ESTIMATED_HEIGHT;
    default:
      return CONTROL_ESTIMATED_HEIGHT;
  }
}

export function controlLayoutHeight(control: Control): number {
  return control.layout.height ?? defaultHeightForType(control.type, control);
}

export function controlMinHeight(control: Control): number {
  switch (control.type) {
    case "keyboard":
      return 140;
    case "pad":
      return 140;
    case "tabs":
      return TABS_MIN_HEIGHT;
    case "slider":
      return isVerticalSlider(control) ? 200 : CONTROL_MIN_HEIGHT;
    default:
      return CONTROL_MIN_HEIGHT;
  }
}

export function controlMinWidth(type: ControlType): number {
  if (type === "keyboard") {
    return KEYBOARD_MIN_WIDTH;
  }

  return CONTROL_MIN_WIDTH;
}

export function controlCanvasSizeLimits(
  control: Control,
  canvas: { width: number; height: number },
  subtractPosition = true,
): {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
} {
  const minWidth = controlMinWidth(control.type);
  const minHeight = controlMinHeight(control);
  const offsetX = subtractPosition ? control.layout.x : 0;
  const offsetY = subtractPosition ? control.layout.y : 0;

  return {
    minWidth,
    maxWidth: Math.max(minWidth, canvas.width - offsetX),
    minHeight,
    maxHeight: Math.max(minHeight, canvas.height - offsetY),
  };
}

export function isVerticalSlider(control: Control): boolean {
  return control.type === "slider" && control.sliderOrientation === "vertical";
}

export function controlEstimatedHeight(control: Control | ControlType): number {
  if (typeof control !== "string") {
    return controlLayoutHeight(control);
  }

  return defaultHeightForType(control);
}

export function controlFreeLayoutHeight(control: Control): number {
  return controlLayoutHeight(control);
}

export function keyboardNoteRange(control: Control): { start: number; end: number } {
  const octaves = control.midi.octaves ?? KEYBOARD_DEFAULT_OCTAVES;
  const start = control.midi.note;
  return {
    start,
    end: start + octaves * 12 - 1,
  };
}

export function keyboardNotes(control: Control): number[] {
  const { start, end } = keyboardNoteRange(control);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function isBlackKey(note: number): boolean {
  const pitch = note % 12;
  return pitch === 1 || pitch === 3 || pitch === 6 || pitch === 8 || pitch === 10;
}

function controlLabel(type: ControlType, index: number): string {
  switch (type) {
    case "button":
      return i18n.t("controlTypes.buttonN", { n: index });
    case "slider":
      return i18n.t("controlTypes.sliderN", { n: index });
    case "keyboard":
      return i18n.t("controlTypes.keyboardN", { n: index });
    case "pad":
      return i18n.t("controlTypes.padN", { n: index });
    case "tabs":
      return i18n.t("controlTypes.tabsN", { n: index });
  }
}

function controlMqttTopic(type: ControlType, index: number): string {
  switch (type) {
    case "button":
      return `button/${index}`;
    case "slider":
      return `slider/${index}`;
    case "keyboard":
      return `keyboard/${index}`;
    case "pad":
      return `pad/${index}`;
    case "tabs":
      return `tabs/${index}`;
  }
}

export function defaultMqttMapping(type: ControlType, index: number, enabled = false): MqttMapping {
  return {
    enabled,
    topic: controlMqttTopic(type, index),
    qos: 0,
    retain: false,
  };
}

function controlOscAddress(type: ControlType, index: number): string {
  switch (type) {
    case "button":
      return `/button/${index}`;
    case "slider":
      return `/slider/${index}`;
    case "keyboard":
      return `/keyboard/${index}`;
    case "pad":
      return `/pad/${index}`;
    case "tabs":
      return `/tabs/${index}`;
  }
}

export const createControl = (
  type: ControlType,
  index: number,
  layoutIndex: number,
  performerIo?: PerformerIoConfig,
): Control => {
  const midiDefault = type === "keyboard" || type === "pad";
  const io = performerIo ?? defaultPerformerIoConfig();

  return {
    id: crypto.randomUUID(),
    type,
    label: controlLabel(type, index),
    ...defaultControlIoAssignments(io),
    osc: {
      enabled: !midiDefault,
      address: controlOscAddress(type, index),
    },
    mqtt: defaultMqttMapping(type, index, false),
    midi: {
      enabled: midiDefault,
      channel: 1,
      note: type === "keyboard" ? 48 : 60 + index,
      cc: type === "pad" ? index * 2 - 1 : index,
      ...(type === "keyboard"
        ? {
            octaves: KEYBOARD_DEFAULT_OCTAVES,
            velocity: KEYBOARD_DEFAULT_VELOCITY,
          }
        : {}),
      ...(type === "pad" ? { ccY: index * 2 } : {}),
    },
    ...(type === "tabs" ? { tabs: createDefaultTabs() } : {}),
    layout: createControlLayoutForType(type, layoutIndex),
  };
};

export function sortControlsByOrder(controls: Control[]): Control[] {
  return [...controls].sort((left, right) => left.layout.order - right.layout.order);
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function canvasHeight(controls: Control[]): number {
  const topLevel = topLevelControls(controls);

  if (topLevel.length === 0) {
    return 480;
  }

  return (
    Math.max(...topLevel.map((control) => control.layout.y + controlEstimatedHeight(control))) +
    LAYOUT_GRID_SIZE * 2
  );
}

export function controlMappingLabel(control: Control, performerIo?: PerformerIoConfig): string {
  const parts: string[] = [];

  if (control.osc.enabled) {
    const sender = performerIo ? findOscSender(performerIo, control.oscSenderId) : null;
    if (sender) {
      parts.push(`${sender.name}: ${control.osc.address}`);
    } else {
      parts.push(control.osc.address);
    }
  }

  if (control.midi.enabled) {
    const midiPrefix = performerIo
      ? findMidiOutputEndpoint(performerIo, control.midiOutputId)?.name
      : null;
    const prefix = midiPrefix ? `${midiPrefix} · ` : "";

    if (control.type === "button") {
      parts.push(`${prefix}Ch${control.midi.channel} N${control.midi.note}`);
    } else if (control.type === "keyboard") {
      const octaves = control.midi.octaves ?? KEYBOARD_DEFAULT_OCTAVES;
      const end = control.midi.note + octaves * 12 - 1;
      parts.push(`${prefix}Ch${control.midi.channel} ${control.midi.note}–${end}`);
    } else if (control.type === "pad") {
      const ccY = control.midi.ccY ?? control.midi.cc + 1;
      parts.push(`${prefix}Ch${control.midi.channel} CC${control.midi.cc}/CC${ccY}`);
    } else if (control.type === "tabs") {
      parts.push(`${prefix}Ch${control.midi.channel} CC${control.midi.cc}`);
    } else {
      parts.push(`${prefix}Ch${control.midi.channel} CC${control.midi.cc}`);
    }
  }

  if (control.mqtt.enabled) {
    const connection = performerIo
      ? findMqttConnection(performerIo, control.mqttConnectionId)
      : null;
    if (connection) {
      parts.push(`${connection.name}: ${control.mqtt.topic}`);
    } else {
      parts.push(control.mqtt.topic);
    }
  }

  return parts.join(" · ");
}

export function controlActiveProtocolLabels(control: Control): string[] {
  return [
    control.osc.enabled ? i18n.t("protocols.osc") : null,
    control.midi.enabled ? i18n.t("protocols.midi") : null,
    control.mqtt.enabled ? i18n.t("protocols.mqtt") : null,
  ].filter((label): label is string => label !== null);
}
