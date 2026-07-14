/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * assets/js/auth.js
 * ============================================================
 * Enterprise Authentication Manager
 * ES2023
 * ES Modules
 * Production Ready
 * ============================================================
 */

"use strict";

import APP_CONFIG from "./config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    APP_CONFIG.SUPABASE.URL,
    APP_CONFIG.SUPABASE.ANON_KEY
);

const AuthManager = {

    supabase,

    /**
     * ============================================================
     * LOGIN
     * ============================================================
     */

    async login(identifier, password) {

        try {

            let email = identifier.trim();

            /* ---------------------------------------------
               Username -> Email
            ---------------------------------------------- */

            if (!email.includes("@")) {

                const {

                    data: profile,

                    error

                } = await supabase

                    .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

                    .select("email")

                    .eq("username", email)

                    .eq("actif", true)

                    .maybeSingle();

                if (error || !profile || !profile.email) {

                    return {

                        success: false,

                        message: "invalidCredentials"

                    };

                }

                email = profile.email;

            }

            /* ---------------------------------------------
               Supabase Login
            ---------------------------------------------- */

            const {

                data,

                error

            } = await supabase.auth.signInWithPassword({

                email,

                password

            });

            if (error || !data.user) {

                return {

                    success: false,

                    message: "invalidCredentials"

                };

            }

            /* ---------------------------------------------
               Load Profile
            ---------------------------------------------- */

            const {

                data: profile,

                error: profileError

            } = await supabase

                .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

                .select(`
                    *,
                    roles(
                        id,
                        code,
                        nom,
                        description
                    )
                `)

                .eq("id", data.user.id)

                .single();

            if (profileError || !profile) {

                await supabase.auth.signOut();

                return {

                    success: false,

                    message: "profileNotFound"

                };

            }

            /* ---------------------------------------------
               Disabled Account
            ---------------------------------------------- */

            if (!profile.actif) {

                await supabase.auth.signOut();

                return {

                    success: false,

                    message: "accountDisabled"

                };

            }

            /* ---------------------------------------------
               Update Last Login
            ---------------------------------------------- */

            await supabase

                .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

                .update({

                    dernier_login: new Date().toISOString()

                })

                .eq("id", profile.id);

            return {

                success: true,

                profile

            };

        }

        catch (error) {

            console.error("Login Error:", error);

            return {

                success: false,

                message: "networkError"

            };

        }

    },

    /**
     * ============================================================
     * LOGOUT
     * ============================================================
     */

    async logout() {

        await supabase.auth.signOut();

    },

    /**
     * ============================================================
     * CURRENT USER
     * ============================================================
     */

    async getUser() {

        const {

            data,

            error

        } = await supabase.auth.getUser();

        if (error) {

            return null;

        }

        return data.user;

    },

    /**
     * ============================================================
     * SESSION
     * ============================================================
     */

    async getSession() {

        const {

            data,

            error

        } = await supabase.auth.getSession();

        if (error) {

            return null;

        }

        return data.session;

    },

    /**
     * ============================================================
     * PROFILE
     * ============================================================
     */

    async getProfile() {

        const user = await this.getUser();

        if (!user) {

            return null;

        }

        const {

            data,

            error

        } = await supabase

            .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

            .select(`
                *,
                roles(
                    id,
                    code,
                    nom,
                    description
                )
            `)

            .eq("id", user.id)

            .single();

        if (error) {

            return null;

        }

        return data;

    },

    /**
     * ============================================================
     * REFRESH SESSION
     * ============================================================
     */

    async refreshSession() {

        return await supabase.auth.refreshSession();

    },

    /**
     * ============================================================
     * RESET PASSWORD
     * ============================================================
     */

    async resetPassword(email) {

        return await supabase.auth.resetPasswordForEmail(

            email,

            {

                redirectTo: window.location.origin

            }

        );

    },

    /**
     * ============================================================
     * IS AUTHENTICATED
     * ============================================================
     */

    async isAuthenticated() {

        const session = await this.getSession();

        return !!session;

    },

    /**
     * ============================================================
     * AUTH STATE
     * ============================================================
     */

    onAuthStateChange(callback) {

        return supabase.auth.onAuthStateChange(callback);

    }

};

export { supabase };

export default AuthManager;