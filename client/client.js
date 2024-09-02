import { Body } from "../js/Physics";
import CircularArray from '../js/CircularArray.js';
import { SUCCESS, CMD_REGISTER, MAX_BUFFER_SIZE, CMD_END_OF_BUFFER, CMD_SERVER_UPDATE, CMD_TICK, CMD_CLIENT_UPDATE, CMD_FULL_SERVER_UPDATE } from '../js/CommandTypes.js';
import KeyboardInputs from '../js/KeyboardInputs.js';
import { TypedArraySerializer, CommandSerializer } from "../js/Serializer.js";
import Player from "./Player.js";
import Replayer from "./Replayer.js";
import { MaxPacketSize } from "../js/Configuration.js";
import { lag, timeOffset } from "../js/Lag.js";


const MaxReconnect = 3;
const UpdateRate = 20;


export default class GameScene extends Phaser.Scene {
    constructor() {
        const config = {
            key: 'game',
        }

        super(config);
        this.frame = 0;
        this.commands = new CircularArray(MAX_BUFFER_SIZE);
        this.isConnected = false;
        this.userId = -1;
        this.name = sessionStorage.getItem('name') || '';
        this.tryReconnectNetcode = 0;
        this.updateTimer = undefined;
        this.players = new Map();
        this.serverBufferSize = MAX_BUFFER_SIZE;
        this.commandSerializer = new CommandSerializer(new TypedArraySerializer(new Uint8Array(MaxPacketSize)));
        this.t1 = this.t2 = this.t3 = this.t4 = 0;
        this.timeOffsets = new Array(10).fill(0);
        this.timeOffsetIndex = 0;
    }

    averageTimeOffset() {
        return this.timeOffsets.reduce(((prev, cur) => (prev + cur)), 0) / this.timeOffsets.length;
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
        this.player = new Player(this, 25, 25, 'box');
        this.player.setVisible(false);
        this.netcode();
    }

    update(time, delta) {
        if (!this.isConnected) return;
        if (this.commands.full()) return;

        let command = this.inputs.command();
        command.frame = this.frame;
        this.commands.push(command);

        delta = delta / 1000; // adjust to seconds
        // box.rotation = box.body.velocity.angle();
        // this.box.rotation += delta;
        for (const [id, player] of this.players) {
            player.body.update(delta);
        }
        // console.log(delta);
        this.frame++;
    }

    sendUpdateServer() {
        if (!this.isConnected) return;
        if (this.commands.empty()) return;
        
        const commands = this.commands;
        const commandSerializer = this.commandSerializer;
        commandSerializer.reset();
        commandSerializer.writeUInt8(CMD_CLIENT_UPDATE);
        commandSerializer.serialize(commands, Math.min(commands.length, this.serverBufferSize));
        this.socket.send(commandSerializer.buffer);
    }

    netcode() {
        this.socket = new WebSocket("ws://localhost:8080");

        this.socket.binaryType = "arraybuffer";

        this.socket.addEventListener("open", () => {
            this.tryReconnectNetcode = 0;
            this.registerWithServer();
        });

        this.socket.addEventListener("message", (event) => {
            let t = performance.now();
            if (event.data instanceof ArrayBuffer) {
                // binary frame
                const serializer = new TypedArraySerializer(event.data);
                const length = serializer.length;
                while (serializer.bytes > length) {
                    switch (serializer.readUInt8()) {
                        case CMD_REGISTER:
                            this.confirmServerRegistration(serializer, t);
                            break;
                        case CMD_SERVER_UPDATE:
                            this.serverUpdate(serializer, t);
                            break;
                        case CMD_FULL_SERVER_UPDATE:
                            this.fullServerUpdate(serializer);
                            break;
                        case CMD_END_OF_BUFFER: return;
                    }
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
        let { width, height } = this.sys.game.canvas;

        if (name === '') {
            this.name = name = prompt('Your Name?');
            sessionStorage.setItem('name', name);
        }
        
        // CMD_REGISTER(1) + width(4) + height(4) + player width (4) + player height (4) + name's length (4) = 21
        let serializer = new TypedArraySerializer(new ArrayBuffer(name.length + 21));
        serializer.writeUInt8(CMD_REGISTER);
        serializer.writeUInt32(width);
        serializer.writeUInt32(height);
        serializer.writeUInt32(this.player.width);
        serializer.writeUInt32(this.player.height);
        serializer.writeString(name);
        this.t1 = performance.now();
        this.socket.send(serializer.buffer);
    }

    confirmServerRegistration(serializer, t) {
        if (serializer.readUInt8() === SUCCESS) {
            this.isConnected = true;
            const userId = serializer.readUInt32();
            this.player.id = userId;
            this.player.x = serializer.readInt32();
            this.player.y = serializer.readInt32();
            // this.box.setSize(serializer.readUInt32(), serializer.readUInt32());
            this.serverBufferSize = serializer.readUInt32();
            this.t2 = serializer.readFloat64();
            this.t3 = serializer.readFloat64();
            this.t4 = t;
            this.player.setVisible(true);
            this.players.set(userId, this.player);
            this.updateTimer = setInterval(this.sendUpdateServer.bind(this), UpdateRate);
            this.sendTick();
        } else {
            this.t1 = this.t4 = 0;
        }
    }

    sendTick() {
        let serializer = new TypedArraySerializer(new ArrayBuffer(18));
        serializer.writeUInt8(CMD_TICK);
        serializer.writeFloat64(this.t4);
        serializer.writeFloat64(performance.now());
        serializer.writeUInt8(CMD_END_OF_BUFFER);
        this.socket.send(serializer.buffer);
    }

    serverUpdate(serializer, t) {
        const players = this.players;
        const player = this.player;
        this.serverBufferSize = serializer.readUInt32();
        let playerId = serializer.readUInt32();
        const lastProcessedFrame = serializer.readUInt32();
        let x = serializer.readInt32();
        let y = serializer.readInt32();
        if (playerId !== this.player.id) {
            this.sendConfirmServerUpdate(t);
            return;
        }
        player.lastKnownPosition.x = x;
        player.lastKnownPosition.y = y;
        player.lastProcessedFrame = lastProcessedFrame;
        const serverCurrentTime = serializer.readFloat64();
        while (serializer.isEndOfBuffer() || serializer.peakUInt8() !== CMD_END_OF_BUFFER) {
            playerId = serializer.readUInt32();
            x = serializer.readInt32();
            y = serializer.readInt32();
            
            if (players.has(playerId)) {
                players[playerId].addKnownPosition(x, y, serverCurrentTime);
            }
        }

        this.sendConfirmServerUpdate(t);
        this.reconciliate();
    }

    reconciliate() {

    }

    fullServerUpdate(serializer) {
        while (serializer.isEndOfBuffer() || serializer.peakUInt32() !== CMD_END_OF_BUFFER) {
            const id = serializer.readUInt32();
            const x = serializer.readInt32();
            const y = serializer.readInt32();
            const name = serializer.readString();
            const player = new Replayer(this, x, y, 'box');
            player.id = id;
            player.name = name;
            this.players.set(player.id, player);
        }
    }

    sendConfirmServerUpdate(t) {
        const serializer = new TypedArraySerializer(new ArrayBuffer(18));
        serializer.writeUInt8(CMD_SERVER_UPDATE);
        serializer.writeFloat64(t);
        serializer.writeFloat64(performance.now());
        serializer.writeUInt8(CMD_END_OF_BUFFER);
        this.socket.send(serializer.buffer);
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