import app from '../../app';
import request from 'supertest';
import { StatusCodes } from 'http-status-codes';

const server = app.listen();

afterAll(() => server.close());

describe('BattleExtendedController', () => {

    describe('Battle', () => {
        test('should fail when trying a battle of monsters with an undefined monster', async () => {
            const response = await request(server)
                .post('/battle')
                .send({
                    monster1Id: undefined,
                    monster2Id: 2
                });

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.error).toBe('Both monster1Id and monster2Id are required');
        });

        test('should fail when trying a battle of monsters with an inexistent monster', async () => {
            const response = await request(server)
                .post('/battle')
                .send({
                    monster1Id: 999,
                    monster2Id: 1000
                });

            expect(response.status).toBe(StatusCodes.NOT_FOUND);
            expect(response.body.error).toBe('One or both monsters not found');
        });

        test('should insert a battle of monsters successfully with monster 1 winning', async () => {
            const response = await request(server)
                .post('/battle')
                .send({
                    monster1Id: 3,
                    monster2Id: 1
                });

            expect(response.status).toBe(StatusCodes.CREATED);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('winner');
            expect(response.body).toHaveProperty('battleData');
            expect(response.body.winner.id).toBe(3);
            expect(response.body.battleData).toHaveProperty('monster1');
            expect(response.body.battleData).toHaveProperty('monster2');
            expect(response.body.battleData).toHaveProperty('turns');
            expect(Array.isArray(response.body.battleData.turns)).toBe(true);
        });

        test('should insert a battle of monsters successfully with monster 2 winning', async () => {
            const response = await request(server)
                .post('/battle')
                .send({
                    monster1Id: 1,
                    monster2Id: 3
                });

            expect(response.status).toBe(StatusCodes.CREATED);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('winner');
            expect(response.body).toHaveProperty('battleData');
            expect(response.body.winner.id).toBe(3);
            expect(response.body.battleData).toHaveProperty('monster1');
            expect(response.body.battleData).toHaveProperty('monster2');
            expect(response.body.battleData).toHaveProperty('turns');
            expect(Array.isArray(response.body.battleData.turns)).toBe(true);
        });
    });
});
