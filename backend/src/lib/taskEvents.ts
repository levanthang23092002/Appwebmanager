import { emitNotificationEvent } from './notificationEvents';

const encoder = new TextEncoder();
type TaskEventAction = 'created' | 'updated' | 'deleted' | 'transitioned';

type TaskEventPayload = {
  action: TaskEventAction;
  id?: number;
};

const globalTaskEvents = global as unknown as {
  taskEventClients?: Set<ReadableStreamDefaultController<Uint8Array>>;
};

function clients() {
  if (!globalTaskEvents.taskEventClients) {
    globalTaskEvents.taskEventClients = new Set();
  }
  return globalTaskEvents.taskEventClients;
}

function encodeSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function emitTaskEvent(payload: TaskEventPayload) {
  const chunk = encodeSse('tasks', { ...payload, at: Date.now() });
  for (const controller of clients()) {
    try {
      controller.enqueue(chunk);
    } catch {
      clients().delete(controller);
    }
  }
  emitNotificationEvent();
}

export function createTaskEventStream() {
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
