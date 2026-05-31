export function isInboundInspection(type: string) {
  return type.toLowerCase().includes("inbound");
}

export function isOutboundInspection(type: string) {
  return type.toLowerCase().includes("outbound");
}

export function isFailedInspection(type: string) {
  const n = type.toLowerCase();
  return n.includes("fail") || n.includes("reject");
}
