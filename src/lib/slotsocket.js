export function slotSocketUrl() {
  const api = import.meta.env.VITE_API_URL || "";
  if (api.startsWith("https://")) {
    return `${api.replace(/^https/, "wss")}/ws/slots`;
  }
  if (api.startsWith("http://")) {
    return `${api.replace(/^http/, "ws")}/ws/slots`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/slots`;
}

export function overlapsSearch(event, startIso, endIso) {
  if (!event?.startAt || !event?.endAt) {
    return true;
  }
  return event.startAt < endIso && event.endAt > startIso;
}
