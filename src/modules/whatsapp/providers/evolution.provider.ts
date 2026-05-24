// modules/whatsapp/providers/evolution.provider.ts

export interface SendTextOptions {
  instanceKey: string;
  to: string;
  message: string;
}

export class EvolutionApiProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
    this.apiKey = process.env.EVOLUTION_API_KEY ?? "";
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const res = await globalThis.fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Evolution API ${res.status}: ${error}`);
    }

    return res.json();
  }

  async createInstance(instanceKey: string, webhookUrl: string) {
    return this.fetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: instanceKey,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
        },
      }),
    });
  }

  async getQrCode(instanceKey: string) {
    return this.fetch(`/instance/connect/${instanceKey}`);
  }

  async getStatus(instanceKey: string) {
    return this.fetch(`/instance/connectionState/${instanceKey}`);
  }

  async sendText(opts: SendTextOptions) {
    return this.fetch(`/message/sendText/${opts.instanceKey}`, {
      method: "POST",
      body: JSON.stringify({ number: opts.to, text: opts.message }),
    });
  }

  async deleteInstance(instanceKey: string) {
    return this.fetch(`/instance/delete/${instanceKey}`, { method: "DELETE" });
  }
}
