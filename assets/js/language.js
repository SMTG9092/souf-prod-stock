/**
 * ============================================================
 * SoufStock Enterprise ERP
 * language.js
 * ============================================================
 */

import APP_CONFIG from "./config.js";

const LanguageManager = {

    currentLanguage: APP_CONFIG.DEFAULTS.LANGUAGE,

    storageKey: APP_CONFIG.STORAGE.LANGUAGE,

    supported: ["fr", "en", "ar"],

    /**
     * ============================================================
     * INIT
     * ============================================================
     */

    init() {

        let lang = localStorage.getItem(this.storageKey);

        if (!lang || !this.supported.includes(lang)) {

            lang = APP_CONFIG.DEFAULTS.LANGUAGE;

        }

        this.change(lang);

    },

    /**
     * ============================================================
     * CHANGE LANGUAGE
     * ============================================================
     */

    change(lang) {

        if (!this.supported.includes(lang)) {

            lang = APP_CONFIG.DEFAULTS.LANGUAGE;

        }

        this.currentLanguage = lang;

        localStorage.setItem(

            this.storageKey,

            lang

        );

        document.documentElement.lang = lang;

        document.documentElement.dir =

            lang === "ar"

                ? "rtl"

                : "ltr";

        this.updateCurrentLanguage();

        window.dispatchEvent(

            new CustomEvent(

                "languagechange",

                {

                    detail: {

                        language: lang

                    }

                }

            )

        );

    },

    /**
     * ============================================================
     * UPDATE LABEL
     * ============================================================
     */

    updateCurrentLanguage() {

        const label = document.getElementById(

            "currentLanguage"

        );

        if (!label) return;

        switch (this.currentLanguage) {

            case "fr":

                label.textContent = "Français";

                break;

            case "en":

                label.textContent = "English";

                break;

            case "ar":

                label.textContent = "العربية";

                break;

        }

    },

    /**
     * ============================================================
     * GET CURRENT
     * ============================================================
     */

    getLanguage() {

        return this.currentLanguage;

    },

    /**
     * ============================================================
     * IS RTL
     * ============================================================
     */

    isRTL() {

        return this.currentLanguage === "ar";

    },

    /**
     * ============================================================
     * IS LTR
     * ============================================================
     */

    isLTR() {

        return !this.isRTL();

    },

    /**
     * ============================================================
     * TOGGLE
     * ============================================================
     */

    toggle() {

        if (this.currentLanguage === "fr") {

            this.change("en");

        }

        else if (this.currentLanguage === "en") {

            this.change("ar");

        }

        else {

            this.change("fr");

        }

    }

};

export default LanguageManager;