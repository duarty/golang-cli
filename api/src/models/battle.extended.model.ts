import { Id, RelationMappings } from 'objection';
import Base from './base';
import { Monster } from './monster.extended.model';

export class Battle extends Base {
  id!: Id;
  monsterA!: number;
  monsterB!: number;
  winner!: number;

  static tableName = 'battle';

  static get relationMappings(): RelationMappings {
    return {
      monsterARelation: {
        relation: this.BelongsToOneRelation,
        modelClass: () => Monster,
        join: {
          from: 'battle.monsterA',
          to: 'monster.id'
        }
      },
      monsterBRelation: {
        relation: this.BelongsToOneRelation,
        modelClass: () => Monster,
        join: {
          from: 'battle.monsterB',
          to: 'monster.id'
        }
      },
      winnerRelation: {
        relation: this.BelongsToOneRelation,
        modelClass: () => Monster,
        join: {
          from: 'battle.winner',
          to: 'monster.id'
        }
      }
    };
  }
}
