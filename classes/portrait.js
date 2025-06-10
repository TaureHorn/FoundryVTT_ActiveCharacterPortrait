import ACP from "../active-character-portrait.js";
import CharacterSelector from "./charSelector.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class PortraitV2 extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        classes: ['acp-portrait'],
        id: 'acp-portrait_{id}',
        position: {
            height: 236,
            width: 200
        },
        window: {
            icon: 'fas fa-image-user',
            minimizable: true,
            resizable: true,
        }
    }

    static PARTS = {
        image: {
            template: 'modules/active-character-portrait/templates/portrait.hbs'
        }
    }

    constructor(user) {
        super()
        this.represents = user
    }

    // DETERMINE SIZE AND POSITION OF WINDOW BASED ON FLAGS AND RELATIVE WINDOW DIMENSIONS
    async _prepareContext(opts) {
        if (game.release.generation >= 13) {
            if (game.settings.get(ACP.ID, 'fadeUI') && opts.isFirstRender) {
                this.options.classes.push('faded-ui')
            }
        }
        return this.represents.character ? this.represents.character : this.represents
    }

    async _preFirstRender(context, options) {
        if (options.position) {
            const pref = this.represents.getFlag(ACP.ID, ACP.FLAGS.PORTRAIT)
            const base = ACP.getPosition()
            if (pref) {
                options.position.height = pref.height
                options.position.width = pref.width
            }
            options.position.left = pref ? pref.left : base.left
            options.position.top = pref ? pref.top : base.top
        }
    }

    // ADD RENDERED APP TO USER DOCUMENT
    async _onFirstRender(context, options) {
        this.represents.apps[this.id] = this
    }

    // ONLY TRIGGER FULLY ONCE EVERY 5 SECONDS, WRITE APP POSITION AND SIZE TO USER FLAGS
    _onPosition(position) {
        if (typeof this.window.inMotion === 'undefined') this.window.inMotion = false
        if (this.window.inMotion) return
        setTimeout(async () => {
            await this.represents.setFlag(ACP.ID, ACP.FLAGS.PORTRAIT, position)
            console.info(`${ACP.ID}: saved position and size of portrait window to user '${this.represents.name}' flags`)
            delete this.window.inMotion
        }, 5000);
        this.window.inMotion = true
    }

    // ADD INTERACTIONS TO PORTRAIT IMAGE
    _onRender(context, options) {
        const portrait = document.querySelector('.acp-image')
        if (!portrait) return
        portrait.addEventListener('click', () => this.#openCharSheet())
        portrait.addEventListener('contextmenu', () => this.#openCharSelect())
    }

    // IF MODULE BYPASS ESCAPE KEY SET DO NOT CLOSE, ELSE DELETE APP FROM DOCUMENT AND CLOSE
    async close(opts) {
        if (game.settings.get(ACP.ID, 'bypassEscKey') && opts?.closeKey) return
        delete this.represents[this.id]
        super.close(opts)
    }

    // RIGHT CLICK PORTRAIT IMAGE
    #openCharSelect() {
        // new CharacterSelector().render(true)
    }

    // LEFT CLICK PORTRAIT IMAGE
    #openCharSheet() {
        if (this.represents.character) {
            return this.represents.character.sheet.render(true)
        } else {
            return ui.notifications.warn(`${ACP.ID}: You have not set a character in the user config`)
        }
    }

}

