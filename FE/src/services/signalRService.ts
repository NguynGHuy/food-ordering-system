import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import { API_URL } from "./api";

const serverUrl = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

const hubUrl = `${serverUrl}/hubs/thong-bao`;

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection | null> | null = null;
let stopPromise: Promise<void> | null = null;
let startingToken: string | null = null;
let connectedToken: string | null = null;

export function getNotificationConnection(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem("token") || "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnecting(() => undefined);

    connection.onreconnected(() => {
      connectedToken = localStorage.getItem("token");

      // SignalR does not replay events missed while the browser was offline.
      // Trigger one scoped catch-up refresh after reconnect so financial and
      // order screens cannot remain stale after a network interruption.
      window.dispatchEvent(
        new CustomEvent("realtime-data-changed", {
          detail: {
            phamVi: [
              "thongBao",
              "donHang",
              "vi",
              "doiSoat",
              "taiChinh",
              "hopDong",
              "hoSoPhapLy",
              "nhaHang",
              "tongQuan",
            ],
            duLieu: { hanhDong: "KetNoiLai" },
          },
        }),
      );

      window.dispatchEvent(new Event("notifications-updated"));
    });

    connection.onclose(() => {
      connectedToken = null;
    });
  }

  return connection;
}

export async function startNotificationConnection(): Promise<HubConnection | null> {
  if (stopPromise) {
    await stopPromise;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  const hub = getNotificationConnection();

  if (hub.state === HubConnectionState.Connected && connectedToken === token) {
    return hub;
  }

  if (startPromise) {
    if (startingToken === token) {
      return startPromise;
    }

    await startPromise;
  }

  if (
    hub.state !== HubConnectionState.Disconnected &&
    connectedToken !== token
  ) {
    await stopNotificationConnection();
  }

  if (hub.state === HubConnectionState.Connected) {
    return hub;
  }

  if (
    hub.state === HubConnectionState.Connecting ||
    hub.state === HubConnectionState.Reconnecting
  ) {
    return hub;
  }

  startingToken = token;

  startPromise = hub
    .start()
    .then(() => {
      connectedToken = token;
      return hub;
    })
    .catch(() => {
      connectedToken = null;
      return null;
    })
    .finally(() => {
      startPromise = null;
      startingToken = null;
    });

  return startPromise;
}

export async function stopNotificationConnection(): Promise<void> {
  if (stopPromise) {
    return stopPromise;
  }

  const hub = connection;

  stopPromise = (async () => {
    try {
      const pendingStart = startPromise;

      if (pendingStart) {
        await pendingStart;
      }

      if (hub && hub.state !== HubConnectionState.Disconnected) {
        await hub.stop();
      }
    } catch {
      // Kết nối đã ở trạng thái đóng hoặc đang bị trình duyệt hủy.
    } finally {
      connectedToken = null;
      startingToken = null;
      startPromise = null;
      stopPromise = null;
    }
  })();

  return stopPromise;
}
