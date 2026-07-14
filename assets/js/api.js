/**
 * ============================================================
 * SoufStock Enterprise ERP
 * api.js
 * API Manager
 * ============================================================
 */

import AuthManager from "./auth.js";

class ApiManager {

    constructor() {

        this.db = AuthManager.supabase;

    }

    /* ============================================================
     * GENERIC SELECT
     * ============================================================ */

    async select(table, columns = "*", options = {}) {

        try {

            let query = this.db
                .from(table)
                .select(columns);

            // WHERE
            if (options.filters) {

                Object.entries(options.filters).forEach(([key, value]) => {

                    query = query.eq(key, value);

                });

            }

            // ORDER
            if (options.orderBy) {

                query = query.order(

                    options.orderBy,

                    {

                        ascending:

                            options.ascending ?? true

                    }

                );

            }

            // LIMIT
            if (options.limit) {

                query = query.limit(options.limit);

            }

            const {

                data,

                error

            } = await query;

            if (error) throw error;

            return data;

        }

        catch (error) {

            console.error(error);

            throw error;

        }

    }

    /* ============================================================
     * SINGLE
     * ============================================================ */

    async single(table, columns = "*", filters = {}) {

        try {

            let query = this.db

                .from(table)

                .select(columns);

            Object.entries(filters).forEach(([key, value]) => {

                query = query.eq(key, value);

            });

            const {

                data,

                error

            } = await query.single();

            if (error) throw error;

            return data;

        }

        catch (error) {

            console.error(error);

            throw error;

        }

    }

    /* ============================================================
     * INSERT
     * ============================================================ */

    async insert(table, values) {

        const {

            data,

            error

        } = await this.db

            .from(table)

            .insert(values)

            .select();

        if (error) throw error;

        return data;

    }

    /* ============================================================
     * UPDATE
     * ============================================================ */

    async update(table, values, filters) {

        let query =

            this.db

                .from(table)

                .update(values);

        Object.entries(filters).forEach(([key, value]) => {

            query = query.eq(key, value);

        });

        const {

            data,

            error

        } = await query.select();

        if (error) throw error;

        return data;

    }

    /* ============================================================
     * DELETE
     * ============================================================ */

    async delete(table, filters) {

        let query =

            this.db

                .from(table)

                .delete();

        Object.entries(filters).forEach(([key, value]) => {

            query = query.eq(key, value);

        });

        const {

            error

        } = await query;

        if (error) throw error;

        return true;

    }

    /* ============================================================
     * COUNT
     * ============================================================ */

    async count(table, filters = {}) {

        let query =

            this.db

                .from(table)

                .select("*", {

                    head: true,

                    count: "exact"

                });

        Object.entries(filters).forEach(([key, value]) => {

            query = query.eq(key, value);

        });

        const {

            count,

            error

        } = await query;

        if (error) throw error;

        return count || 0;

    }

    /* ============================================================
     * EXISTS
     * ============================================================ */

    async exists(table, filters = {}) {

        return (

            await this.count(

                table,

                filters

            )

        ) > 0;

    }

    /* ============================================================
     * PROFILE
     * ============================================================ */

    async getProfile(userId) {

        return await this.single(

            "user_profiles",

            `

                *,

                roles (

                    id,

                    nom,

                    code

                )

            `,

            {

                id: userId

            }

        );

    }

    /* ============================================================
     * USER PERMISSIONS
     * ============================================================ */

    async getPermissions(userId) {

        return await this.select(

            "v_user_permissions",

            "*",

            {

                filters: {

                    user_id: userId

                }

            }

        );

    }

    /* ============================================================
     * DASHBOARD COUNTERS
     * ============================================================ */

    async getDashboardStats() {

        const [

            stock,

            commandes,

            picking,

            expeditions

        ] = await Promise.all([

            this.count("stock"),

            this.count("commandes_excel"),

            this.count("picking"),

            this.count("expeditions")

        ]);

        return {

            stock,

            commandes,

            picking,

            expeditions

        };

    }

    /* ============================================================
     * LAST MOVEMENTS
     * ============================================================ */

    async getLastMovements(limit = 10) {

        return await this.select(

            "mouvements_stock",

            "*",

            {

                orderBy: "created_at",

                ascending: false,

                limit

            }

        );

    }

}

const Api = new ApiManager();

export default Api;