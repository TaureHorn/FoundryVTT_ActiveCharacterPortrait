import ACP from "../active-character-portrait.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

// TODO: convert to ApplicationV2
class CharacterSelector extends FormApplication {

    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overriders = {
            closeOnSubmit: false,
            height: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).height,
            id: `${ACP.ID}_character-selector`,
            left: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).left,
            minimizable: false,
            popOut: true,
            query: "",
            resizable: true,
            template: ACP.TEMPLATE.CHARSELECT,
            title: 'Character Selector',
            top: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).top,
            width: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).width,
        }
        return foundry.utils.mergeObject(defaults, overriders)
    }

    getData() {

        let characters = []
        if (!this.options.query) {
            characters = game.actors._source
        } else {
            characters = game.actors.search({ "query": this.options.query })
        }
        if (!game.user.isGM) {
            characters = characters.filter((obj) => obj.ownership.default === 3 || obj.ownership.hasOwnProperty(game.userId))
        }

        return {
            chars: characters,
            user: game.user
        }
    }

    _getHeaderButtons() {
        return [
            {
                class: "pin",
                icon: "fas fa-thumbtack",
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Pin' : '',
                onclick: () => {
                    game.user.setFlag(ACP.ID, ACP.FLAGS.SELECTOR, this.position)
                    ui.notifications.notify("active character portrait | Pinned character selector to current size and position")
                },
                tooltip: 'Remember this window size and location'
            },
            {
                class: "close",
                icon: "fas fa-times",
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Close' : '',
                onclick: () => this.close(),
                tooltip: 'Close window'
            }
        ]
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', "[data-action]", this._handleButtonClick)
    }

    _handleButtonClick = (event) => {
        const selected = $(event.currentTarget).data()
        const action = selected.action
        const id = selected.charId
        switch (action) {
            case 'select-char':
                const character = game.actors.get(id)
                game.user.update({ "character": character })
                this.close()
                break;
            case 'unselect-char':
                game.user.update({ "character": null })
                this.close()
                break;
            default:
                ui.notifications.error('ACP | Encountered an invalid "data-action" in _handleButtonClick')
        }
    }

    render(...args) {
        super.render(...args)
        setTimeout(() => {
            document.getElementById('acp-char-search').focus()
        }, 200)
    }

    async _updateObject(event, formData) {
        this.options.query = formData.charSearch
        this.render(true)
    }
}

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
            height: 800,
            width: 500
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
        for (const actor of actors) {
            if (actor.getUserLevel(this.user) >= ownershipLevel) characters.push(actor)
        }

        return {
            characters: characters,
            opts: opts,
            ...this.searchQuery && {searchQuery: this.searchQuery},
            user: this.user
        }
    }

    // SET OR DERIVE APP DIMENSIONS AND SCREEN PLACEMENT
    async _preFirstRender(context, options) {
        if (options.position) {
            const pref = this.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR)
            const base = ACP.getPosition(this.constructor)
            if (pref) {
                options.position.height = pref.height
                options.position.width = pref.width
            }
            options.position.left = pref ? pref.left : base.left
            options.position.top = pref ? pref.top : base.top
        }
        return context
    }

    // ADD RENDERED APP TO USER DOCUMENT
    async _onFirstRender(context, options) {
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

    // SET THIS.USERS SET CHARACTER TO NULL IF THEY HAVE ONE
    static async #unSelect(event, target) {
        if (this.user.character) {
            await this.user.update({ character: null })
            return this.close(true)
        }
    }
}
