import { Id, RelationMappings } from 'objection';
import Base from './base';
import { Battle } from './battle.extended.model';

export class Monster extends Base {
  id!: Id;
  name!: string;
  attack!: number;
  defense!: number;
  hp!: number;
  speed!: number;
  imageUrl!: string;
  battles?: Battle[];

  static tableName = 'monster';

  static get relationMappings(): RelationMappings {
    return {
      battles: {
        relation: this.HasManyRelation,
        modelClass: () => Battle,
        join: {
          from: 'monster.id',
          to: ['battle.monsterA', 'battle.monsterB']
        }
      }
    };
  }
}
