/**
 * ============================================================
 * SoufStock Enterprise ERP
 * permissions.js
 * ============================================================
 */

import Api from "./api.js";
import Profile from "./profile.js";
import { Toast } from "./utils.js";

class PermissionsManager {

    constructor() {

        this.permissions = [];

    }

    /* ============================================================
     * LOAD
     * ============================================================ */

    async load() {

        try {

            const userId = Profile.getId();

            if (!userId) {

                throw new Error("Utilisateur introuvable.");

            }

            this.permissions = await Api.getPermissions(userId);

            return this.permissions;

        }

        catch (error) {

            console.error(error);

            Toast.error(

                "Permissions",

                error.message

            );

            this.permissions = [];

            return [];

        }

    }

    /* ============================================================
     * GET ALL
     * ============================================================ */

    getAll() {

        return this.permissions;

    }

    /* ============================================================
     * CHECK BY CODE
     * ============================================================ */

    can(code) {

        if (!code) return false;

        return this.permissions.some(

            permission => permission.code === code

        );

    }

    /* ============================================================
     * CHECK MODULE
     * ============================================================ */

    canModule(module) {

        if (!module) return false;

        return this.permissions.some(

            permission => permission.module === module

        );

    }

    /* ============================================================
     * CHECK PAGE
     * ============================================================ */

    canPage(page) {

        if (!page) return false;

        return this.permissions.some(

            permission => permission.page === page

        );

    }

    /* ============================================================
     * CHECK ACTION
     * ============================================================ */

    canAction(action) {

        if (!action) return false;

        return this.permissions.some(

            permission => permission.action === action

        );

    }

    /* ============================================================
     * FILTER HTML
     * ============================================================ */

    apply() {

        document

            .querySelectorAll("[data-permission]")

            .forEach(element => {

                const code = element.dataset.permission;

                if (!code) return;

                if (this.can(code)) {

                    element.hidden = false;

                }

                else {

                    element.hidden = true;

                }

            });

    }

    /* ============================================================
     * REMOVE HIDDEN
     * ============================================================ */

    removeHidden() {

        document

            .querySelectorAll("[data-permission]")

            .forEach(element => {

                const code = element.dataset.permission;

                if (!this.can(code)) {

                    element.remove();

                }

            });

    }

    /* ============================================================
     * REFRESH
     * ============================================================ */

    async refresh() {

        await this.load();

        this.apply();

    }

    /* ============================================================
     * DEBUG
     * ============================================================ */

    print() {

        console.table(this.permissions);

    }

    /* ============================================================
     * CLEAR
     * ============================================================ */

    clear() {

        this.permissions = [];

    }

}

const Permissions = new PermissionsManager();

export default Permissions;
