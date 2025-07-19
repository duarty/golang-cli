import app from '../../app';
import request from 'supertest';
import { StatusCodes } from 'http-status-codes';

import factories from '../../factories';
import { Monster } from '../../models';

const server = app.listen();

afterAll(() => server.close());

describe('MonsterController', () => {
  describe('List', () => {
    test('should list all monsters', async () => {
      const sampleSize = 3;
      const monsters = factories.monster.buildList(sampleSize);
      await Promise.all(
        monsters.map(async (data) => (await Monster.query().insert(data)).id)
      );

      const response = await request(server).get('/monsters');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
