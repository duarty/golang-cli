import app from '../../app';
import request from 'supertest';
import { StatusCodes } from 'http-status-codes';

const server = app.listen();

afterAll(() => server.close());

describe('BattleController', () => {
  describe('List', () => {
    test('should list all battles', async () => {
      const response = await request(server).get('/battle');
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });
  });
});
