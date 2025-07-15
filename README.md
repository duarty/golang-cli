Hi! My name is José Duarte. Thank you for this coding test.

Let me show you what we're going to build. I will explain each step and why we make these choices.

First, let's open the project to understand the structure. Now we try to run the API.

We find some version errors. Let's fix them with minimal changes to avoid breaking existing code.

## Battle of Monsters API - Implementation

Now let's walk through each part of the solution. I will explain each line of code and our reasoning.

### 1. Understanding the Project Structure

Let's examine the project structure. Here is what we find:

- Node.js API with TypeScript
- React front-end
- SQLite database with Knex migrations
- Jest for testing

The project uses "extended" files for our implementation. This means:
- We can add our code without changing existing files
- This prevents breaking working functionality
- It's a clean separation of new vs existing code

### 2. Monster List Endpoint - Complete Implementation

**File:** `api/src/controllers/monster.extended.controller.ts`

We need to create an endpoint that returns all monsters. Here is the complete code we're implementing:

```typescript
// Import Express TypeScript types for HTTP handling
import { Request, Response } from 'express';
// Import HTTP status code constants (200, 404, 500, etc.)
import { StatusCodes } from 'http-status-codes';
// Import our Monster database model
import { Monster } from '../models/monster.extended.model';

// Create a service class to handle business logic
class MonsterService {
    // Static method that returns a Promise with Monster array
    static async getAllMonsters(): Promise<Monster[]> {
        // Use Objection.js to get all monsters from database
        return await Monster.query();
    }
}

// Create a utility class for consistent responses
class ResponseHandler {
    // Generic success method that accepts any data type <T>
    static success<T>(res: Response, data: T, statusCode = StatusCodes.OK): Response {
        // Set status code and return JSON data
        return res.status(statusCode).json(data);
    }

    // Error method for consistent error responses
    static error(res: Response, message: string, statusCode = StatusCodes.INTERNAL_SERVER_ERROR): Response {
        // Return error object with message and status code
        return res.status(statusCode).json({ error: message });
    }
}

// Export the list function with proper TypeScript types
export const list = async (req: Request, res: Response): Promise<Response> => {
    // Start try block to catch any errors
    try {
        // Call our service to get all monsters
        const monsters = await MonsterService.getAllMonsters();
        // Use ResponseHandler to send success response
        return ResponseHandler.success(res, monsters);
    // Catch any errors that might happen
    } catch (error) {
        // Use ResponseHandler to send error response
        return ResponseHandler.error(res, 'Failed to retrieve monsters');
    }
};

// Export the controller object
export const MonsterExtendedController = {
    // Include our list function
    list,
};
```

### 3. Battle Algorithm - Complete Implementation

**File:** `api/src/controllers/battle.extended.controller.ts`

This is the main feature - making monsters fight each other. We need to follow specific rules:

**Battle Rules:**
1. Faster monster attacks first
2. If speed is equal, higher attack goes first
3. Damage = attack - defense (minimum 1)
4. Subtract damage from HP
5. Alternate turns until one monster dies

Here is the complete battle implementation:

```typescript
// Import Express TypeScript types for HTTP handling
import { Request, Response } from 'express';
// Import HTTP status constants for consistent responses
import { StatusCodes } from 'http-status-codes';
// Import our monster database model
import { Monster } from '../models/monster.extended.model';
// Import our battle database model
import { Battle } from '../models/battle.extended.model';

// Define what the client sends us (two monster IDs)
interface BattleRequest {
    monster1Id: number;
    monster2Id: number;
}

// Represent one attack in the battle with attacker, defender, damage, and resulting HP
interface BattleTurn {
    attacker: Monster;
    defender: Monster;
    damage: number;
    defenderHpAfter: number;
}

// Internal result of battle simulation with winner and all turns
interface BattleResult {
    winner: Monster;
    turns: BattleTurn[];
}

// What we send back to client including battle ID and full details
interface BattleResponse {
    id: number;
    monsterA: Monster;
    monsterB: Monster;
    winner: Monster;
    turns: BattleTurn[];
}

// Utility class for consistent responses
class ResponseHandler {
    // Generic success method for consistent JSON responses
    static success<T>(res: Response, data: T, statusCode = StatusCodes.OK): Response {
        return res.status(statusCode).json(data);
    }

    // Error method for consistent error responses
    static error(res: Response, message: string, statusCode = StatusCodes.INTERNAL_SERVER_ERROR): Response {
        return res.status(statusCode).json({ error: message });
    }
}

// Class to validate battle requests
class BattleValidator {
    // Check if request body is valid
    static validateRequest(body: unknown): { isValid: boolean; error?: string } {
        // Check if body exists and is an object
        if (!body || typeof body !== 'object') {
            return { isValid: false, error: 'Invalid request body' };
        }

        // Extract monster IDs from request body
        const { monster1Id, monster2Id } = body as Record<string, unknown>;

        // Ensure both monster IDs are provided
        if (!monster1Id || !monster2Id) {
            return { isValid: false, error: 'Both monster1Id and monster2Id are required' };
        }

        // Prevent a monster from fighting itself
        if (monster1Id === monster2Id) {
            return { isValid: false, error: 'A monster cannot battle itself' };
        }

        return { isValid: true };
    }

    // Check if monsters exist in database
    static validateMonsters(monster1: Monster | undefined, monster2: Monster | undefined): { isValid: boolean; error?: string } {
        if (!monster1 || !monster2) {
            return { isValid: false, error: 'One or both monsters not found' };
        }

        return { isValid: true };
    }
}

// Class to calculate damage
class DamageCalculator {
    // Implement damage formula (attack - defense, minimum 1)
    static calculate(attack: number, defense: number): number {
        // Calculate base damage (attack - defense)
        const damage = attack - defense;
        // Return minimum 1 damage using Math.max
        return Math.max(damage, 1);
    }
}

// Class to determine turn order
class TurnOrderStrategy {
    // Implement turn order rules
    static determineFirstAttacker(monster1: Monster, monster2: Monster): { first: Monster; second: Monster } {
        // Faster monster attacks first
        if (monster1.speed > monster2.speed) {
            return { first: monster1, second: monster2 };
        }

        // If monster2 is faster
        if (monster2.speed > monster1.speed) {
            return { first: monster2, second: monster1 };
        }

        // If speed is equal, higher attack goes first
        return monster1.attack >= monster2.attack
            ? { first: monster1, second: monster2 }
            : { first: monster2, second: monster1 };
    }
}

// Class to simulate battles
class BattleSimulator {
    // Create a copy of monster for simulation
    private static cloneMonster(monster: Monster): Monster {
        const clone = Object.create(Object.getPrototypeOf(monster));
        Object.assign(clone, monster);
        return clone;
    }

    // Reduce defender HP but never below 0
    private static applyDamage(defender: Monster, damage: number): void {
        defender.hp = Math.max(defender.hp - damage, 0);
    }

    // Create a battle turn record
    private static createTurn(attacker: Monster, defender: Monster, damage: number): BattleTurn {
        return {
            // Clone attacker for the turn record
            attacker: this.cloneMonster(attacker),
            // Clone defender for the turn record
            defender: this.cloneMonster(defender),
            damage,
            defenderHpAfter: defender.hp
        };
    }

    // Run the complete battle
    static simulate(originalMonster1: Monster, originalMonster2: Monster): BattleResult {
        // Clone both monsters for simulation
        const monster1 = this.cloneMonster(originalMonster1);
        const monster2 = this.cloneMonster(originalMonster2);
        // Initialize turns array
        const turns: BattleTurn[] = [];

        // Determine who attacks first
        const { first: firstAttacker, second: secondAttacker } = TurnOrderStrategy.determineFirstAttacker(monster1, monster2);

        // Set initial attacker and defender
        let currentAttacker = firstAttacker;
        let currentDefender = secondAttacker;

        // Battle loop until one monster dies
        while (monster1.hp > 0 && monster2.hp > 0) {
            // Calculate damage for this attack
            const damage = DamageCalculator.calculate(currentAttacker.attack, currentDefender.defense);
            // Apply damage to defender
            this.applyDamage(currentDefender, damage);

            // Record this turn
            turns.push(this.createTurn(currentAttacker, currentDefender, damage));

            // Check if defender is dead
            if (currentDefender.hp <= 0) break;

            // Switch attacker/defender roles
            [currentAttacker, currentDefender] = [currentDefender, currentAttacker];
        }

        // Determine winner based on who has HP left
        const winner = monster1.hp > 0 ? originalMonster1 : originalMonster2;
        return { winner, turns };
    }
}

// Service class for monster operations
class MonsterService {
    // Get one monster from database
    static async findById(id: number): Promise<Monster | undefined> {
        return await Monster.query().findById(id);
    }

    // Get two monsters in parallel using Promise.all
    static async findBothById(id1: number, id2: number): Promise<[Monster | undefined, Monster | undefined]> {
        const [monster1, monster2] = await Promise.all([
            this.findById(id1),
            this.findById(id2)
        ]);
        return [monster1, monster2];
    }
}

// Service class for battle operations
class BattleService {
    // Save battle result to database
    static async createBattle(monster1Id: number, monster2Id: number, winnerId: number): Promise<Battle> {
        return await Battle.query().insert({
            monsterA: monster1Id,
            monsterB: monster2Id,
            winner: winnerId
        });
    }

    // Orchestrate the entire battle process
    static async executeBattle(monster1Id: number, monster2Id: number): Promise<BattleResponse> {
        // Get both monsters from database
        const [monster1, monster2] = await MonsterService.findBothById(monster1Id, monster2Id);

        // Validate monsters exist
        const monsterValidation = BattleValidator.validateMonsters(monster1, monster2);
        if (!monsterValidation.isValid) {
            throw new Error(monsterValidation.error);
        }

        // Run battle simulation
        const battleResult = BattleSimulator.simulate(monster1!, monster2!);
        // Save battle to database
        const battle = await this.createBattle(monster1Id, monster2Id, battleResult.winner.id as number);

        // Return complete battle response
        return {
            id: battle.id as number,
            monsterA: monster1!,
            monsterB: monster2!,
            winner: battleResult.winner,
            turns: battleResult.turns
        };
    }
}

// Main controller function
const create = async (req: Request, res: Response): Promise<Response> => {
    // Validate request data and return error if invalid
    const validation = BattleValidator.validateRequest(req.body);
    if (!validation.isValid) {
        return ResponseHandler.error(res, validation.error!, StatusCodes.BAD_REQUEST);
    }

    // Execute battle and handle any errors
    try {
        // Extract monster IDs from request
        const { monster1Id, monster2Id }: BattleRequest = req.body;
        // Execute the battle
        const battleResponse = await BattleService.executeBattle(monster1Id, monster2Id);

        // Return success response
        return ResponseHandler.success(res, battleResponse, StatusCodes.CREATED);
    } catch (error) {
        // Handle errors with appropriate status codes
        const message = error instanceof Error ? error.message : 'Failed to create battle';
        const statusCode = message.includes('not found') ? StatusCodes.NOT_FOUND : StatusCodes.INTERNAL_SERVER_ERROR;

        return ResponseHandler.error(res, message, statusCode);
    }
};

// Export the controller object with create function
export const BattleExtendedController = {
    create,
};
```

### 4. Battle Endpoint Response

The battle endpoint takes two monster IDs and returns this response:

```json
{
    "id": "battle_id",
    "monsterA": {...},
    "monsterB": {...},
    "winner": {...},
    "turns": [...]
}
```

**Validation checks we perform:**

Before starting any battle, we validate the input:

1. **Check both monster IDs are provided**
   - We return 400 error if missing
   - A battle needs exactly two monsters

2. **Check monsters exist in database**
   - We return 404 error if not found
   - Both monsters must be valid

3. **Check monsters are different**
   - We return 400 error if same ID
   - A monster cannot fight itself

4. **Error responses:**
   - 400 for bad request data
   - 404 for monsters not found
   - 500 for server errors

### 5. Database Models Implementation

First, let's implement the Monster model:

**File:** `api/src/models/monster.extended.model.ts`

```typescript
// Import Objection.js types for model definition
import { Id, RelationMappings } from 'objection';
// Import base model class with common functionality
import Base from './base';
// Import Battle model for relationships
import { Battle } from './battle.extended.model';

// Define Monster class extending base model
export class Monster extends Base {
  // Primary key field (auto-generated)
  id!: Id;
  // Monster name field (required string)
  name!: string;
  // Attack power for damage calculation (required number)
  attack!: number;
  // Defense power to reduce incoming damage (required number)
  defense!: number;
  // Health points - when this reaches 0, monster dies (required number)
  hp!: number;
  // Speed determines turn order in battle (required number)
  speed!: number;
  // URL for monster image display (required string)
  imageUrl!: string;
  // Optional array of battles this monster participated in
  battles?: Battle[];

  // Define which database table this model maps to
  static tableName = 'monster';

  // Define relationships with other models (empty for now)
  static get relationMappings(): RelationMappings {
    return {};
  }
}
```

Now the Battle model:

**File:** `api/src/models/battle.extended.model.ts`

```typescript
// Import Objection.js types for model definition
import { Id, RelationMappings } from 'objection';
// Import base model class with common functionality
import Base from './base';
// Import Monster model for relationships
import { Monster } from './monster.extended.model';

// Define Battle class extending base model
export class Battle extends Base {
  // Primary key field (auto-generated)
  id!: Id;
  // First monster ID (stores number, not Monster object)
  monsterA!: number;
  // Second monster ID (stores number, not Monster object)
  monsterB!: number;
  // Winner monster ID (stores number, not Monster object)
  winner!: number;

  // Define which database table this model maps to
  static tableName = 'battle';

  // Define relationships to load monster data when needed
  static get relationMappings(): RelationMappings {
    return {
      // Relationship to load monster A data from monsterA ID
      monsterAData: {
        // Define as belongs-to-one relationship
        relation: Base.BelongsToOneRelation,
        // Use Monster model class
        modelClass: Monster,
        // Join configuration
        join: {
          // From battle.monsterA field
          from: 'battle.monsterA',
          // To monster.id field
          to: 'monster.id'
        }
      },
      // Relationship to load monster B data from monsterB ID
      monsterBData: {
        // Define as belongs-to-one relationship
        relation: Base.BelongsToOneRelation,
        // Use Monster model class
        modelClass: Monster,
        // Join configuration
        join: {
          // From battle.monsterB field
          from: 'battle.monsterB',
          // To monster.id field
          to: 'monster.id'
        }
      },
      // Relationship to load winner data from winner ID
      winnerData: {
        // Define as belongs-to-one relationship
        relation: Base.BelongsToOneRelation,
        // Use Monster model class
        modelClass: Monster,
        // Join configuration
        join: {
          // From battle.winner field
          from: 'battle.winner',
          // To monster.id field
          to: 'monster.id'
        }
      }
    };
  }
}
```

### 6. Database Migration Fix

**File:** `api/knex/migrations/20220901222137_extended_alter_table.ts`

We find a problem. The Monster model expects a `name` field, but the database migration does not create it.

Here is what we're implementing to fix this:

```typescript
// Function to run when migrating database forward
export async function up(knex: Knex): Promise<void> {
  // Modify the existing monster table structure
  await knex.schema.alterTable('monster', (table) => {
    // Add name column as required string field
    table.string('name').notNullable();
  });
}

// Function to run when rolling back this migration
export async function down(knex: Knex): Promise<void> {
  // Modify the monster table to remove changes
  await knex.schema.alterTable('monster', (table) => {
    // Remove the name column we added
    table.dropColumn('name');
  });
}
```

This migration adds the missing name field so monsters can have proper names instead of just IDs.

### 7. Implementing TODO Tests - Complete Implementation

**File:** `api/src/controllers/__tests__/battle.extended.spec.ts`

We find 4 tests marked with TODO. Here is the complete test implementation:

```typescript
// Import the Express app for testing
import app from '../../app';
// Import supertest for HTTP endpoint testing
import request from 'supertest';
// Import HTTP status codes for consistent validation
import { StatusCodes } from 'http-status-codes';
// Import factories for creating test data objects
import factories from '../../factories';
// Import Monster model for database operations
import { Monster } from '../../models';

// Start test server instance
const server = app.listen();

// Close server after all tests complete
afterAll(() => server.close());

// Test suite for BattleExtendedController
describe('BattleExtendedController', () => {

    // Test group for battle functionality
    describe('Battle', () => {
        // Test validation when monster IDs are missing
        test('should fail when trying a battle of monsters with an undefined monster', async () => {
            // Send POST request to /battles with empty body
            const response = await request(server)
                .post('/battles')
                .send({});

            // Expect 400 Bad Request status code
            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            // Expect specific error message about missing IDs
            expect(response.body.error).toBe('Both monster1Id and monster2Id are required');
        });

        // Test validation when monsters don't exist in database
        test('should fail when trying a battle of monsters with an inexistent monster', async () => {
            // Send POST request with non-existent monster IDs
            const response = await request(server)
                .post('/battles')
                .send({
                    // Use high numbers that won't exist in test database
                    monster1Id: 999,
                    monster2Id: 998
                });

            // Expect 404 Not Found status code
            expect(response.status).toBe(StatusCodes.NOT_FOUND);
            // Expect specific error message about monsters not found
            expect(response.body.error).toBe('One or both monsters not found');
        });

        // Test successful battle where monster 1 should win
        test('should insert a battle of monsters successfully with monster 1 winning', async () => {
            // Create strong monster data (guaranteed to win)
            const monster1Data = factories.monster.build({
                name: 'Strong Monster',
                attack: 100,     // High attack
                defense: 50,     // Good defense
                hp: 200,         // High HP
                speed: 80        // High speed (attacks first)
            });
            // Create weak monster data (guaranteed to lose)
            const monster2Data = factories.monster.build({
                name: 'Weak Monster',
                attack: 40,      // Low attack
                defense: 20,     // Low defense
                hp: 100,         // Low HP
                speed: 60        // Lower speed
            });

            // Insert first monster into database
            const monster1 = await Monster.query().insert(monster1Data);
            // Insert second monster into database
            const monster2 = await Monster.query().insert(monster2Data);

            // Send battle request with both monster IDs
            const response = await request(server)
                .post('/battles')
                .send({
                    monster1Id: monster1.id,
                    monster2Id: monster2.id
                });

            // Expect 201 Created status for successful battle
            expect(response.status).toBe(StatusCodes.CREATED);
            // Expect monster 1 to be the winner (stronger stats)
            expect(response.body.winner.id).toBe(monster1.id);
            // Expect monsterA to be first monster
            expect(response.body.monsterA.id).toBe(monster1.id);
            // Expect monsterB to be second monster
            expect(response.body.monsterB.id).toBe(monster2.id);
            // Expect turns array to be present
            expect(response.body.turns).toBeDefined();
            // Expect turns to be a valid array
            expect(Array.isArray(response.body.turns)).toBe(true);
        });

        // Test successful battle where monster 2 should win
        test('should insert a battle of monsters successfully with monster 2 winning', async () => {
            // Create weak monster data (will lose)
            const monster1Data = factories.monster.build({
                name: 'Weak Monster',
                attack: 30,      // Very low attack
                defense: 10,     // Very low defense
                hp: 80,          // Low HP
                speed: 50        // Low speed
            });
            // Create strong monster data (will win)
            const monster2Data = factories.monster.build({
                name: 'Strong Monster',
                attack: 90,      // High attack
                defense: 40,     // Good defense
                hp: 180,         // High HP
                speed: 70        // Higher speed (attacks first)
            });

            // Insert first monster into database
            const monster1 = await Monster.query().insert(monster1Data);
            // Insert second monster into database
            const monster2 = await Monster.query().insert(monster2Data);

            // Send battle request with both monster IDs
            const response = await request(server)
                .post('/battles')
                .send({
                    monster1Id: monster1.id,
                    monster2Id: monster2.id
                });

            // Expect 201 Created status for successful battle
            expect(response.status).toBe(StatusCodes.CREATED);
            // Expect monster 2 to be the winner (stronger stats)
            expect(response.body.winner.id).toBe(monster2.id);
            // Expect monsterA to be first monster
            expect(response.body.monsterA.id).toBe(monster1.id);
            // Expect monsterB to be second monster
            expect(response.body.monsterB.id).toBe(monster2.id);
            // Expect turns array to be present
            expect(response.body.turns).toBeDefined();
            // Expect turns to be a valid array
            expect(Array.isArray(response.body.turns)).toBe(true);
        });
    });
});
```

### 8. Test Data Design Strategy

We design monster stats to get predictable results:

**Strong Monster Stats:**
- Attack: 100, Defense: 50, HP: 200, Speed: 80
- This monster will always win against weak monsters

**Weak Monster Stats:**
- Attack: 40, Defense: 20, HP: 100, Speed: 60
- This monster will always lose against strong monsters

**Why these numbers work:**
- Strong monster goes first (higher speed)
- Strong monster does significant damage (100-20 = 80 damage vs 100 HP)
- Weak monster does minimal damage (40-50 = 1 minimum damage vs 200 HP)
- Battle outcome is always predictable for testing

### 8. Error Handling Strategy

We implement comprehensive error handling:

- **HTTP status codes:**
  - 200 for success
  - 400 for bad request data
  - 404 for not found
  - 500 for server errors

- **Clear error messages:** Each error tells exactly what goes wrong
- **Try/catch blocks:** Prevent crashes from unexpected errors

### Implementation Summary

Here is what we complete:

✅ **GET /monsters endpoint** - Returns list of all monsters
✅ **POST /battles endpoint** - Creates battle between two monsters  
✅ **Battle algorithm** - Follows all specified rules exactly
✅ **TODO tests** - Implement all 4 missing tests
✅ **Database migration** - Add missing name field
✅ **Error handling** - Proper validation and error responses
✅ **Clean code** - TypeScript types, separated concerns

The API now works according to all requirements. You can list monsters and create battles between them. The battle algorithm follows the exact specifications and we have tests to verify everything works correctly.

### 9. TypeScript Type Corrections

**Problem:** The Battle model has incorrect types.

The model defines fields as `Monster` objects, but the database stores numbers (IDs).

**Before (incorrect):**
```typescript
export class Battle extends Base {
  monsterA!: Monster;  // ❌ Database stores number
  monsterB!: Monster;  // ❌ Database stores number  
  winner!: Monster;    // ❌ Database stores number
}
```

**What we're fixing:**
```typescript
export class Battle extends Base {
  monsterA!: number;   // ✅ Matches database
  monsterB!: number;   // ✅ Matches database
  winner!: number;     // ✅ Matches database
}
```

**Why this matters:**
- TypeScript can catch bugs at compile time
- Code is self-documenting
- IDE provides better autocomplete
- Prevents runtime type errors

The linter now passes without warnings.

### 10. Code Quality Improvements

We refactor the code to use better patterns and practices.

#### Design Patterns We Use:

**1. Strategy Pattern (TurnOrderStrategy):**
```typescript
class TurnOrderStrategy {
    static determineFirstAttacker(monster1: Monster, monster2: Monster) {
        // Logic for who attacks first
    }
}
```
This makes it easy to change battle rules later.

**2. Service Layer (BattleService, MonsterService):**
```typescript
class BattleService {
    static async executeBattle(monster1Id: number, monster2Id: number) {
        // Business logic here
    }
}
```
Controllers handle HTTP only. Services handle business logic.

**3. Validator Pattern (BattleValidator):**
```typescript
class BattleValidator {
    static validateRequest(body: unknown) {
        // All validation logic here
    }
}
```
All validation rules in one place.

#### Clean Code Principles We Apply:

**1. Single Responsibility:**
- Each class has one job
- `DamageCalculator` only calculates damage
- `ResponseHandler` only formats responses

**2. Early Return Pattern:**
```typescript
// Instead of nested if/else
if (!validation.isValid) {
    return ResponseHandler.error(res, validation.error!);
}
// Main logic here
```

**3. No Code Duplication:**
- We use reusable functions for common operations
- Consistent response formatting

**4. Strong Typing:**
- No `any` types
- Clear interfaces for all data structures

#### Why These Changes Matter:

- **Maintainability:** Easy to modify and extend
- **Testability:** Each class can be tested independently  
- **Readability:** Code explains itself
- **Performance:** Optimized operations (Promise.all, Math.max)

This code is production-ready and follows industry best practices.
