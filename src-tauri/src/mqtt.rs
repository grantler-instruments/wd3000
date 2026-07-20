use rumqttc::{AsyncClient, Client, Event, Incoming, MqttOptions, Outgoing, QoS, RecvTimeoutError, Transport};
use rumqttd::{Broker, Config, ConnectionSettings, RouterConfig, ServerSettings};
use serde::Serialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

const MONITOR_CLIENT_ID: &str = "wd3000-monitor";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttDebugMessage {
    pub summary: String,
    pub topic: String,
    pub payload: Vec<u8>,
    pub qos: u8,
    pub retain: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttMonitorStatus {
    /// One of: "connecting", "connected", "disconnected".
    pub status: String,
    pub detail: Option<String>,
}

fn emit_monitor_status(app: &AppHandle, status: &str, detail: Option<String>) {
    let _ = app.emit(
        "mqtt-monitor-status",
        MqttMonitorStatus {
            status: status.to_string(),
            detail,
        },
    );
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct BrokerEndpoints {
    tcp: u16,
    ws: u16,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttBrokerStatus {
    pub enabled: bool,
    pub running: bool,
    pub tcp_port: Option<u16>,
    pub ws_port: Option<u16>,
    pub listening: bool,
    pub subscribe_topics: Option<Vec<String>>,
}

pub struct MqttState {
    inner: Mutex<MqttInner>,
}

struct MqttInner {
    broker_enabled: bool,
    broker_endpoints: Option<BrokerEndpoints>,
    broker_handle: Option<JoinHandle<()>>,
    monitor_stop: Option<Arc<AtomicBool>>,
    monitor_handle: Option<JoinHandle<()>>,
    subscribe_topics: Option<Vec<String>>,
}

impl MqttState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(MqttInner {
                broker_enabled: false,
                broker_endpoints: None,
                broker_handle: None,
                monitor_stop: None,
                monitor_handle: None,
                subscribe_topics: None,
            }),
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn publish(
        &self,
        host: String,
        port: u16,
        protocol: String,
        topic: String,
        payload: Vec<u8>,
        qos: u8,
        retain: bool,
    ) -> Result<(), String> {
        let trimmed_topic = topic.trim().to_string();
        if trimmed_topic.is_empty() {
            return Err("MQTT topic cannot be empty.".to_string());
        }

        let endpoint = parse_broker_endpoint(&host, port, &protocol)?;
        let mqtt_qos = parse_qos(qos)?;
        let client_id = format!(
            "wd3000-pub-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|duration| duration.as_millis())
                .unwrap_or(0)
        );
        let mqttoptions = build_client_options(&client_id, &endpoint);

        run_publish_sync(
            mqttoptions,
            &endpoint.label,
            trimmed_topic,
            mqtt_qos,
            retain,
            payload,
        )
    }

    fn ensure_broker(&self, tcp_port: u16, ws_port: u16) -> Result<(), String> {
        if tcp_port == 0 {
            return Err("MQTT TCP port must be greater than 0.".to_string());
        }
        if ws_port == 0 {
            return Err("MQTT WebSocket port must be greater than 0.".to_string());
        }
        if tcp_port == ws_port {
            return Err("MQTT TCP and WebSocket ports must be different.".to_string());
        }

        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        let endpoints = BrokerEndpoints {
            tcp: tcp_port,
            ws: ws_port,
        };

        if inner.broker_endpoints == Some(endpoints) && inner.broker_handle.is_some() {
            return Ok(());
        }

        if inner.broker_endpoints.is_some() && inner.broker_endpoints != Some(endpoints) {
            return Err(
                "MQTT broker ports cannot be changed while the app is running. Restart the app."
                    .to_string(),
            );
        }

        self.stop_monitor_locked(&mut inner)?;

        let config = build_broker_config(tcp_port, ws_port);
        let mut broker = Broker::new(config);
        let handle = thread::Builder::new()
            .name("mqtt-broker".into())
            .spawn(move || {
                if let Err(error) = broker.start() {
                    eprintln!("MQTT broker stopped: {error}");
                }
            })
            .map_err(|error| format!("Failed to start MQTT broker thread: {error}"))?;

        thread::sleep(Duration::from_millis(250));

        inner.broker_endpoints = Some(endpoints);
        inner.broker_handle = Some(handle);
        Ok(())
    }

    pub fn start_broker(&self, tcp_port: u16, ws_port: u16) -> Result<(), String> {
        self.ensure_broker(tcp_port, ws_port)?;

        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        inner.broker_enabled = true;
        Ok(())
    }

    pub fn stop_broker(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        inner.broker_enabled = false;
        self.stop_monitor_locked(&mut inner)
    }

    fn stop_monitor_locked(&self, inner: &mut MqttInner) -> Result<(), String> {
        if let Some(stop_flag) = inner.monitor_stop.take() {
            stop_flag.store(true, Ordering::Relaxed);
        }
        if let Some(handle) = inner.monitor_handle.take() {
            let _ = handle.join();
        }
        inner.subscribe_topics = None;
        Ok(())
    }

    pub fn start_monitor(
        &self,
        app: AppHandle,
        host: String,
        port: u16,
        protocol: String,
        subscribe_topics: Vec<String>,
    ) -> Result<(), String> {
        let topics: Vec<String> = subscribe_topics
            .into_iter()
            .map(|topic| topic.trim().to_string())
            .filter(|topic| !topic.is_empty())
            .collect();
        if topics.is_empty() {
            return Err("MQTT subscribe topics cannot be empty.".to_string());
        }

        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        self.stop_monitor_locked(&mut inner)?;

        let stop_flag = Arc::new(AtomicBool::new(false));
        let monitor_stop = Arc::clone(&stop_flag);
        let app_handle = app.clone();

        let stored_topics = topics.clone();
        let handle = thread::Builder::new()
            .name("mqtt-monitor".into())
            .spawn(move || run_monitor(app_handle, host, port, protocol, topics, monitor_stop))
            .map_err(|error| format!("Failed to start MQTT monitor thread: {error}"))?;

        inner.monitor_stop = Some(stop_flag);
        inner.monitor_handle = Some(handle);
        inner.subscribe_topics = Some(stored_topics);
        Ok(())
    }

    pub fn stop_monitor(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        self.stop_monitor_locked(&mut inner)
    }

    pub fn status(&self) -> Result<MqttBrokerStatus, String> {
        let inner = self.inner.lock().map_err(|error| error.to_string())?;
        Ok(MqttBrokerStatus {
            enabled: inner.broker_enabled,
            running: inner.broker_handle.is_some(),
            tcp_port: inner.broker_endpoints.map(|endpoints| endpoints.tcp),
            ws_port: inner.broker_endpoints.map(|endpoints| endpoints.ws),
            listening: inner.monitor_handle.is_some(),
            subscribe_topics: inner.subscribe_topics.clone(),
        })
    }
}

fn build_broker_config(tcp_port: u16, ws_port: u16) -> Config {
    let tcp_listen: SocketAddr = format!("0.0.0.0:{tcp_port}")
        .parse()
        .expect("valid MQTT TCP listen address");
    let ws_listen: SocketAddr = format!("0.0.0.0:{ws_port}")
        .parse()
        .expect("valid MQTT WebSocket listen address");

    let connection_settings = ConnectionSettings {
        connection_timeout_ms: 60_000,
        max_payload_size: 262_144,
        max_inflight_count: 100,
        auth: None,
        external_auth: None,
        dynamic_filters: true,
    };

    let mut v4 = HashMap::new();
    v4.insert(
        "1".to_string(),
        ServerSettings {
            name: "wd3000-tcp".to_string(),
            listen: tcp_listen,
            tls: None,
            next_connection_delay_ms: 1,
            connections: connection_settings.clone(),
        },
    );

    let mut ws = HashMap::new();
    ws.insert(
        "1".to_string(),
        ServerSettings {
            name: "wd3000-ws".to_string(),
            listen: ws_listen,
            tls: None,
            next_connection_delay_ms: 1,
            connections: connection_settings,
        },
    );

    // NOTE: `RouterConfig::default()` derives all-zero fields (max_connections = 0,
    // max_segment_size = 0, …), which makes the router refuse every connection and
    // store nothing — the listeners bind but no client can actually use the broker.
    // These are the working values from rumqttd's own reference `rumqttd.toml`.
    let router = RouterConfig {
        max_connections: 10_010,
        max_outgoing_packet_count: 200,
        max_segment_size: 104_857_600,
        max_segment_count: 10,
        ..RouterConfig::default()
    };

    Config {
        id: 0,
        router,
        v4: Some(v4),
        v5: None,
        ws: Some(ws),
        cluster: None,
        console: None,
        bridge: None,
        prometheus: None,
        metrics: None,
    }
}

fn parse_qos(qos: u8) -> Result<QoS, String> {
    match qos {
        0 => Ok(QoS::AtMostOnce),
        1 => Ok(QoS::AtLeastOnce),
        2 => Ok(QoS::ExactlyOnce),
        _ => Err(format!("Invalid MQTT QoS: {qos}. Use 0, 1, or 2.")),
    }
}

fn normalize_mqtt_host(host: &str) -> String {
    let trimmed = host.trim();
    if trimmed.eq_ignore_ascii_case("localhost") {
        "127.0.0.1".to_string()
    } else {
        trimmed.to_string()
    }
}

struct BrokerEndpoint {
    host: String,
    port: u16,
    protocol: String,
    label: String,
}

fn parse_broker_endpoint(
    host_input: &str,
    port_input: u16,
    protocol_input: &str,
) -> Result<BrokerEndpoint, String> {
    let trimmed = host_input.trim();
    if trimmed.is_empty() {
        return Err("MQTT broker host cannot be empty.".to_string());
    }

    if trimmed.contains("://") {
        let url = url::Url::parse(trimmed)
            .map_err(|error| format!("Invalid broker URL: {error}"))?;
        let host = url
            .host_str()
            .ok_or_else(|| "Broker URL is missing a host.".to_string())?
            .to_string();
        let port = url.port().unwrap_or(port_input);
        let protocol = match url.scheme() {
            "mqtt" | "tcp" => "tcp".to_string(),
            "ws" => "ws".to_string(),
            "mqtts" | "ssl" | "tls" | "wss" => {
                return Err("TLS MQTT connections are not supported yet.".to_string());
            }
            scheme => return Err(format!("Unsupported broker URL scheme: {scheme}")),
        };
        let label = format!("{protocol}://{host}:{port}");
        return Ok(BrokerEndpoint {
            host,
            port,
            protocol,
            label,
        });
    }

    if port_input == 0 {
        return Err("MQTT broker port must be greater than 0.".to_string());
    }

    let host = normalize_mqtt_host(trimmed);
    let protocol = protocol_input.trim().to_ascii_lowercase();
    let label = format!("{protocol}://{host}:{port_input}");
    Ok(BrokerEndpoint {
        host,
        port: port_input,
        protocol,
        label,
    })
}

fn format_ws_url(host: &str, port: u16) -> String {
    if host.contains(':') && !host.starts_with('[') {
        format!("ws://[{host}]:{port}/")
    } else {
        format!("ws://{host}:{port}/")
    }
}

fn build_client_options(client_id: &str, endpoint: &BrokerEndpoint) -> MqttOptions {
    let mut options = match endpoint.protocol.as_str() {
        "ws" => {
            let broker_addr = format_ws_url(&endpoint.host, endpoint.port);
            let mut options = MqttOptions::new(client_id, broker_addr, endpoint.port);
            options.set_transport(Transport::Ws);
            options
        }
        _ => {
            let mut options = MqttOptions::new(client_id, endpoint.host.clone(), endpoint.port);
            options.set_transport(Transport::Tcp);
            options
        }
    };
    options.set_keep_alive(Duration::from_secs(30));
    options
}

fn run_publish_sync(
    mqttoptions: MqttOptions,
    endpoint_label: &str,
    topic: String,
    qos: QoS,
    retain: bool,
    payload: Vec<u8>,
) -> Result<(), String> {
    use rumqttc::mqttbytes::v4::ConnectReturnCode;

    let (client, mut connection) = Client::new(mqttoptions, 10);
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let mut connected = false;
    let mut publish_queued = false;

    while std::time::Instant::now() < deadline {
        match connection.recv_timeout(Duration::from_millis(250)) {
            Ok(Ok(Event::Incoming(Incoming::ConnAck(connack)))) => {
                if connack.code != ConnectReturnCode::Success {
                    return Err(format!(
                        "MQTT broker refused connection ({endpoint_label}): {:?}",
                        connack.code
                    ));
                }
                connected = true;
                if !publish_queued {
                    client
                        .publish(&topic, qos, retain, payload.clone())
                        .map_err(|error| {
                            format!("MQTT publish failed ({endpoint_label}): {error}")
                        })?;
                    publish_queued = true;
                }
            }
            Ok(Ok(Event::Outgoing(Outgoing::Publish(_)))) if connected && qos == QoS::AtMostOnce => {
                return Ok(());
            }
            Ok(Ok(Event::Incoming(Incoming::PubAck(_)))) => return Ok(()),
            Ok(Ok(Event::Incoming(Incoming::PubComp(_)))) => return Ok(()),
            Ok(Ok(Event::Incoming(Incoming::PubRec(_)))) => continue,
            Ok(Ok(_)) => continue,
            Ok(Err(error)) => {
                return Err(format!(
                    "MQTT {} failed ({}): {error}",
                    if connected { "publish" } else { "connect" },
                    endpoint_label
                ));
            }
            Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => {
                return Err(format!(
                    "MQTT connection closed unexpectedly ({endpoint_label})."
                ));
            }
        }
    }

    if !connected {
        return Err(format!("MQTT connect timed out ({endpoint_label})."));
    }
    Err(format!("MQTT publish timed out ({endpoint_label})."))
}

fn run_monitor(
    app: AppHandle,
    host: String,
    port: u16,
    protocol: String,
    subscribe_topics: Vec<String>,
    stop_flag: Arc<AtomicBool>,
) {
    use rumqttc::mqttbytes::v4::SubscribeFilter;

    let runtime = match tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
    {
        Ok(runtime) => runtime,
        Err(error) => {
            let _ = app.emit(
                "control-input-error",
                format!("Failed to start MQTT monitor runtime: {error}"),
            );
            return;
        }
    };

    runtime.block_on(async {
        use rumqttc::mqttbytes::v4::ConnectReturnCode;

        let endpoint = match parse_broker_endpoint(&host, port, &protocol) {
            Ok(endpoint) => endpoint,
            Err(error) => {
                emit_monitor_status(&app, "disconnected", Some(error.clone()));
                let _ = app.emit("control-input-error", error);
                return;
            }
        };
        let mqttoptions = build_client_options(MONITOR_CLIENT_ID, &endpoint);

        let filters: Vec<SubscribeFilter> = subscribe_topics
            .iter()
            .map(|topic| SubscribeFilter::new(topic.clone(), QoS::AtMostOnce))
            .collect();

        emit_monitor_status(&app, "connecting", Some(endpoint.label.clone()));

        // `AsyncClient`'s event loop reconnects automatically as long as we keep
        // polling it. We resubscribe on every fresh `ConnAck`, and we never break
        // out of the loop on a connection error — that way, closing and reopening
        // the broker transparently re-establishes the monitor connection.
        let (client, mut eventloop) = AsyncClient::new(mqttoptions, 100);
        let mut connected = false;

        while !stop_flag.load(Ordering::Relaxed) {
            match tokio::time::timeout(Duration::from_millis(250), eventloop.poll()).await {
                Ok(Ok(Event::Incoming(Incoming::ConnAck(connack)))) => {
                    if connack.code != ConnectReturnCode::Success {
                        connected = false;
                        let detail = format!(
                            "MQTT broker refused connection ({}): {:?}",
                            endpoint.label, connack.code
                        );
                        emit_monitor_status(&app, "disconnected", Some(detail.clone()));
                        let _ = app.emit("control-input-error", detail);
                        continue;
                    }

                    if let Err(error) = client.subscribe_many(filters.clone()).await {
                        let detail =
                            format!("MQTT subscribe failed ({}): {error}", endpoint.label);
                        emit_monitor_status(&app, "disconnected", Some(detail.clone()));
                        let _ = app.emit("control-input-error", detail);
                        continue;
                    }

                    connected = true;
                    emit_monitor_status(&app, "connected", Some(endpoint.label.clone()));
                }
                Ok(Ok(Event::Incoming(Incoming::Publish(publish)))) => {
                    emit_mqtt_publish(
                        &app,
                        publish.topic,
                        publish.payload.to_vec(),
                        publish.qos as u8,
                        publish.retain,
                    );
                }
                Ok(Ok(_)) => {}
                Ok(Err(error)) => {
                    // The connection dropped (or never came up). Report the state
                    // change once, then keep looping so the event loop retries.
                    if connected {
                        let _ = app.emit(
                            "control-input-error",
                            format!("MQTT monitor error ({}): {error}", endpoint.label),
                        );
                        // Fall back to "connecting" to show the event loop is
                        // actively retrying while the broker is unreachable.
                        emit_monitor_status(&app, "connecting", Some(endpoint.label.clone()));
                    }
                    connected = false;
                    // Back off briefly so we don't busy-spin while the broker is down.
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
                Err(_) => continue,
            }
        }

        // The listener was stopped: tear the connection down and report it.
        let _ = client.disconnect().await;
        emit_monitor_status(&app, "disconnected", None);
    });
}

fn emit_mqtt_publish(app: &AppHandle, topic: String, payload: Vec<u8>, qos: u8, retain: bool) {
    let summary = format_mqtt_summary(&topic, &payload, qos, retain);
    let _ = app.emit(
        "mqtt-debug-message",
        MqttDebugMessage {
            summary,
            topic,
            payload,
            qos,
            retain,
        },
    );
}

fn format_mqtt_summary(topic: &str, payload: &[u8], qos: u8, retain: bool) -> String {
    let payload_text = format_payload_preview(payload);
    let mut parts = vec![topic.to_string(), format!("qos={qos}")];
    if retain {
        parts.push("retain".to_string());
    }
    parts.push(payload_text);
    parts.join(" ")
}

fn format_payload_preview(payload: &[u8]) -> String {
    if payload.is_empty() {
        return "<empty>".to_string();
    }

    if let Ok(text) = std::str::from_utf8(payload) {
        if text.chars().all(|ch| !ch.is_control() || ch == '\n' || ch == '\r' || ch == '\t') {
            let preview: String = text.chars().take(120).collect();
            if text.chars().count() > 120 {
                return format!("\"{preview}…\"");
            }
            return format!("\"{preview}\"");
        }
    }

    let preview = payload
        .iter()
        .take(16)
        .map(|byte| format!("{byte:02x}"))
        .collect::<Vec<_>>()
        .join(" ");
    if payload.len() > 16 {
        format!("<{preview} … {len} bytes>", len = payload.len())
    } else {
        format!("<{preview}>")
    }
}

#[tauri::command]
pub fn start_mqtt_broker(
    state: State<'_, MqttState>,
    tcp_port: u16,
    ws_port: u16,
) -> Result<(), String> {
    if tcp_port == 0 || ws_port == 0 {
        return state.stop_broker();
    }

    state.start_broker(tcp_port, ws_port)
}

#[tauri::command]
pub fn stop_mqtt_broker(state: State<'_, MqttState>) -> Result<(), String> {
    state.stop_broker()
}

#[tauri::command]
pub fn start_mqtt_listener(
    app: AppHandle,
    state: State<'_, MqttState>,
    host: String,
    port: u16,
    protocol: String,
    subscribe_topics: Vec<String>,
) -> Result<(), String> {
    if port == 0 || subscribe_topics.is_empty() {
        return state.stop_monitor();
    }

    state.start_monitor(app, host, port, protocol, subscribe_topics)
}

#[tauri::command]
pub fn stop_mqtt_listener(state: State<'_, MqttState>) -> Result<(), String> {
    state.stop_monitor()
}

#[tauri::command]
pub fn get_mqtt_broker_status(state: State<'_, MqttState>) -> Result<MqttBrokerStatus, String> {
    state.status()
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn mqtt_publish(
    state: State<'_, MqttState>,
    host: String,
    port: u16,
    protocol: String,
    topic: String,
    payload: Vec<u8>,
    qos: u8,
    retain: bool,
) -> Result<(), String> {
    state.publish(host, port, protocol, topic, payload, qos, retain)
}
