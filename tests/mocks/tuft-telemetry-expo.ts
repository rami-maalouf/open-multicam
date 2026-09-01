export function createExpoTelemetry() {
  return {
    error: jest.fn(),
    event: jest.fn(),
    flush: jest.fn(async () => ({ status: "empty", count: 0 })),
  };
}
