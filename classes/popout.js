import ACP from "../active-character-portrait.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

// TODO: figuure out if needs converting to extension of new clas and if so what base class is best
export default class PersistentPopout extends ImagePopout {

    _getHeaderButtons() {
        const buttons = [
            {
                class: "close",
                icon: "fas fa-times",
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Close' : '',
                onclick: () => { this.close("forceClose") },
                tootlip: 'Close window'
            }
        ]
        if (game.user.isGM) {
            buttons.unshift({
                class: "share-image",
                icon: "fas fa-eye",
                label: game.settings.get(ACP.ID, 'headerLabels') ? 'Show to players' : '',
                onclick: () => this.shareImage(),
                tootlip: 'Share image with players'
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
