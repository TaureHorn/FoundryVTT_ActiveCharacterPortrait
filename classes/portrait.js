import ACP from "../active-character-portrait.js";
import CharacterSelector from "./charSelector.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api


// TODO: convert to ApplicationV2
//
export default class Portrait extends Application {

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
                class: "pin",
                icon: "fas fa-thumbtack",
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Pin' : '',
                onclick: () => {
                    game.user.setFlag(ACP.ID, ACP.FLAGS.PORTRAIT, this.position)
                    ui.notifications.notify("active character portrait | Pinned portrait to current size and position")
                },
                tooltip: 'Remember this window size and location'
            },
            {
                class: "close",
                icon: "fas fa-times",
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Close' : '',
                onclick: () => this.close("forceClose"),
                tooltip: 'Close window'
            }
        ]
        if (game.user.isGM) {
            buttons.unshift({
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Zoom' : '',
                class: "show-image",
                icon: "fas fa-magnifying-glass",
                onclick: () => {
                    const ip = new PersistentPopout(this._represents.character.img, {
                        title: this._represents.character.name,
                        uuid: this._represents.character.uuid
                    })
                    ip.render(true)
                },
                tooltip: 'Show actors image in separate window'
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
        super.render(...args)
        this._represents.apps[this.appId] = this
    }

}

// TODO: switch out hook to relevant v13 hook
//
// add button to actor sheet header to switch to actor representing player
// method stolen from _dev-mode module
Hooks.on('getActorSheetHeaderButtons', async (app, buttons) => {
    if (app.object && game.settings.get(ACP.ID, 'headerButton')) {
        buttons.unshift({
            class: 'acp-switcher',
            icon: 'fa fa-swap-arrows',
            label: game.settings.get(ACP.ID, 'headerLabels') ? 'ACP Switcher' : '',
            onclick: () => {
                if (!app.object.pack) {
                    const character = game.actors.get(app.object._id)
                    character ? game.user.update({ "character": character }) : ui.notifications.error(`ACP | unable to find actor with id of ${app.object._id}.`)
                } else {
                    ui.notifications.warn('ACP | Cannot set a Compendium item as your active character!')
                }
            },
            tooltip: 'Active Character Portrait | Switch to character'
        })
    }
})

