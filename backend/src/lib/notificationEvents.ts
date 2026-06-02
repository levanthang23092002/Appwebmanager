const encoder = new TextEncoder();

const globalNotificationEvents = global as unknown as {
  notificationEventClients?: Set<ReadableStreamDefaultController<Uint8Array>>;
};

function clients() {
  if (!globalNotificationEvents.notificationEventClients) {
    globalNotificationEvents.notificationEventClients = new Set();
  }
  return globalNotificationEvents.notificationEventClients;
}

function encodeSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function emitNotificationEvent() {
  const chunk = encodeSse('notifications', { at: Date.now() });
  for (const controller of clients()) {
    try {
      controller.enqueue(chunk);
    } catch {
      clients().delete(controller);
    }
  }
}

export function createNotificationEventStream() {
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
