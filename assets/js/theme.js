/**
 * ============================================================
 * SoufStock Enterprise ERP
 * theme.js
 * ============================================================
 */

import APP_CONFIG from "./config.js";

const ThemeManager = {

    currentTheme: APP_CONFIG.DEFAULTS.THEME,

    storageKey: APP_CONFIG.STORAGE.THEME,

    /**
     * ============================================================
     * INIT
     * ============================================================
     */

    init() {

        let theme = localStorage.getItem(this.storageKey);

        if (!theme) {

            theme = APP_CONFIG.DEFAULTS.THEME;

        }

        this.apply(theme);

    },

    /**
     * ============================================================
     * APPLY
     * ============================================================
     */

    apply(theme) {

        this.currentTheme = theme;

        if (theme === "light") {

            document.body.classList.add("light-mode");

        } else {

            document.body.classList.remove("light-mode");

        }

        localStorage.setItem(

            this.storageKey,

            theme

        );

        this.updateButton();

        window.dispatchEvent(

            new CustomEvent(

                "themechange",

                {

                    detail: {

                        theme

                    }

                }

            )

        );

    },

    /**
     * ============================================================
     * TOGGLE
     * ============================================================
     */

    toggle() {

        if (this.currentTheme === "dark") {

            this.apply("light");

        } else {

            this.apply("dark");

        }

    },

    /**
     * ============================================================
     * UPDATE BUTTON
     * ============================================================
     */

    updateButton() {

        const button = document.getElementById(

            "themeToggle"

        );

        if (!button) return;

        const icon = button.querySelector("i");

        if (!icon) return;

        icon.classList.remove(

            "fa-moon",

            "fa-sun"

        );

        if (this.currentTheme === "dark") {

            icon.classList.add("fa-sun");

        } else {

            icon.classList.add("fa-moon");

        }

    },

    /**
     * ============================================================
     * GET CURRENT
     * ============================================================
     */

    getTheme() {

        return this.currentTheme;

    },

    /**
     * ============================================================
     * SET
     * ============================================================
     */

    setTheme(theme) {

        if (

            theme !== "dark" &&

            theme !== "light"

        ) return;

        this.apply(theme);

    },

    /**
     * ============================================================
     * IS DARK
     * ============================================================
     */

    isDark() {

        return this.currentTheme === "dark";

    },

    /**
     * ============================================================
     * IS LIGHT
     * ============================================================
     */

    isLight() {

        return this.currentTheme === "light";

    }

};

export default ThemeManager;