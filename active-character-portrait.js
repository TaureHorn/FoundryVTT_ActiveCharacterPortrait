console.log("ACP | Hello World")

class ACP {

    static ID = 'active-character-portrait'

    static TEMPLATE = {
        CHARSELECT: `modules/${this.ID}/char-select.hbs`,
        PORTRAIT: `modules/${this.ID}/portrait.hbs`
    }

    static SIZE = {
        height: 250,
        width: 215
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
            id: `${ACP.ID}_portrait`,
            left: screen.width - 512,
            popOut: true,
            minimizable: false,
            resizable: false,
            template: ACP.TEMPLATE.PORTRAIT,
            top: screen.height * 0.79
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
        return [{
            label: "",
            class: "close",
            icon: "fas fa-times",
            onclick: () => this.close()
        }]
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
            height: canvas.app?.screen.height * 0.8,
            id: `${ACP.ID}_character-selector`,
            popOut: true,
            minimizable: false,
            resizable: true,
            template: ACP.TEMPLATE.CHARSELECT,
            title: 'Character Selector',
            width: canvas.app?.screen.width * 0.54,
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
Hooks.on('renderPlayerList', (playerList, html) => {
    new Portrait(game.user).render(true)
    const tooltip = game.i18n.localize('ACP.button-title')
    html.prepend(
        `<button type="button" class="acp-button" title='${tooltip}'><i class="fas fa-image-portrait"></i></button>`
    )
    html.on('click', '.acp-button', (event) => {
        new Portrait(game.user).render(true)
    })
})

console.log("ACP | loaded module")
