import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Monster } from '../models/monster.extended.model';

export const list = async (req: Request, res: Response): Promise<Response> => {
    try {
        const monsters = await Monster.query();
        return res.status(StatusCodes.OK).json(monsters);
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch monsters' });
    }
};

export const MonsterExtendedController = {
    list,
};
