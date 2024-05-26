
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

    static _handleShareApp(data){
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
            height: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).height,
            id: `${ACP.ID}_character-selector`,
            left: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).left,
            minimizable: false,
            popOut: true,
            resizable: true,
            template: ACP.TEMPLATE.CHARSELECT,
            title: 'Character Selector',
            top: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).top,
            width: game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR).width,
        }
        return foundry.utils.mergeObject(defaults, overriders)
    }

    getData() {
        let characters = game.actors._source
        if (!game.user.isGM) {
            let chars = game.actors._source.filter((obj) => obj.ownership.default === 3)
            characters = chars.concat(game.actors._source.filter((obj) => obj.ownership.hasOwnProperty(game.userId)))
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

}

Hooks.on('init', function() {
    game.settings.register(ACP.ID, 'bypassEscKey', {
        name: "Bypass 'Esc' key",
        hint: "If this setting is enabled, the portrait window will no longer close when you press the 'Esc' key to close all open windows. It can still be closed manually by clicking the 'x' button on the window header.",
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: value => {
            ACP.log(true, `Bypass 'Esc' key setting set to: ${value}`)
        },
        choices: {
            true: 'True',
            false: 'False',
        }
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
        `<button type="button" id="acp-open-portrait" data-tooltip='${tooltip}'><i class="fas fa-image-portrait"></i>Open Portrait</button>`
    )
    html.on('click', '#acp-open-portrait', () => {
        new Portrait(game.user).render(true)
    })
})

