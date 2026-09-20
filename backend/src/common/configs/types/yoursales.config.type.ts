export type YourSalesConfigType = {
  apiKey: string;
  brand: string;
  baseUrl: string;
  testPhoneAllowlist: string;
  forceLiveSend: boolean;
  webhookSecret: string;
  webhookIps: string;
  // Phase 37 flips this to `true` when it wires `status=failed -> real Zalo
  // send`. Today it stays false. See yoursales-webhook-security.assertion.ts
  // (D-07): the app fails closed at boot if this is ever true while BOTH
  // webhookIps and webhookSecret are empty.
  webhookFallbackArmed: boolean;
};
