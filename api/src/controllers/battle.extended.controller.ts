import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Monster } from '../models/monster.extended.model';
import { Battle } from '../models/battle.extended.model';

interface BattleRequest {
    monster1Id: number;
    monster2Id: number;
}

interface MonsterData {
    id: number;
    name: string;
    attack: number;
    defense: number;
    hp: number;
    speed: number;
    imageUrl: string;
}

interface BattleResult {
    winner: Monster;
    battleData: {
        monster1: Monster;
        monster2: Monster;
        turns: Array<{
            attacker: MonsterData;
            defender: MonsterData;
            damage: number;
            remainingHp: number;
        }>;
    };
}

const create = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { monster1Id, monster2Id }: BattleRequest = req.body;

        if (!monster1Id || !monster2Id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Both monster1Id and monster2Id are required'
            });
        }

        if (monster1Id === monster2Id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Monsters cannot battle themselves'
            });
        }

        const monster1 = await Monster.query().findById(monster1Id);
        const monster2 = await Monster.query().findById(monster2Id);

        if (!monster1 || !monster2) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: 'One or both monsters not found'
            });
        }

        const battleResult = simulateBattle(monster1, monster2);

        const battleData = {
            monsterA: monster1.id as number,
            monsterB: monster2.id as number,
            winner: battleResult.winner.id as number
        };
        const battle = await Battle.query().insert(battleData);

        return res.status(StatusCodes.CREATED).json({
            id: battle.id,
            winner: battleResult.winner,
            battleData: battleResult.battleData
        });

    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: 'Failed to create battle'
        });
    }
};

function simulateBattle(monster1: Monster, monster2: Monster): BattleResult {
    const fighter1 = {
        id: monster1.id as number,
        name: monster1.name,
        attack: monster1.attack,
        defense: monster1.defense,
        hp: monster1.hp,
        speed: monster1.speed,
        imageUrl: monster1.imageUrl,
        currentHp: monster1.hp
    };
    const fighter2 = {
        id: monster2.id as number,
        name: monster2.name,
        attack: monster2.attack,
        defense: monster2.defense,
        hp: monster2.hp,
        speed: monster2.speed,
        imageUrl: monster2.imageUrl,
        currentHp: monster2.hp
    };

    const turns: Array<{
        attacker: MonsterData;
        defender: MonsterData;
        damage: number;
        remainingHp: number;
    }> = [];

    let currentAttacker = fighter1;
    let currentDefender = fighter2;

    if (fighter2.speed > fighter1.speed ||
        (fighter2.speed === fighter1.speed && fighter2.attack > fighter1.attack)) {
        currentAttacker = fighter2;
        currentDefender = fighter1;
    }

    while (fighter1.currentHp > 0 && fighter2.currentHp > 0) {
        const damage = Math.max(1, currentAttacker.attack - currentDefender.defense);
        currentDefender.currentHp = Math.max(0, currentDefender.currentHp - damage);

        turns.push({
            attacker: {
                id: currentAttacker.id,
                name: currentAttacker.name,
                attack: currentAttacker.attack,
                defense: currentAttacker.defense,
                hp: currentAttacker.hp,
                speed: currentAttacker.speed,
                imageUrl: currentAttacker.imageUrl
            },
            defender: {
                id: currentDefender.id,
                name: currentDefender.name,
                attack: currentDefender.attack,
                defense: currentDefender.defense,
                hp: currentDefender.hp,
                speed: currentDefender.speed,
                imageUrl: currentDefender.imageUrl
            },
            damage,
            remainingHp: currentDefender.currentHp
        });

        if (currentDefender.currentHp <= 0) {
            break;
        }

        [currentAttacker, currentDefender] = [currentDefender, currentAttacker];
    }

    const winner = fighter1.currentHp > 0 ? monster1 : monster2;

    return {
        winner,
        battleData: {
            monster1,
            monster2,
            turns
        }
    };
}


export const BattleExtendedController = {
    create,
};