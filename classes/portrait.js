import ACP from "../active-character-portrait.js";
import CharacterSelector from "./charSelector.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class PortraitV2 extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        actions: {
            click: PortraitV2.#onClick
        },
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

    // ADD EVENT LISTENER TO THIS PORTRAITS IMAGE TRIGGER #openSelector ON RIGHT CLICK
    _onRender(context, options) {
        const image = document.getElementById(this.id).querySelector('.acp-image')
        image.addEventListener('contextmenu', () => this.#openSelector())
    }

    // IF MODULE BYPASS ESCAPE KEY SET DO NOT CLOSE, ELSE DELETE APP FROM DOCUMENT AND CLOSE
    async close(opts) {
        if (game.settings.get(ACP.ID, 'bypassEscKey') && opts?.closeKey) return
        delete this.represents[this.id]
        super.close(opts)
    }

    // CLICK PORTRAIT OPEN CHARACTER SHEET OR WARN CHARACTER NOT SET IN USER CONFIG
    static #onClick(event, target) {
        return this.represents.character
            ? this.represents.character.sheet.render(true)
            : ui.notifications.warn(`${ACP.NAME}: You have not selected a character to represent you in the user config`)
    }

    // RIGHT CLICK PORTRAIT OPEN CHARACTER SELECTOR OR BRING TO FRONT
    #openSelector(event) {
        const app = document.querySelector('[id^="acp-character-select"]')

        app.length
            ? foundry.applications.instances.get(app.id).bringToFront()
            : new CharacterSelector().render(true)
    }

}

globalThis.ActiveCharacterPortrait = PortraitV2

