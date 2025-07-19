import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('monster', (table) => {
        table.string('name').notNullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('monster', (table) => {
        table.dropColumn('name');
    });
}
