import { emitNotificationEvent } from './notificationEvents';

const encoder = new TextEncoder();
type CostEventAction = 'created' | 'updated' | 'approved' | 'canceled';

type CostEventPayload = {
  action: CostEventAction;
  id?: number;
};

const globalCostEvents = global as unknown as {
  costEventClients?: Set<ReadableStreamDefaultController<Uint8Array>>;
};

function clients() {
  if (!globalCostEvents.costEventClients) {
    globalCostEvents.costEventClients = new Set();
  }
  return globalCostEvents.costEventClients;
}

function encodeSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function emitCostEvent(payload: CostEventPayload) {
  const chunk = encodeSse('costs', { ...payload, at: Date.now() });
  for (const controller of clients()) {
    try {
      controller.enqueue(chunk);
    } catch {
      clients().delete(controller);
    }
  }
  emitNotificationEvent();
}

export function createCostEventStream() {
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      clients().add(controller);
      controller.enqueue(encodeSse('connected', { ok: true, at: Date.now() }));
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clients().delete(controller);
          if (keepAlive) clearInterval(keepAlive);
        }
      }, 25_000);
    },
    cancel() {
      if (streamController) clients().delete(streamController);
      if (keepAlive) clearInterval(keepAlive);
    },
  });
}
