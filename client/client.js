import { SUCCESS, CMD_REGISTER, MAX_BUFFER_SIZE, CMD_END_OF_BUFFER, CMD_SERVER_UPDATE, CMD_TICK_REQUEST, CMD_TICK_RESPONSE, CMD_CLIENT_UPDATE, CMD_FULL_SERVER_UPDATE, CMD_NEW_PLAYER, CMD_REMOVE_PLAYER } from '../js/CommandTypes.js';
import KeyboardInputs from '../js/KeyboardInputs.js';
import { ArrayBufferSerializer, CommandSerializer, PacketBuilder } from "../js/Serializer.js";
import Player from "./Player.js";
import Replayer from "./Replayer.js";
import { MaxPacketSize, MaxTimeBuffer, NetworkUpdateRate, TimeSyncRate } from "../js/Configuration.js";
import Accumulator from '../js/Accumulator.js';
const MaxReconnect = 3;

export default class GameScene extends Phaser.Scene {
    constructor() {
        const config = {
            key: 'game',
        }

        super(config);
        this.frame = 1;
        this.isConnected = false;
        this.name = sessionStorage.getItem('name') || '';
        this.name = !this.name ? '' : this.name;
        this.tryReconnectNetcode = 0;
        this.players = new Map();
        this.serverBufferSize = MAX_BUFFER_SIZE;
        this.commandSerializer = new CommandSerializer(new ArrayBufferSerializer(new ArrayBuffer(MaxPacketSize)));
        this.player = null;
        this.t1 = this.t2 = this.t3 = this.t4 = 0;
        this.lags = new Accumulator(MaxTimeBuffer);
        this.offsets = new Accumulator(MaxTimeBuffer);
        this.serverTime = 0;
        this.lag = 0;
        this.updateTimer = setInterval(this.sendUpdateServer.bind(this), NetworkUpdateRate);
        this.timeSyncTimer = setInterval(this.sendTickRequest.bind(this), TimeSyncRate);
        this.firstTimeSync = true;
        this.id = -1;
        this.userUpdateLock = 0;
    }

    computeTick() {
        const lag = (this.t4 - this.t1) - (this.t3 - this.t2) /* / 2*/;
        const offset = (this.t2 - this.t4) + (this.t3 - this.t1);

        this.lags.add(lag);
        this.offsets.add(offset);

        this.t1 = this.t2 = this.t3 = this.t4 = 0;
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
        // this.cameras.main.startFollow(this.player, true);
        this.netcode();
    }

    update(time, delta) {
        const offset = this.offsets.average();
        const now = Date.now();
        this.serverTime = Math.max(this.serverTime, now + offset); //monotonic increment!
        this.lag = this.lags.average();

        if (!this.isConnected) {
            return;
        }

        const commands = this.player.commands;

        if (commands.full()) {
            return;
        }

        let command = this.inputs.command();

        delta = delta / 1000; // adjust to seconds

        command.frame = this.frame;
        command.delta = delta;
        command.time = time;
        commands.push(command); // insere atrás
        
        for (const [id, player] of this.players) {
            player.update(time, delta, this.serverTime, this.lag);
            // console.log('{"id": ',this.id, ', "time":', time, ', "delta":', delta, ', "frame":', this.frame, ', "x":', player.x, ', "y":', player.y, ', "left":', command.left, ', "right":', command.right, ', "up":', command.up, ', "down":', command.down, '}');
        }

        this.frame++;
    }

    sendUpdateServer() {
        if (!this.isConnected) {
            return;
        }
        const commands = this.player.commands;
        if (commands.empty()) {
            return;
        }
        
        const commandSerializer = this.commandSerializer;
        commandSerializer.reset();
        commandSerializer.serializer.writeUInt8(CMD_CLIENT_UPDATE);
        const total = Math.min(commands.length, this.serverBufferSize);
        if (commandSerializer.serialize(commands, total) > 0) {
            this.socket.send(commandSerializer.buffer);
        }
    }

    netcode() {
        this.socket = new WebSocket("ws://localhost:8080");
        this.socket.binaryType = "arraybuffer";

        this.socket.addEventListener("open", () => {
            this.tryReconnectNetcode = 0;
            this.registerWithServer();
        });

        this.socket.addEventListener("message", (event) => {
            let t = Date.now();
            if (event.data instanceof ArrayBuffer) {
                // binary frame
                const serializer = new ArrayBufferSerializer(event.data);
                const length = serializer.length;
                while (!serializer.isEndOfBuffer()) {
                    switch (serializer.readUInt8()) {
                        case CMD_REGISTER:
                            // console.log('CMD_REGISTER');
                            this.confirmServerRegistration(serializer, t);
                            break;
                        case CMD_SERVER_UPDATE:
                            // console.log('CMD_SERVER_UPDATE');
                            this.serverUpdate(serializer, t);
                            break;
                        case CMD_FULL_SERVER_UPDATE:
                            // console.log('CMD_FULL_SERVER_UPDATE');
                            this.fullServerUpdate(serializer);
                            break;
                        case CMD_NEW_PLAYER:
                            this.newPlayer(serializer, t);
                            break;
                        case CMD_REMOVE_PLAYER:
                            this.removePlayer(serializer, t);
                            break;
                        case CMD_TICK_REQUEST:
                            this.sendTickResponse(serializer, t);
                            break;
                        case CMD_TICK_RESPONSE:
                            this.processTick(serializer, t);
                            break;
                        case CMD_END_OF_BUFFER: return;
                    }
                }
              } else {
                // text frame
                console.log('Invalid message:', event.data);
              }
        });

        this.socket.addEventListener("error", (err) => {
            console.error(err);
            this.reconnectServer();
        });

        this.socket.addEventListener("close", this.reconnectServer.bind(this));
    }

    newPlayer(serializer, t) {
        const time = Date.now() + this.offsets.average();
        const id = serializer.readUInt32();
        const x = serializer.readInt32();
        const y = serializer.readInt32();
        const name = serializer.readString();
        const player = new Replayer(this, x, y, 'box', time);
        player.id = id;
        player.name = name;
        this.players.set(player.id, player);
    }

    removePlayer(serializer, t) {
        const players = this.players;

        while (!serializer.isEndOfBuffer()) {
            const id = serializer.readUInt32();
            if (players.has(id)) {
                const player = players.get(id);
                player.destroy(true);
            }
            players.delete(id);
        }
    }

    reconnectServer() {
        const player = this.player;
        const players = this.players;

        for(let [id, p] of this.players) {
            if (p !== player) {
                p.destroy(true);
            }
        }

        players.clear();
        players.set(this.player.id, this.player);
        this.isConnected = false;

        if (this.tryReconnectNetcode > MaxReconnect)
        {
            console.log('server disconnected!');
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

        const builder = new PacketBuilder(PacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_REGISTER);
        builder.writeUInt32(width);
        builder.writeUInt32(height);
        builder.writeUInt32(this.player.width);
        builder.writeUInt32(this.player.height);
        builder.writeString(name);
        this.socket.send(builder.buffer);
    }

    confirmServerRegistration(serializer, t) {
        const player = this.player;

        if (serializer.readUInt8() === SUCCESS) {
            this.isConnected = true;
            const userId = serializer.readUInt32();
            this.id = player.id = userId;
            player.setPosition(serializer.readInt32(), serializer.readInt32());
            this.serverBufferSize = serializer.readUInt32();
            player.setVisible(true);
            this.players.set(userId, player);
            this.askFullServerUpdate();
        }
    }

    askFullServerUpdate() {
        const builder = new PacketBuilder(PacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_FULL_SERVER_UPDATE);
        this.socket.send(builder.buffer);
    }

    sendTickRequest() {
        if (!this.isConnected) {
            return;
        }

        const builder = new PacketBuilder(PacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_TICK_REQUEST);
        this.socket.send(builder.buffer);
        this.t1 = Date.now();
    }

    sendTickResponse(serializer, t) {
        if (!this.isConnected) {
            return;
        }

        const builder = new PacketBuilder(PacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_TICK_RESPONSE);
        builder.writeFloat64(t);
        builder.writeFloat64(Date.now());
        this.socket.send(builder.buffer);
    }

    processTick(serializer, t) {
        this.t2 = serializer.readFloat64();
        this.t3 = serializer.readFloat64();
        this.t4 = t;
        this.computeTick();
    }

    serverUpdate(serializer, t) {
        const players = this.players;
        const player = this.player;
        this.serverBufferSize = serializer.readUInt32();
        let playerId = serializer.readUInt32();
        const lastProcessedFrame = serializer.readUInt32();
        let x = serializer.readInt32();
        let y = serializer.readInt32();
        const serverCurrentTime = serializer.readFloat64();
        const userUpdateLock = serializer.readUInt32();
        
        const commands = player.commands;

        while (commands.length > 0 && commands.front().frame <= lastProcessedFrame) {
            commands.shift(); // remove comandos já processado.
        }

        player.lastProcessedFrame = lastProcessedFrame;
        player.reconciliate(x, y, this.serverTime);

        while (!serializer.isEndOfBuffer()) {
            playerId = serializer.readUInt32();
            x = serializer.readInt32();
            y = serializer.readInt32();
            
            if (players.has(playerId)) {
                const player = players.get(playerId);
                player.addKnownPosition(x, y, serverCurrentTime);
            }
        }

        if (userUpdateLock !== this.userUpdateLock) {
            this.askFullServerUpdate();
            this.userUpdateLock = userUpdateLock;
        }
    }

    getIds() {
        let ids = {};
        const players = this.players;

        for(let [id, p] of players) {
            ids[id] = id;
        }

        return ids;
    }

    fullServerUpdate(serializer) {
        const time = Date.now() + this.offsets.average();
        this.userUpdateLock = serializer.readUInt32();
        const ids = this.getIds();
        const players = this.players;
        const myId = this.id;

        while (!serializer.isEndOfBuffer()) {
            const id = serializer.readUInt32();
            const x = serializer.readInt32();
            const y = serializer.readInt32();
            const name = serializer.readString();
            const player = new Replayer(this, x, y, 'box', time);
            player.id = id;
            player.name = name;
            players.set(player.id, player);
            delete ids[id];
        }

        for (var [_, id] of Object.entries(ids)) {
            if (id === myId) continue;
            const player = players.get(id);
            player.destroy(true);
            players.delete(id);
        }
    }
}

let config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: document.getElementById('game'),
    /*fps: {
        limit: 1,
    },*/
    scene: [GameScene]
};

let game = new Phaser.Game(config);