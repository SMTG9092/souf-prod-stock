/**
 * ============================================================
 * SoufStock Enterprise ERP
 * login.js
 * Part 1
 * ============================================================
 */

import APP_CONFIG from "./config.js";
import AuthManager from "./auth.js";
import SessionManager from "./session.js";
import ThemeManager from "./theme.js";
import LanguageManager from "./language.js";

import {
    Toast,
    Loader,
    FormUtils,
    Animation
} from "./utils.js";

const LoginController = {

    elements:{},

    isLoading:false,

    init(){

        this.cacheElements();

        this.bindEvents();

        ThemeManager.init();

        LanguageManager.init();

        SessionManager.init();

        this.checkSession();

    },

    cacheElements(){

        this.elements={

            form:document.getElementById("loginForm"),

            username:document.getElementById("username"),

            password:document.getElementById("password"),

            remember:document.getElementById("rememberMe"),

            loginButton:document.getElementById("loginButton"),

            togglePassword:document.getElementById("togglePassword"),

            languageBtn:document.getElementById("languageBtn"),

            languageMenu:document.getElementById("languageMenu"),

            themeBtn:document.getElementById("themeToggle"),

            loader:document.getElementById("fullscreenLoader")

        };

    },

    bindEvents(){

        if(this.elements.form){

            this.elements.form.addEventListener(

                "submit",

                this.handleLogin.bind(this)

            );

        }

        if(this.elements.togglePassword){

            this.elements.togglePassword.addEventListener(

                "click",

                this.togglePassword.bind(this)

            );

        }

        if(this.elements.themeBtn){

            this.elements.themeBtn.addEventListener(

                "click",

                ()=>{

                    ThemeManager.toggle();

                }

            );

        }

        if(this.elements.languageBtn){

            this.elements.languageBtn.addEventListener(

                "click",

                ()=>{

                    this.elements.languageMenu.classList.toggle("show");

                }

            );

        }

        document.querySelectorAll(".lang-item")

        .forEach(btn=>{

            btn.addEventListener(

                "click",

                ()=>{

                    LanguageManager.change(

                        btn.dataset.lang

                    );

                }

            );

        });

    },

    checkSession(){

        if(SessionManager.isAuthenticated()){

            window.location.href="dashboard.html";

        }

    },
     **/
     * ============================================================
     * Validation
     * ============================================================
     */

    validateForm(){

        let valid = true;

        FormUtils.clearAllErrors(this.elements.form);

        const username = this.elements.username.value.trim();

        const password = this.elements.password.value;

        if(username.length < 3){

            FormUtils.showFieldError(
                this.elements.username,
                "Veuillez saisir un utilisateur valide."
            );

            Animation.shake(
                this.elements.username.closest(".form-group")
            );

            valid = false;

        }

        if(password.length < 6){

            FormUtils.showFieldError(
                this.elements.password,
                "Le mot de passe doit contenir au moins 6 caractères."
            );

            Animation.shake(
                this.elements.password.closest(".form-group")
            );

            valid = false;

        }

        return valid;

    },

   
     * ============================================================
     * Toggle Password
     * ============================================================
     */

    togglePassword(){

        const input = this.elements.password;

        const icon = this.elements.togglePassword.querySelector("i");

        if(input.type === "password"){

            input.type = "text";

            icon.classList.remove("fa-eye");

            icon.classList.add("fa-eye-slash");

        }else{

            input.type = "password";

            icon.classList.remove("fa-eye-slash");

            icon.classList.add("fa-eye");

        }

    },

  
     * ============================================================
     * Loading
     * ============================================================
     */

    setLoading(state){

        this.isLoading = state;

        if(state){

            Loader.show(
                "Connexion...",
                "Vérification de votre compte"
            );

            this.elements.loginButton.disabled = true;

            this.elements.loginButton.classList.add("loading");

        }else{

            Loader.hide();

            this.elements.loginButton.disabled = false;

            this.elements.loginButton.classList.remove("loading");

        }

    },

   
     * ============================================================
     * Language
     * ============================================================
     */

    changeLanguage(lang){

        LanguageManager.change(lang);

        this.elements.languageMenu.classList.remove("show");

    },

   
     * ============================================================
     * Theme
     * ============================================================
     */

    toggleTheme(){

        ThemeManager.toggle();

    },

    /**
     * ============================================================
     * Handle Login
     * ============================================================
     */

    async handleLogin(e){

        e.preventDefault();

        if(this.isLoading) return;

        if(!this.validateForm()){
            return;
        }

        const identifier = this.elements.username.value.trim();
        const password = this.elements.password.value;
        const remember = this.elements.remember.checked;

        this.setLoading(true);

        try{

            const result = await AuthManager.login(
                identifier,
                password
            );

            console.log("========== LOGIN RESULT ==========");
            console.log(result);

            const session = await AuthManager.getSession();
            console.log("========== SUPABASE SESSION ==========");
            console.log(session);

            const user = await AuthManager.getUser();
            console.log("========== SUPABASE USER ==========");
            console.log(user);

            if(!result.success){
                throw new Error(result.message);
            }

            SessionManager.createSession(
                result.profile,
                remember
            );

            console.log("========== LOCAL SESSION ==========");
            console.log(SessionManager.getLocalSession());

            Toast.success(
                "Connexion réussie",
                "Bienvenue"
            );

            setTimeout(()=>{
                window.location.href = "dashboard.html";
            },1200);

        }catch(error){

            console.error("LOGIN ERROR :", error);

            this.handleError(error);

        }finally{

            this.setLoading(false);

        }

    },
    
     * ============================================================
     * Login Errors
     * ============================================================
     */

    handleError(error){

        const message = error.message || "";

        switch(message){

            case "invalidCredentials":

                Toast.error(

                    "Nom d'utilisateur ou mot de passe incorrect.",

                    "Erreur"

                );

                Animation.shake(

                    this.elements.form

                );

                break;

            case "accountDisabled":

                Toast.warning(

                    "Votre compte est désactivé.",

                    "Compte"

                );

                break;

            case "networkError":

                Toast.error(

                    "Erreur réseau.",

                    "Connexion"

                );

                break;

            default:

                Toast.error(

                    message ||

                    "Erreur inconnue.",

                    "Erreur"

                );

        }

    },
  
     * ============================================================
     * Auto Login
     * ============================================================
  

    restoreSession(){

        if(SessionManager.isAuthenticated()){

            Toast.success(

                "Session restaurée",

                "Bienvenue"

            );

            setTimeout(()=>{

                window.location.href="dashboard.html";

            },800);

        }

    },


     * ============================================================
     * Keyboard Shortcut
     * ============================================================


    bindKeyboard(){

        document.addEventListener(

            "keydown",

            (event)=>{

                if(event.key==="Enter"){

                    if(!this.isLoading){

                        this.elements.form.requestSubmit();

                    }

                }

                if(event.key==="Escape"){

                    this.elements.languageMenu.classList.remove("show");

                }

            }

        );

    }

};


 * ============================================================
 * DOM Ready
 * ============================================================


document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        LoginController.init();

        LoginController.restoreSession();

        LoginController.bindKeyboard();

    }

);


 * ============================================================
 * Session Events
 * ============================================================


window.addEventListener(

    "sessionexpired",

    ()=>{

        Toast.warning(

            "Votre session a expiré.",

            "Session"

        );

    }

);

window.addEventListener(

    "sessioncreated",

    ()=>{

        console.log(

            "SoufStock Session Started"

        );

    }

);

window.addEventListener(

    "sessioncleared",

    ()=>{

        console.log(

            "SoufStock Session Closed"

        );

    }

);


 * ============================================================
 * Theme Event
 * ============================================================


window.addEventListener(

    "themechange",

    ()=>{

        console.log(

            "Theme Changed"

        );

    }

);


 * ============================================================
 * Language Event
 * ============================================================


window.addEventListener(

    "languagechange",

    ()=>{

        console.log(

            "Language Changed"

        );

    }

);

export default LoginController;
