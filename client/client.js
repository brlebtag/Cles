import { Body } from "../js/Physics";
import CircularArray from '../js/CircularArray.js';
import { CMD_REGISTER } from '../js/CommandTypes.js'

const FrameRate = 60;
const SecondsStored = 15;
const MaxPacketSize = 1205;
const MaxReconnect = 3;
const UpdateRate = 20;

export default class GameScene extends Phaser.Scene {
    constructor() {
        const config = {
            key: 'game',
        }

        super(config);
        this.frame = 0;
        this.commands = new CircularArray(FrameRate * SecondsStored);
        this.buffer = new Uint8Array(MaxPacketSize);
        this.isConnected = false;
        this.userId = -1;
        this.name = sessionStorage.getItem('name') || '';
        this.tryReconnectNetcode = 0;
        this.updateTimer = undefined;
    }

    preload() {
        this.load.image('box', '../sprites/box.png');
    }

    get inputs() {
        return this._inputs;
    }

    create() {
        // let { width, height } = this.sys.game.canvas;
        this._inputs = new KeyboardInputs(this);
        this.box = this.add.image(25, 25, 'box');
        this.box.body = new Body(this.box);
        this.box.body.velocity.set(0, 0);
        this.netcode();
    }

    update(time, delta) {
        if (!this.isConnected) return;
        if (this.commands.full()) return;

        let command = this.inputs.command();
        command.frame = this.frame;
        this.commands.push(command);

        delta = delta / 1000;
        // box.rotation = box.body.velocity.angle();
        // this.box.rotation += delta;
        this.box.body.update(delta);
        // console.log(delta);
        this.frame++;
    }

    sendUpdateServer() {
        if (!this.isConnected) return;
        if (this.commands.empty()) return;
    }

    netcode() {
        this.socket = new WebSocket("ws://localhost:8080");

        this.socket.binaryType = "arraybuffer";

        this.socket.addEventListener("open", () => {
            this.registerWithServer();
            this.tryReconnectNetcode = 0;
            setInterval(this.sendUpdateServer.bind(this), 1000 / UpdateRate);
        });

        this.socket.addEventListener("message", (event) => {
            if (event.data instanceof ArrayBuffer) {
                // binary frame
                const view = new DataView(event.data);
                switch(view.getUint8(0))
                {
                    case CMD_REGISTER:
                        this.confirmServerRegistration();
                        break;
                }
              } else {
                // text frame
                console.log(event.data);
              }
        });

        this.socket.addEventListener("error", (err) => {
            console.error(err);
            this.reconnectServer();
        });

        this.socket.addEventListener("close", this.reconnectServer.bind(this));
    }

    reconnectServer() {
        this.isConnected = false;
        if (this.updateTimer !== undefined) {
            clearInterval(this.updateTimer);
        }
        if (this.tryReconnectNetcode > MaxReconnect)
        {
            console.log('server disconnected!');
            alert('server disconnected!');
            return;
        }
        this.tryReconnectNetcode++;
        setTimeout(() => {
            // reset netcode!
            this.netcode();
        }, 1000 * (this.tryReconnectNetcode + 1));
    }

    registerWithServer() {
        let name = this.name;

        if (name == '') {
            this.name = name = prompt('Your Name?');
            sessionStorage.setItem('name', name);
        }
        
        let buffer = new ArrayBuffer(name.length + 5);
        let view = new DataView(buffer);
        view.setUint8(0, CMD_REGISTER);
        view.setUint32(1, name.length);
        for(let i = 0; i < name.length; i++) {
            view.setInt8(5 + i, name.charCodeAt(i));
        }
        this.socket.send(buffer);
    }

    confirmServerRegistration(view) {
        if (view.getUint8(1)) {
            this.isConnected = true;
            this.userId = view.getUint32(2);
        }
    }
}

let config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: document.getElementById('game'),
    scene: [GameScene]
};

let game = new Phaser.Game(config);