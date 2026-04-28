import { describe, test, expect, jest } from '@jest/globals';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  test('GET /health returns ok status', () => {
    const controller = new HealthController();
    const result = controller.health();
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
  });
});
