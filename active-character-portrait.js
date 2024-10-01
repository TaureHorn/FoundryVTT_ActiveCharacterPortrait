
class ACP {

    static ID = 'active-character-portrait'

    static FLAGS = {
        PORTRAIT: 'portraitWindow',
        SELECTOR: 'characterSelectWindow'
    }

    static TEMPLATE = {
        CHARSELECT: `modules/${this.ID}/char-select.hbs`,
        PORTRAIT: `modules/${this.ID}/portrait.hbs`
    }

    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackage

        if (shouldLog) {
            console.log(this.ID, '|', ...args)
        }
    }
}

class Portrait extends Application {

    constructor(user) {
        super()
        this._represents = user
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overrides = {
            classes: ["acp-portait"],
            height: game.user.getFlag(ACP.ID, ACP.FLAGS.PORTRAIT).height,
            id: `${ACP.ID}_portrait`,
            left: game.user.getFlag(ACP.ID, ACP.FLAGS.PORTRAIT).left,
            minimizable: false,
            popOut: true,
            resizable: true,
            template: ACP.TEMPLATE.PORTRAIT,
            top: game.user.getFlag(ACP.ID, ACP.FLAGS.PORTRAIT).top,
            width: game.user.getFlag(ACP.ID, ACP.FLAGS.PORTRAIT).width,
        }
        return foundry.utils.mergeObject(defaults, overrides)
    }

    getData() {
        let data = ""
        if (this._represents.character) {
            data = this._represents.character
        } else {
            data = {
                name: this._represents.name,
                img: this._represents.avatar
            }
        }
        this.options.title = data.name
        return data
    }

    _getHeaderButtons() {
        const buttons = [
            {
                label: "",
                class: "pin",
                icon: "fas fa-thumbtack",
                onclick: () => {
                    game.user.setFlag(ACP.ID, ACP.FLAGS.PORTRAIT, this.position)
                    ui.notifications.notify("active character portrait | Pinned portrait to current size and position")
                }
            },
            {
                label: "",
                class: "close",
                icon: "fas fa-times",
                onclick: () => this.close("forceClose")
            }
        ]
        if (game.user.isGM) {
            buttons.unshift({
                label: "",
                class: "show-image",
                icon: "fas fa-magnifying-glass",
                onclick: () => {
                    const ip = new PersistentPopout(this._represents.character.img, {
                        title: this._represents.character.name,
                        uuid: this._represents.character.uuid
                    })
                    ip.render(true)
                }
            })
        }
        return buttons
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', this, this._handleLeftClick)
        html.on('contextmenu', "[data-action]", this._handleRightClick)
    }


    async close(...args) {
        if (!game.settings.get(ACP.ID, 'bypassEscKey') || Object.values(arguments).includes("forceClose")) {
            delete this._represents.apps[this.appId]
            return super.close(...args)
        }
    }

    _handleLeftClick = async () => {
        if (this._represents.character) {
            return this._represents.character.sheet.render(true)
        } else {
            ui.notifications.warn('active character portrait | you must select a character to represent you')
        }
    }

    _handleRightClick(event) {
        const action = $(event.currentTarget).data().action
        if (action === "openConfig") {
            new CharacterSelector().render(true)
        }
    }

    render(...args) {
        this._represents.apps[this.appId] = this
        return super.render(...args)
    }

}

class PersistentPopout extends ImagePopout {

    _getHeaderButtons() {
        const buttons = [
            {
                label: "close",
                class: "close",
                icon: "fas fa-times",
                onclick: () => { this.close("forceClose") }
            }
        ]
        if (game.user.isGM) {
            buttons.unshift({
                label: "Show Players",
                class: "share-image",
                icon: "fas fa-eye",
                onclick: () => this.shareImage()
            })
        }
        return buttons
    }

    async close(...args) {
        if (!game.settings.get(ACP.ID, 'bypassEscKey') || Object.values(arguments).includes("forceClose")) {
            return super.close(...args)
        }
    }

    static _handleShareApp(data) {
        new PersistentPopout(data.object, {
            uuid: data.options.uuid
        }).render(true)
    }

    shareImage() {
        game.socket.emit('module.active-character-portrait', this)
    }
}

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
                label: "",
                class: "pin",
                icon: "fas fa-thumbtack",
                onclick: () => {
                    game.user.setFlag(ACP.ID, ACP.FLAGS.SELECTOR, this.position)
                    ui.notifications.notify("active character portrait | Pinned character selector to current size and position")
                }
            },
            {
                label: "",
                class: "close",
                icon: "fas fa-times",
                onclick: () => this.close()
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

Hooks.on('init', function() {
    game.settings.register(ACP.ID, 'bypassEscKey', {
        name: "Bypass 'Esc' key",
        hint: "If this setting is enabled, the portrait window will no longer close when you press the 'Esc' key to close all open windows. It can still be closed manually by clicking the 'x' button on the window header.",
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    })
    game.settings.register(ACP.ID, 'headerButton', {
        name: "ACP Switcher header button",
        hint: 'If enabled, adds a button to the top of actor sheets to quickly switch your represented character to that actor. DOES NOT WORK FOR ACTORS FROM COMPENDIUMS!',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    })
})

// pre set users flags for the positioning of windows and auto launch portrait app
Hooks.once('ready', function() {
    if (!game.user.getFlag(ACP.ID, ACP.FLAGS.PORTRAIT)) {
        game.user.setFlag(ACP.ID, ACP.FLAGS.PORTRAIT, {
            height: 200,
            left: canvas.app.screen.width - 512,
            top: canvas.app.screen.height - 240,
            width: 200
        })
    }
    if (!game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR)) {
        game.user.setFlag(ACP.ID, ACP.FLAGS.SELECTOR, {
            height: canvas.app.screen.height * 0.5,
            left: canvas.app.screen.width * 0.2,
            top: canvas.app.screen.height * 0.1,
            width: canvas.app.screen.width * 0.6
        })
    }
    new Portrait(game.user).render(true)

    game.socket.on("module.active-character-portrait", (data) => {
        PersistentPopout._handleShareApp(data)
    })
})

// add button to player list to open up portrait
Hooks.on('renderPlayerList', (playerList, html) => {
    const tooltip = game.i18n.localize('ACP.button-title')
    html.prepend(
        `<button type="button" id="acp-open-portrait" data-tooltip='${tooltip}'><i class="fas fa-image-portrait"></i>close portrait</button>`
    )
    html.on('click', '#acp-open-portrait', () => {
        const window = document.getElementById(`${ACP.ID}_portrait`)
        if (window) {
            ui.windows[window.dataset.appid].close("forceClose")
            document.getElementById('acp-open-portrait').innerHTML = '<i class="fas fa-image-portrait"></i>open portrait'
        } else {
            new Portrait(game.user).render(true)
            document.getElementById('acp-open-portrait').innerHTML = '<i class="fas fa-image-portrait"></i>close portrait'
        }
    })
})

// add button to actor sheet header to switch to actor representing player
// method stolen from _dev-mode module
Hooks.on('getActorSheetHeaderButtons', async (app, buttons) => {
    if (app.object && game.settings.get(ACP.ID, 'headerButton')) {
        buttons.unshift({
            class: 'acp-switcher',
            icon: 'fa fa-swap-arrows',
            label: 'ACP Switcher',
            onclick: () => {
                if (!app.object.pack) {
                    const character = game.actors.get(app.object._id)
                    character ? game.user.update({ "character": character }) : ui.notifications.error(`ACP | unable to find actor with id of ${app.object._id}.`)
                } else {
                    ui.notifications.warn('ACP | Cannot set a Compendium item as your active character!')
                }
            }
        })
    }
})

