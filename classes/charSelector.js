import ACP from "../active-character-portrait.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

// TODO: convert to ApplicationV2
export default class CharacterSelector extends FormApplication {

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
