import ACP from "../active-character-portrait.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class CharacterSelectorV2 extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        actions: {
            select: CharacterSelectorV2.#onSelect,
            unselect: CharacterSelectorV2.#unSelect
        },
        classes: ['standard-form'],
        id: 'acp-character-select_{id}',
        form: {
            handler: CharacterSelectorV2.#onSearch,
        },
        position: {
            height: 'auto',
            width: 800
        },
        tag: 'form',
        window: {
            icon: 'fas fa-image-user',
            minimizable: true,
            resizable: true
        }
    }

    static PARTS = {
        selector: {
            template: 'modules/active-character-portrait/templates/char-select.hbs'
        }
    }

    constructor(user) {
        super()
        this.user = user
    }

    get title() {
        return `${game.i18n.localize("ACP.character-select.title")}: ${this.user.name}`
    }

    // PREPARE A LIST OF ACTORS THE USER CAN CHOOSE FROM
    async _prepareContext(opts) {
        this.options.classes.push(`acp-char-select_${this.user.id}`)

        let characters = []
        let ownershipLevel = game.settings.get(ACP.ID, 'ownershipLevel')
        const actors = this.searchQuery ? game.actors.search({ query: this.searchQuery }) : game.actors
        for (let actor of actors) {
            let userLevel = actor.getUserLevel(this.user)
            if (userLevel >= ownershipLevel) {
                actor.ownedLevel = Object.keys(CONST.DOCUMENT_OWNERSHIP_LEVELS)[userLevel + 1]
                characters.push(actor)
            }
        }

        const user = this.user
        user.gm = this.user.isGM

        return {
            characters: characters,
            opts: opts,
            ...this.searchQuery && {searchQuery: this.searchQuery},
            user: user
        }
    }

    // SET OR DERIVE APP DIMENSIONS AND SCREEN PLACEMENT
    async _preFirstRender(context, options) {
        if (options.position) {
            const pref = this.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR)
            const base = ACP.getPosition(this.constructor)
            if (pref) {
                options.position.width = pref.width
            }
            options.position.left = pref ? pref.left : base.left
            options.position.top = pref ? pref.top : base.top
        }
        return context
    }

    // ADD RENDERED APP TO USER DOCUMENT
    async _onFirstRender(context, options) {
        const searchBar = document.querySelector(`.acp-char-search_${this.user.id}`)
        if (searchBar) searchBar.focus()
        return this.user.apps[this.id] = this
    }

    // ONLY TRIGGER FULLY ONCE EVERY 5 SECONDS, WRITE APP POSITION AND SIZE TO USER FLAGS
    _onPosition(position) {
        if (typeof this.window.inMotion === 'undefined') this.window.inMotion = false
        if (this.window.inMotion) return
        setTimeout(async () => {
            await this.user.setFlag(ACP.ID, ACP.FLAGS.SELECTOR, position)
            console.info(`${ACP.NAME}: saved position and size of character selector window to user '${this.user.name}' flags`)
            delete this.window.inMotion
        }, 5000);
        return this.window.inMotion = true
    }

    // DELETE APPS FROM USER APPS AND CLOSE
    async close(opts) {
        delete this.user.apps[this.id]
        return super.close(opts)
    }

    // GET SEARCH QUERY FROM FORM AND ADD TO THIS
    static #onSearch(event, target, formData) {
        this.searchQuery = formData.object.charSearch
        return this.render(true)
    }

    // TRY TO GET ACTOR AND UPDATE THIS.USER WITH ACTOR, RETURN IF NO ACTOR
    static async #onSelect(event, target) {
        const actor = game.actors.get(target.dataset.charId)
        if (!actor) return ui.notifications.warn(`${ACP.NAME}: Cannot find that actor`)
        if (actor === this.user.character) return
        await this.user.update({ character: actor })
        return this.close(true)
    }

    // SET THIS.USERS SELECTED CHARACTER TO NULL IF THEY HAVE ONE
    static async #unSelect(event, target) {
        if (this.user.character) {
            await this.user.update({ character: null })
            return this.close(true)
        }
    }
}
