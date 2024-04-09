
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
        return [
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
                onclick: () => this.close()
            }
        ]
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', "[data-action]", this._handleButtonClick)
    }


    async close(...args) {
        delete this._represents.apps[this.appId]
        return super.close(...args)
    }

    _handleButtonClick(event) {
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
})

// add button to player list to open up portrait
Hooks.on('renderPlayerList', (playerList, html) => {
    const tooltip = game.i18n.localize('ACP.button-title')
    html.prepend(
        `<button type="button" class="acp-button" data-tooltip='${tooltip}'><i class="fas fa-image-portrait"></i></button>`
    )
    html.on('click', '.acp-button', (event) => {
        new Portrait(game.user).render(true)
    })
})

