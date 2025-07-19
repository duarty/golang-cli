# Battle of Monsters - Complete Implementation Documentation

## Implementation Summary

Successfully implemented all requested functionalities for the Battle of Monsters project:

✅ **Monster listing endpoint** - Implemented in `src/controllers/monster.extended.controller.ts:5-12`
✅ **Battle endpoint with complete algorithm** - Implemented in `src/controllers/battle.extended.controller.ts:25-175`
✅ **Database schema fix** - Added missing `name` column in `knex/migrations/20220901222137_extended_alter_table.ts:5-7`
✅ **TODO tests implemented** - Completed in `src/controllers/__tests__/battle.extended.spec.ts:12-72`
✅ **92.92% test coverage** (exceeds required 80%)
✅ **Linting approved** with no errors

## Technical Documentation

### 1. Database Schema Fix (knex/migrations/20220901222137_extended_alter_table.ts)

```typescript
export async function up(knex: Knex): Promise<void> {
    // Adds the missing 'name' column to the 'monster' table
    // This column is required to store monster names as specified in the model
    await knex.schema.alterTable('monster', (table) => {
        table.string('name').notNullable();
    });
}
```

**Technical justification**: The seed data was trying to insert the `name` column but the original migration didn't create it, causing SQL errors. This fix allows the database to accept all monster data properly.

### 2. Monster Listing Endpoint Implementation (src/controllers/monster.extended.controller.ts)

```typescript
// Imports the Monster model to perform database queries
import { Monster } from '../models/monster.extended.model';

export const list = async (req: Request, res: Response): Promise<Response> => {
    try {
        // Uses Objection.js ORM to fetch all monsters from the database
        // The query() method returns a Promise with all records from the table
        const monsters = await Monster.query();
        
        // Returns HTTP 200 OK status with the list of monsters in JSON format
        return res.status(StatusCodes.OK).json(monsters);
    } catch (error) {
        // In case of query error, returns HTTP 500 with error message
        // This prevents internal error details from being exposed to the client
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch monsters' });
    }
};
```

**Technical justification**: Simple RESTful endpoint that uses try-catch pattern for error handling and returns appropriate HTTP status codes. Using Objection.js ORM facilitates querying without raw SQL.

### 3. Battle Algorithm Implementation (src/controllers/battle.extended.controller.ts)

#### Interfaces and Types:

```typescript
// Interface to define the battle request contract
// Ensures only monster IDs are sent in the request
interface BattleRequest {
    monster1Id: number;
    monster2Id: number;
}

// Interface for simplified monster data during battle
// Removes complex ORM properties to avoid serialization issues
interface MonsterData {
    id: number;
    name: string;
    attack: number;
    defense: number;
    hp: number;
    speed: number;
    imageUrl: string;
}
```

#### Input Validations:

```typescript
// Validates if both IDs were provided in the request
// Prevents battles with incomplete data
if (!monster1Id || !monster2Id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'Both monster1Id and monster2Id are required' 
    });
}

// Prevents a monster from battling itself
// Business rule that ensures valid battles
if (monster1Id === monster2Id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'Monsters cannot battle themselves' 
    });
}
```

#### Monster Fetching and Validation:

```typescript
// Fetches monsters from database using their IDs
// The findById method returns null if the monster doesn't exist
const monster1 = await Monster.query().findById(monster1Id);
const monster2 = await Monster.query().findById(monster2Id);

// Validates if both monsters exist in the database
// Prevents battles with non-existent monsters
if (!monster1 || !monster2) {
    return res.status(StatusCodes.NOT_FOUND).json({ 
        error: 'One or both monsters not found' 
    });
}
```

#### Battle Simulation Algorithm:

```typescript
function simulateBattle(monster1: Monster, monster2: Monster): BattleResult {
    // Creates copies of monsters with current HP to simulate damage during battle
    // Preserves original data and adds currentHp to control combat
    const fighter1 = { 
        id: monster1.id as number,
        name: monster1.name,
        attack: monster1.attack,
        defense: monster1.defense,
        hp: monster1.hp,
        speed: monster1.speed,
        imageUrl: monster1.imageUrl,
        currentHp: monster1.hp  // HP that will be modified during battle
    };
    
    // Determines which monster attacks first based on rules:
    // 1. Higher speed attacks first
    // 2. If speeds are equal, higher attack goes first
    let currentAttacker = fighter1;
    let currentDefender = fighter2;

    if (fighter2.speed > fighter1.speed || 
        (fighter2.speed === fighter1.speed && fighter2.attack > fighter1.attack)) {
        currentAttacker = fighter2;
        currentDefender = fighter1;
    }

    // Main battle loop - continues until one monster has HP <= 0
    while (fighter1.currentHp > 0 && fighter2.currentHp > 0) {
        // Calculates damage: attack - defense, minimum 1 damage
        // Ensures there's always progress in the battle
        const damage = Math.max(1, currentAttacker.attack - currentDefender.defense);
        
        // Applies damage, not allowing negative HP
        currentDefender.currentHp = Math.max(0, currentDefender.currentHp - damage);

        // Records the turn for battle history
        // Allows later analysis of how the battle developed
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

        // If defender died, ends the battle
        if (currentDefender.currentHp <= 0) {
            break;
        }

        // Switches roles: attacker becomes defender and vice versa
        // Implements alternating turn system
        [currentAttacker, currentDefender] = [currentDefender, currentAttacker];
    }

    // Determines winner based on who still has HP > 0
    const winner = fighter1.currentHp > 0 ? monster1 : monster2;
    
    return { winner, battleData: { monster1, monster2, turns } };
}
```

#### Result Persistence:

```typescript
// Saves battle result to database
// Stores monster IDs and winner for history
const battleData = {
    monsterA: monster1.id as number,
    monsterB: monster2.id as number,
    winner: battleResult.winner.id as number
};
const battle = await Battle.query().insert(battleData);

// Returns complete response with battle data and turn history
// HTTP 201 CREATED status indicates a new resource was created
return res.status(StatusCodes.CREATED).json({
    id: battle.id,
    winner: battleResult.winner,
    battleData: battleResult.battleData
});
```

### 4. Model Relation Mappings

#### Monster Model (src/models/monster.extended.model.ts):

```typescript
static get relationMappings(): RelationMappings {
    return {
        // One-to-many relationship from monster to battles
        // A monster can participate in multiple battles as monsterA or monsterB
        battles: {
            relation: this.HasManyRelation,
            modelClass: () => Battle,
            join: {
                from: 'monster.id',
                to: ['battle.monsterA', 'battle.monsterB']  // Monster can be in either position
            }
        }
    };
}
```

#### Battle Model (src/models/battle.extended.model.ts):

```typescript
static get relationMappings(): RelationMappings {
    return {
        // Relationship to the first monster in the battle
        monsterARelation: {
            relation: this.BelongsToOneRelation,
            modelClass: () => Monster,
            join: { from: 'battle.monsterA', to: 'monster.id' }
        },
        // Relationship to the second monster in the battle  
        monsterBRelation: {
            relation: this.BelongsToOneRelation,
            modelClass: () => Monster,
            join: { from: 'battle.monsterB', to: 'monster.id' }
        },
        // Relationship to the winning monster
        winnerRelation: {
            relation: this.BelongsToOneRelation,
            modelClass: () => Monster,
            join: { from: 'battle.winner', to: 'monster.id' }
        }
    };
}
```

### 5. TODO Tests Implementation (src/controllers/__tests__/battle.extended.spec.ts)

```typescript
// Test for input validation with undefined monster
test('should fail when trying a battle of monsters with an undefined monster', async () => {
    const response = await request(server)
        .post('/battle')
        .send({
            monster1Id: undefined,  // Simulates invalid input
            monster2Id: 2
        });

    // Verifies it returns 400 Bad Request error
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.error).toBe('Both monster1Id and monster2Id are required');
});

// Test for non-existent monsters in database
test('should fail when trying a battle of monsters with an inexistent monster', async () => {
    const response = await request(server)
        .post('/battle')
        .send({
            monster1Id: 999,  // IDs that don't exist in database
            monster2Id: 1000
        });

    // Verifies it returns 404 Not Found error
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.error).toBe('One or both monsters not found');
});

// Test for successful battle with specific result
test('should insert a battle of monsters successfully with monster 1 winning', async () => {
    const response = await request(server)
        .post('/battle')
        .send({
            monster1Id: 3,  // Red Dragon (superior stats)
            monster2Id: 1   // Dead Unicorn (inferior stats)
        });

    // Verifies battle was created successfully
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('winner');
    expect(response.body).toHaveProperty('battleData');
    
    // Verifies Red Dragon (ID 3) won as expected by algorithm
    expect(response.body.winner.id).toBe(3);
    
    // Verifies complete battle data structure
    expect(response.body.battleData).toHaveProperty('monster1');
    expect(response.body.battleData).toHaveProperty('monster2');
    expect(response.body.battleData).toHaveProperty('turns');
    expect(Array.isArray(response.body.battleData.turns)).toBe(true);
});

// Test for successful battle with opposite result
test('should insert a battle of monsters successfully with monster 2 winning', async () => {
    const response = await request(server)
        .post('/battle')
        .send({
            monster1Id: 1,  // Dead Unicorn (inferior stats)
            monster2Id: 3   // Red Dragon (superior stats)
        });

    // Verifies battle was created successfully
    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('winner');
    expect(response.body).toHaveProperty('battleData');
    
    // Verifies Red Dragon (ID 3) won regardless of position
    expect(response.body.winner.id).toBe(3);
    
    // Verifies complete battle data structure
    expect(response.body.battleData).toHaveProperty('monster1');
    expect(response.body.battleData).toHaveProperty('monster2');
    expect(response.body.battleData).toHaveProperty('turns');
    expect(Array.isArray(response.body.battleData.turns)).toBe(true);
});
```

## Battle Algorithm Rules Implementation

The battle algorithm follows these specific rules as requested:

1. **Turn Order**: Monster with highest speed attacks first. If speeds are equal, monster with higher attack goes first.

2. **Damage Calculation**: Damage = Attacker's Attack - Defender's Defense. If result is ≤ 0, damage is set to 1.

3. **HP Reduction**: Defender's HP = Current HP - Damage calculated above.

4. **Turn System**: Monsters alternate attacks until one reaches 0 HP.

5. **Single Request**: All battle turns are calculated in one request, returning the complete battle result including winner and turn history.

6. **Winner Determination**: The monster with HP > 0 at the end wins.

## Test Results

### Coverage Report
```
---------------------------------|---------|----------|---------|---------|-------------------
File                             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------------------------|---------|----------|---------|---------|-------------------
All files                        |   92.92 |     87.5 |   71.42 |   92.63 |                   
 src/controllers                 |   94.44 |     87.5 |     100 |      94 |                   
  battle.extended.controller.ts  |   94.59 |     87.5 |     100 |   94.44 | 46,75             
  monster.extended.controller.ts |      90 |      100 |     100 |    87.5 | 10                
---------------------------------|---------|----------|---------|---------|-------------------
```

### Test Suite Results
- ✅ 6 test suites passed
- ✅ 10 tests passed  
- ✅ 0 snapshots
- ✅ All TODO tests implemented and passing

## Final Results

- **✅ Test Coverage**: 92.92% (exceeds required 80%)
- **✅ Linting**: Passed with no errors
- **✅ All endpoints implemented**: Monster listing and battle creation
- **✅ Complete battle algorithm**: Implements all specified rules
- **✅ TODO tests completed**: All 4 tests implemented and functional
- **✅ Robust error handling**: Input validations and error cases covered

The implementation follows development best practices with clean, well-tested, and fully functional code according to the specified requirements.

## API Endpoints

### GET /monsters
Returns a list of all available monsters.

**Response Example:**
```json
[
  {
    "id": 1,
    "name": "Dead Unicorn",
    "attack": 60,
    "defense": 40,
    "hp": 10,
    "speed": 80,
    "imageUrl": "https://fsl-assessment-public-files.s3.amazonaws.com/assessment-cc-01/dead-unicorn.png"
  }
]
```

### POST /battle
Creates a new battle between two monsters.

**Request Body:**
```json
{
  "monster1Id": 1,
  "monster2Id": 3
}
```

**Response Example:**
```json
{
  "id": 1,
  "winner": {
    "id": 3,
    "name": "Red Dragon",
    "attack": 90,
    "defense": 80,
    "hp": 90,
    "speed": 70,
    "imageUrl": "https://fsl-assessment-public-files.s3.amazonaws.com/assessment-cc-01/red-dragon.png"
  },
  "battleData": {
    "monster1": { /* Monster 1 data */ },
    "monster2": { /* Monster 2 data */ },
    "turns": [
      {
        "attacker": { /* Attacker data */ },
        "defender": { /* Defender data */ },
        "damage": 10,
        "remainingHp": 70
      }
    ]
  }
}
```
