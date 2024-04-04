console.log("ACP | Hello World")

class ACP {

    static ID = 'active-character-portrait'

    static TEMPLATE = `modules/${this.ID}/portrait.hbs`

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
            left: 2030,
            height: ACP.SIZE.height,
            id: ACP.ID,
            popOut: true,
            minimizable: false,
            resizable: false,
            template: ACP.TEMPLATE,
            top: 1126,
            width: ACP.SIZE.width,
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

    _getHeaderButtons() { return {} }

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
            new UserConfig(game.user).render(true)
        }
    }

    render(...args) {
        this._represents.apps[this.appId] = this
        return super.render(...args)
    }
}

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(ACP.ID)
})

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
