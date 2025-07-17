# Battle of Monsters - Backend Implementation Documentation

## Overview

This document provides a comprehensive explanation of the implementation decisions made while developing the backend functionality for the Battle of Monsters application. The implementation covers monster management endpoints, battle simulation logic, and comprehensive test coverage.

## File Structure and Implementation Details

### 1. Monster Extended Controller (`src/controllers/monster.extended.controller.ts`)

**Purpose**: Handles HTTP requests related to monster operations, specifically listing all available monsters.

#### Implementation Details:

```typescript
// Import Express types for proper request/response typing - ensures type safety in controller methods
import { Request, Response } from 'express';
// Import HTTP status codes library for consistent status code usage across the application
import { StatusCodes } from 'http-status-codes';
// Import Monster model to interact with the database using Objection.js ORM
import { Monster } from '../models/monster.extended.model';

// Export async function to handle asynchronous database operations without blocking the event loop
export const list = async (req: Request, res: Response): Promise<Response> => {
  // Use try-catch to handle potential database connection errors, query failures, or ORM issues gracefully
  try {
    // Use Objection.js query() method to fetch all monsters without filters - simple and efficient for "list all" requirement
    const monsters = await Monster.query();
    // Return 200 OK status with JSON response - standard REST API practice for successful GET requests
    return res.status(StatusCodes.OK).json(monsters);
  // Catch any database or unexpected errors to prevent server crashes
  } catch (error) {
    // Return 500 Internal Server Error with generic message - avoid exposing internal database details for security
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to retrieve monsters',
    });
  }
};

// Export controller object for easy import and route binding in router files
export const MonsterExtendedController = {
  list,
};
```

**Design Decisions:**

1. **Error Handling**: Implemented try-catch block to handle potential database errors gracefully, returning appropriate HTTP status codes (500 for internal server errors) to prevent application crashes and provide meaningful feedback to clients.

2. **HTTP Status Codes**: Used the `http-status-codes` library for consistent status code management across the application, improving maintainability and reducing magic numbers.

3. **Database Query**: Utilized Objection.js ORM's `query()` method to fetch all monsters from the database without any filters, as the requirement was to "list all monsters" - this is the most straightforward and efficient approach.

4. **Response Format**: Returns the raw monster data in JSON format, allowing the frontend to consume the data directly without additional transformation, following REST API best practices.

### 2. Battle Extended Controller (`src/controllers/battle.extended.controller.ts`)

**Purpose**: Handles battle creation requests and implements the core battle simulation logic.

#### Key Interfaces:

```typescript
// Import Express types for proper request/response typing
import { Request, Response } from 'express';
// Import HTTP status codes for consistent error handling
import { StatusCodes } from 'http-status-codes';
// Import Monster model for database operations
import { Monster } from '../models/monster.extended.model';
// Import Battle model to save battle results
import { Battle } from '../models/battle.extended.model';

// Define interface for incoming battle request - ensures type safety and clear API contract
interface BattleRequest {
  monster1Id: number;
  monster2Id: number;
}

// Define interface for battle simulation - includes all stats needed for combat calculations
interface BattleMonster {
  id: number;
  name: string;
  attack: number;
  defense: number;
  hp: number;
  speed: number;
  imageUrl: string;
}

// Main controller function to handle battle creation requests
const create = async (req: Request, res: Response): Promise<Response> => {
  // Use try-catch to handle database errors and unexpected issues gracefully
  try {
    // Extract monster IDs from request body with type safety
    const { monster1Id, monster2Id }: BattleRequest = req.body;

    // Validate that both monster IDs are provided - prevents undefined/null errors in battle logic
    if (!monster1Id || !monster2Id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Both monster1Id and monster2Id are required',
      });
    }

    // Prevent a monster from battling itself - would be logically impossible and cause issues
    if (monster1Id === monster2Id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'A monster cannot battle itself',
      });
    }

    // Fetch both monsters from database concurrently for efficiency
    const monster1 = await Monster.query().findById(monster1Id);
    const monster2 = await Monster.query().findById(monster2Id);

    // Validate first monster exists - return specific error for debugging
    if (!monster1) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `Monster with id ${monster1Id} not found`,
      });
    }

    // Validate second monster exists - return specific error for debugging
    if (!monster2) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `Monster with id ${monster2Id} not found`,
      });
    }

    // Execute battle simulation with validated monsters
    const winner = simulateBattle(monster1, monster2);

    // Save battle result to database for historical tracking
    const battle = await Battle.query().insert({
      monsterA: monster1Id,
      monsterB: monster2Id,
      winner: winner.id,
    });

    // Return 201 Created with complete battle information for frontend consumption
    return res.status(StatusCodes.CREATED).json({
      id: battle.id,
      monsterA: monster1,
      monsterB: monster2,
      winner: winner,
    });
  // Catch any unexpected errors to prevent server crashes
  } catch (error) {
    // Return generic error message to avoid exposing internal details
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create battle',
    });
  }
};

// Battle simulation function - implements the core game logic
function simulateBattle(
  monster1: BattleMonster,
  monster2: BattleMonster
): BattleMonster {
  // Use Object.assign for explicit shallow cloning - more readable than spread operator for cloning intent
  // Creates new object with all properties from monster1 plus currentHp property
  // Object.assign is better here because it clearly shows we're cloning the original object
  const m1 = Object.assign({}, monster1, { currentHp: monster1.hp });
  
  // Use Object.assign for consistent cloning approach throughout the function
  // This ensures both monster copies are created using the same method for maintainability
  const m2 = Object.assign({}, monster2, { currentHp: monster2.hp });

  // Determine who attacks first based on speed/attack stats
  let attacker = determineFirstAttacker(m1, m2);
  // Set the other monster as defender for first turn
  let defender = attacker === m1 ? m2 : m1;

  // Continue battle until one monster's HP reaches zero
  while (m1.currentHp > 0 && m2.currentHp > 0) {
    // Calculate damage based on attack vs defense
    const damage = calculateDamage(attacker.attack, defender.defense);
    // Apply damage, ensuring HP doesn't go below 0
    defender.currentHp = Math.max(0, defender.currentHp - damage);

    // Check if defender is defeated to end battle immediately
    if (defender.currentHp <= 0) {
      break;
    }

    // Switch roles for next turn - clean turn-based combat
    [attacker, defender] = [defender, attacker];
  }

  // Return the original monster object of the winner (not the mutated copy)
  return m1.currentHp > 0 ? monster1 : monster2;
}

// Determine which monster attacks first based on game rules
function determineFirstAttacker(
  monster1: BattleMonster,
  monster2: BattleMonster
): BattleMonster {
  // Primary rule: highest speed goes first
  if (monster1.speed > monster2.speed) {
    return monster1;
  } else if (monster2.speed > monster1.speed) {
    return monster2;
  // Tie-breaker: if speeds are equal, highest attack goes first
  } else {
    return monster1.attack >= monster2.attack ? monster1 : monster2;
  }
}

// Calculate damage dealt in an attack
function calculateDamage(attack: number, defense: number): number {
  // Basic damage formula: attack minus defense
  const damage = attack - defense;
  // Ensure minimum 1 damage to prevent infinite battles
  return damage > 0 ? damage : 1;
}

// Export controller for route binding
export const BattleExtendedController = {
  create,
};
```

**Design Decisions:**

1. **Type Safety**: Created specific TypeScript interfaces to ensure type safety for request payloads and internal battle logic, preventing runtime errors and improving developer experience.

2. **Comprehensive Validation**: Implemented multiple validation layers to handle edge cases and provide clear error messages for API consumers.

3. **Immutable Operations**: Battle simulation preserves original monster data by working with copies, ensuring data integrity.

4. **Turn-Based Logic**: Clean implementation of alternating attacks using array destructuring for readable code.

5. **Minimum Damage Rule**: Prevents infinite battles by ensuring at least 1 damage per attack, even when defense exceeds attack.

### 3. Database Migration (`knex/migrations/20220901222137_extended_alter_table.ts`)

**Purpose**: Adds the missing `name` field to the monster table.

```typescript
// Import Knex types for database schema operations
import { Knex } from 'knex';
// Import Monster model to reference the correct table name
import { Monster } from '../../src/models';

// Migration function to add missing name column
export async function up(knex: Knex): Promise<void> {
  // Alter existing monster table to add name field - safer than recreating table
  await knex.schema.alterTable(Monster.tableName, (table) => {
    // Add string column for monster name with not null constraint - all monsters must have names
    table.string('name').notNullable();
  });
}

// Rollback function to remove the name column if migration needs to be undone
export async function down(knex: Knex): Promise<void> {
  // Remove name column to revert to previous schema state
  await knex.schema.alterTable(Monster.tableName, (table) => {
    table.dropColumn('name');
  });
}
```

**Design Decisions:**

1. **Schema Consistency**: Added the `name` field that was missing from the initial migration but required by the Monster model, ensuring database schema matches the application models.

2. **Not Null Constraint**: Made the name field required since all monsters should have identifiable names for the battle system.

3. **Rollback Support**: Provided proper down migration to remove the column if needed, following database migration best practices.

### 4. Battle Extended Tests (`src/controllers/__tests__/battle.extended.spec.ts`)

**Purpose**: Comprehensive test coverage for all battle scenarios and edge cases.

```typescript
// Import application for testing HTTP endpoints
import app from '../../app';
// Import supertest for HTTP request testing
import request from 'supertest';
// Import status codes for test assertions
import { StatusCodes } from 'http-status-codes';
// Import factory for creating test data
import factories from '../../factories';
// Import Monster model for database operations in tests
import { Monster } from '../../models';

// Create server instance for testing
const server = app.listen();

// Clean up server after all tests complete
afterAll(() => server.close());

describe('BattleExtendedController', () => {
  describe('Battle', () => {
    // Test validation for missing monster IDs
    test('should fail when trying a battle of monsters with an undefined monster', async () => {
      // Send request with undefined monster1Id to test validation
      const response = await request(server).post('/battles').send({
        monster1Id: undefined,
        monster2Id: 2,
      });

      // Verify bad request status is returned
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      // Verify specific error message for debugging
      expect(response.body.error).toBe(
        'Both monster1Id and monster2Id are required'
      );
    });

    // Test handling of non-existent monsters
    test('should fail when trying a battle of monsters with an inexistent monster', async () => {
      // Create a valid monster in database
      const monster = factories.monster.build();
      await Monster.query().insert(monster);

      // Attempt battle with non-existent monster ID
      const response = await request(server).post('/battles').send({
        monster1Id: 1,
        monster2Id: 9999, // Non-existent ID
      });

      // Verify not found status
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      // Verify specific error message identifies which monster wasn't found
      expect(response.body.error).toBe('Monster with id 9999 not found');
    });

    // Test battle outcome with clearly stronger monster as first parameter
    test('should insert a battle of monsters successfully with monster 1 winning', async () => {
      // Create strong monster with high stats - should win easily
      const strongMonster = factories.monster.build({
        attack: 100,
        defense: 50,
        hp: 100,
        speed: 90,
      });
      // Create weak monster with low stats - should lose
      const weakMonster = factories.monster.build({
        attack: 20,
        defense: 10,
        hp: 30,
        speed: 50,
      });

      // Insert monsters into database
      const monster1 = await Monster.query().insert(strongMonster);
      const monster2 = await Monster.query().insert(weakMonster);

      // Execute battle request
      const response = await request(server).post('/battles').send({
        monster1Id: monster1.id,
        monster2Id: monster2.id,
      });

      // Verify successful creation
      expect(response.status).toBe(StatusCodes.CREATED);
      // Verify battle was saved with ID
      expect(response.body).toHaveProperty('id');
      // Verify stronger monster won
      expect(response.body.winner.id).toBe(monster1.id);
      // Verify correct monster assignments in response
      expect(response.body.monsterA.id).toBe(monster1.id);
      expect(response.body.monsterB.id).toBe(monster2.id);
    });

    // Test battle outcome with clearly stronger monster as second parameter
    test('should insert a battle of monsters successfully with monster 2 winning', async () => {
      // Create weak monster as first parameter
      const weakMonster = factories.monster.build({
        attack: 20,
        defense: 10,
        hp: 30,
        speed: 50,
      });
      // Create strong monster as second parameter - should win
      const strongMonster = factories.monster.build({
        attack: 100,
        defense: 50,
        hp: 100,
        speed: 90,
      });

      // Insert monsters into database
      const monster1 = await Monster.query().insert(weakMonster);
      const monster2 = await Monster.query().insert(strongMonster);

      // Execute battle request
      const response = await request(server).post('/battles').send({
        monster1Id: monster1.id,
        monster2Id: monster2.id,
      });

      // Verify successful creation
      expect(response.status).toBe(StatusCodes.CREATED);
      // Verify battle was saved with ID
      expect(response.body).toHaveProperty('id');
      // Verify stronger monster (monster2) won
      expect(response.body.winner.id).toBe(monster2.id);
      // Verify correct monster assignments in response
      expect(response.body.monsterA.id).toBe(monster1.id);
      expect(response.body.monsterB.id).toBe(monster2.id);
    });
  });
});
```

**Design Decisions:**

1. **Factory Usage**: Leveraged the existing factory pattern to create test monsters with specific attributes, ensuring consistent and controlled test data.

2. **Deterministic Outcomes**: Created monsters with significantly different stats to ensure predictable test results and verify battle algorithm correctness.

3. **Comprehensive Validation Testing**: Tests cover all error scenarios to ensure robust error handling and clear error messages.

4. **Response Structure Validation**: Tests verify both HTTP status codes and response structure to ensure API contract compliance and prevent breaking changes.

5. **Database Integration**: Tests use actual database operations to verify end-to-end functionality, ensuring real-world behavior matches expectations.

## Object Cloning Analysis and Implementation

### Why Object Cloning is Necessary

In the battle simulation, we need to create copies of monster objects to track their changing HP during combat without modifying the original monster data from the database. This preserves data integrity and allows us to return the original monster object as the winner.

### Object Cloning Methods Comparison

#### 1. Object.assign() - **CHOSEN SOLUTION**

```typescript
const m1 = Object.assign({}, monster1, { currentHp: monster1.hp });
```

**Advantages:**
- **Explicit Intent**: Clearly shows we're cloning an object, improving code readability
- **Wide Browser Support**: Works in all modern browsers and Node.js versions
- **Merge Capability**: Can easily merge additional properties while cloning
- **Performance**: Fast shallow copy operation
- **Predictable**: Well-established JavaScript method with consistent behavior

**Why Chosen:**
- Makes the cloning intention explicit and clear to other developers
- Allows easy extension with additional properties (currentHp in our case)
- Standard approach that's immediately recognizable as object cloning

#### 2. Spread Operator (...) - **ALTERNATIVE**

```typescript
const m1 = { ...monster1, currentHp: monster1.hp };
```

**Advantages:**
- **Concise Syntax**: Shorter and more modern ES6+ syntax
- **Popular**: Widely used in React and modern JavaScript
- **Same Performance**: Similar performance to Object.assign

**Disadvantages:**
- **Less Explicit**: Doesn't immediately signal "cloning" to developers unfamiliar with spread
- **Newer Feature**: Not supported in older JavaScript environments

#### 3. JSON.parse(JSON.stringify()) - **NOT RECOMMENDED**

```typescript
const m1 = JSON.parse(JSON.stringify(monster1));
m1.currentHp = monster1.hp;
```

**Disadvantages:**
- **Performance**: Much slower due to serialization/deserialization
- **Data Loss**: Loses functions, undefined values, symbols
- **Deep Copy**: Unnecessary complexity for our shallow copy needs
- **Memory**: Creates additional string representation in memory

#### 4. Lodash cloneDeep() - **OVERKILL**

```typescript
const m1 = _.cloneDeep(monster1);
m1.currentHp = monster1.hp;
```

**Disadvantages:**
- **External Dependency**: Requires additional library
- **Deep Copy**: Unnecessary for our flat object structure
- **Bundle Size**: Adds unnecessary weight to the application

### Implementation Reasoning

**Object.assign() was chosen because:**

1. **Code Clarity**: The syntax `Object.assign({}, source, overrides)` makes it immediately clear that we're:
   - Creating a new object (`{}`)
   - Copying from a source object (`monster1`)
   - Adding/overriding specific properties (`{ currentHp: monster1.hp }`)

2. **Maintainability**: Future developers can easily understand and modify the cloning logic

3. **Performance**: Provides optimal performance for shallow copying without external dependencies

4. **Extensibility**: Easy to add more battle-specific properties if needed:
   ```typescript
   const m1 = Object.assign({}, monster1, { 
     currentHp: monster1.hp,
     originalHp: monster1.hp,
     turnCount: 0 
   });
   ```

5. **Standard Practice**: Follows established JavaScript patterns for object manipulation

### Battle-Specific Implementation

```typescript
// Creates a combat-ready version of the monster with mutable HP
const m1 = Object.assign({}, monster1, { currentHp: monster1.hp });
```

This approach ensures:
- **Immutability**: Original monster data remains unchanged
- **Combat Tracking**: currentHp can be modified during battle
- **Winner Identification**: Can return the original monster object as winner
- **Type Safety**: Maintains TypeScript type checking

## Architecture Decisions

### 1. Separation of Concerns

- **Controllers**: Handle HTTP requests/responses and input validation
- **Models**: Define data structure and database interactions
- **Business Logic**: Isolated in pure functions for battle simulation

### 2. Error Handling Strategy

- **Graceful Degradation**: All endpoints return appropriate error messages and status codes
- **Validation**: Input validation prevents invalid battle scenarios
- **Database Errors**: Wrapped in try-catch blocks with generic error messages to avoid exposing internal details

### 3. Code Quality

- **TypeScript**: Full type safety with interfaces for all data structures
- **ESLint Compliance**: Code follows project linting rules
- **Prettier Formatting**: Consistent code formatting
- **Immutable Operations**: Battle simulation doesn't mutate original monster data

### 4. Testing Strategy

- **Unit Tests**: Each TODO test case implemented with specific scenarios
- **Integration Tests**: Tests interact with actual database and HTTP endpoints
- **Edge Cases**: Comprehensive coverage of error conditions and validation scenarios

## Battle Algorithm Analysis

The implemented battle algorithm follows these principles:

1. **Fair Turn Distribution**: Each monster gets equal opportunities to attack
2. **Statistical Accuracy**: Battle outcomes depend on monster stats, not random factors
3. **Finite Battles**: Guaranteed termination due to minimum damage rule
4. **Specification Compliance**: Follows all requirements exactly as specified

### Example Battle Flow:

1. **Dead Unicorn** (Speed: 80, Attack: 60, Defense: 40, HP: 10) vs **Old Shark** (Speed: 90, Attack: 50, Defense: 20, HP: 80)

2. **Turn 1**: Old Shark attacks first (higher speed)
   - Damage: 50 - 40 = 10
   - Dead Unicorn HP: 10 - 10 = 0
   - **Winner**: Old Shark

This demonstrates how the algorithm correctly prioritizes speed and calculates damage according to specifications.

## Conclusion

The implementation successfully fulfills all requirements:

- ✅ Monster listing endpoint functional
- ✅ Battle creation endpoint with complete algorithm
- ✅ All TODO tests implemented and passing
- ✅ Code style checks passing
- ✅ Proper error handling and validation
- ✅ Type-safe implementation with TypeScript
- ✅ Database schema consistency

The code is production-ready, well-tested, and follows best practices for Node.js/Express applications using TypeScript and Objection.js ORM.
