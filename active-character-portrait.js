import PortraitV2 from "./classes/portrait.js"

export default class ACP {

    static ID = 'active-character-portrait'

    static NAME = 'Active Character Portrait'

    static FLAGS = {
        PORTRAIT: 'portraitWindow',
        SELECTOR: 'characterSelectWindow'
    }

    static TEMPLATE = {
        CHARSELECT: `modules/${this.ID}/char-select.hbs`,
        PORTRAIT: `modules/${this.ID}/portrait.hbs`
    }

    static getPosition() {
        return {
            left: Math.floor(window.innerWidth * (game.release.generation >= 13 ? 0.125 : 0.8)),
            top: Math.floor(window.innerHeight * (game.release.generation >= 13 ? 0.01 : 0.8))
        }
    }

    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackage

        if (shouldLog) {
            console.log(this.ID, '|', ...args)
        }
    }

    static switchCharacter() {

    }
}

// REGISTER SETTINGS AND KEYBINDS
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

    game.settings.register(ACP.ID, 'headerLabels', {
        name: "Header button labels",
        hint: 'Show labels for header buttons from this module? REQUIRES RELOAD',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    })

    if (game.release.generation >= 13) {
        game.settings.register(ACP.ID, 'fadeUI', {
            name: "Fade portrait UI",
            hint: 'Allow portrait window to fade out when not hovered like the rest of the UI elements',
            scope: 'client',
            config: true,
            type: Boolean,
            default: true,
            requiresReload: true
        })
    }

    game.keybindings.register(ACP.ID, 'togglePortrait', {
        name: "Toggle portrait window",
        hint: "Toggles the active character portrait window",
        editable: [
            {
                key: "KeyP",
            }
        ],
        onDown: () => {
            const portrait = document.querySelector('[id^="acp-portrait"]')
            portrait === null
                ? new PortraitV2(game.user).render(true)
                : foundry.applications.instances.get(portrait.id).close()
        },
    })

})

// pre set users flags for the positioning of windows and auto launch portrait app
Hooks.once('ready', function() {
    
    if (!game.user.getFlag(ACP.ID, ACP.FLAGS.SELECTOR)) {
        game.user.setFlag(ACP.ID, ACP.FLAGS.SELECTOR, {
            height: canvas.app.screen.height * 0.5,
            left: canvas.app.screen.width * 0.2,
            top: canvas.app.screen.height * 0.1,
            width: canvas.app.screen.width * 0.6
        })
    }

    // OPEN PORTRAIT WHEN GAME LOADS
    setTimeout(() => {
        new PortraitV2(game.user).render(true)
    }, 500)

})

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



