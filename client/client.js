import { SUCCESS, CMD_REGISTER, CMD_END_OF_BUFFER, CMD_SERVER_UPDATE, CMD_TICK_REQUEST, CMD_TICK_RESPONSE, CMD_CLIENT_UPDATE, CMD_FULL_SERVER_UPDATE, CMD_NEW_PLAYER, CMD_REMOVE_PLAYER, CMD_RESYNC_RESPONSE, CMD_RESYNC_REQUEST } from '../js/CommandTypes.js';
import KeyboardInputs from '../js/KeyboardInputs.js';
import { ArrayBufferSerializer, CommandSerializer, DynamicPacketBuilder } from "../js/Serializer.js";
import Player from "./Player.js";
import Replayer from "./Replayer.js";
import { MaxPacketSize, MaxTimeSyncSamples, NetworkUpdateRate, TimeSamplingSyncRate, HelthCheckRate, MaxTimeWithoutResponse, MaxTrysFullCommands, MinServerBufferToAlert, MaxCommandsSize, PlayerType, ReplayerType } from "../js/Configuration.js";
import Accumulator from '../js/Accumulator.js';

const MaxReconnect = 3;
const Texture = 'hero';

const BOOTING_STATE = 0;
const PLAYING_STATE = 1;
const REGISTERING_STATE = 2;
const RESYNCING_STATE = 3;
const TEARING_DOWN_STATE = 4;

export default class GameScene extends Phaser.Scene {
    constructor() {
        const config = {
            key: 'game',
        };
        super(config);

        this.frame = 1;
        this.name = sessionStorage.getItem('name') || '';
        this.name = !this.name || this.name === 'null' ? '' : this.name;
        console.log('Player\'s name', this.name);
        this.tryReconnectNetcode = 0;
        this.players = new Map();
        this.serverBufferSize = MaxCommandsSize;
        this.commandSerializer = new CommandSerializer(new ArrayBufferSerializer(new ArrayBuffer(MaxPacketSize)));
        this.player = null;
        this.t1 = this.t2 = this.t3 = this.t4 = 0;
        this.lags = new Accumulator(MaxTimeSyncSamples);
        this.offsets = new Accumulator(MaxTimeSyncSamples);
        this.serverTime = 0;
        this.lag = 0;
        this.updateTimer = setInterval(this.sendClientUpdate.bind(this), NetworkUpdateRate);
        this.timeSyncTimer = setInterval(this.sendTickRequest.bind(this), TimeSamplingSyncRate);
        this.healthCheckTimer = setInterval(this.healthCheck.bind(this), HelthCheckRate);
        this.id = -1;
        this.userUpdateLock = 0;
        this.state = BOOTING_STATE;
        this.lastServerUpdate = 0;
        this.fullCommandsTrys = 0;
        this._inputs = {
            command: () => {
                return {};
            },
        };
    }

    preload() {
        this.load.spritesheet(Texture, '../sprites/hero.png', {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create() {
        // let { width, height } = this.sys.game.canvas;
        this._inputs = new KeyboardInputs(this);
        const player = this.player = new Player(this, 25, 25, Texture);
        player.setVisible(false);
        player.setName(this.name);

        // this.cameras.main.startFollow(this.player, true);
        this.setUpAnimations();
        this.resync();
        this.netcode();

        window.addEventListener('beforeunload', (event) => {
            this.state = TEARING_DOWN_STATE;
        });
    }

    update(time, delta) {
        const offset = this.offsets.average();
        const now = Date.now();
        this.serverTime = Math.max(this.serverTime, now + offset); //monotonic increment!
        this.lag = this.lags.average();
        this.lagText.setText(`${this.lag}ms`);

        if (this.state !== PLAYING_STATE) return;

        // console.log(this.serverTime);

        const commands = this.player.commands;
        const players = this.players;
        delta = delta / 1000; // adjust to seconds

        const isFull = commands.full();

        if (isFull) {
            this.fullCommandsTrys++;
        } else {
            this.fullCommandsTrys = 0;
            const command = this.inputs.command();
            command.frame = this.frame;
            command.delta = delta;
            command.time = time;
            commands.push(command); // insere atrás
            this.frame++;
        };
        
        for (const [id, player] of players) {
            if (player.type == ReplayerType || !isFull) {
                player.update(time, delta, this.serverTime, this.lag);
            }
            console.log(`Player: ${player.id}, Frame: ${this.frame}, X: ${player.x}, Y: ${player.y}`);
        }
    }

    get inputs() {
        return this._inputs;
    }

    resync() {
        this.frame = 1;
        this.userUpdateLock = 0;
        const commands = this.player.commands;
        commands.reset();
        commands.clear();
    }

    computeTick() {
        const lag = (this.t4 - this.t1) - (this.t3 - this.t2) /* / 2*/;
        const offset = (this.t2 - this.t4) + (this.t3 - this.t1);

        this.lags.add(lag);
        this.offsets.add(offset);

        this.t1 = this.t2 = this.t3 = this.t4 = 0;
    }

    setUpAnimations() {
        Object.entries({
            "stop": {
                frameRate: 8, repeat: 0, frames: { start: 0, end: 0 },
            },
            "walking-down": {
                frameRate: 8, repeat: -1, frames: { start: 0, end: 3 },
            },
            "walking-right": {
                frameRate: 8, repeat: -1, frames: { start: 4, end: 7 },
            },
            "walking-up": {
                frameRate: 8, repeat: -1, frames: { start: 8, end: 11 },
            },
            "walking-left": {
                frameRate: 8, repeat: -1, frames: { start: 12, end: 15 },
            },
            "swinging-down": {
                frameRate: 10,repeat: 0, frames: { start: 16, end: 19 },
            },
            "swinging-up": {
                frameRate: 10, repeat: 0, frames: { start: 20, end: 23 },
            },
            "swinging-right": {
                frameRate: 10, repeat: 0, frames: { start: 24, end: 27 },
            },
            "swinging-left": {
                frameRate: 10, repeat: 0, frames: { start: 28, end: 31 },
            },
        })
        .forEach(([key, data]) => {
            const { frameRate, frames, repeat } = data;

            this.anims.create({
                key,
                frameRate,
                repeat,
                frames: this.anims.generateFrameNumbers(Texture, frames),
            });
        });

        this.lagText = this.add.text(
            0,
            0,
            '0ms',
            {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: `18px`,
                color: '#000000',
                align: 'center',
            }
        );
    }

    sendClientUpdate() {
        if (this.state !== PLAYING_STATE) return;
        const player = this.player;
        const commands = player.commands;
        if (commands.empty()) return;
        const commandSerializer = this.commandSerializer;
        commandSerializer.reset();
        commandSerializer.serializer.writeUInt8(CMD_CLIENT_UPDATE);
        // const total = Math.min(commands.length, this.serverBufferSize);
        const skip = player.lastReceivedFrame - player.lastProcessedFrame;
        const count = commands.length - skip;
        if (commandSerializer.serialize(commands, skip, count) > 0) {
            this.socket.send(commandSerializer.buffer);
        }
    }

    netcode() {
        this.socket = new WebSocket(`ws://${location.hostname}:8080`);
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
                while (!serializer.isEndOfBuffer()) {
                    switch (serializer.readUInt8()) {
                        case CMD_REGISTER:
                            console.log('CMD_REGISTER');
                            this.confirmServerRegistration(serializer, t);
                            break;
                        case CMD_SERVER_UPDATE:
                            this.serverUpdate(serializer, t);
                            break;
                        case CMD_FULL_SERVER_UPDATE:
                            console.log('CMD_FULL_SERVER_UPDATE');
                            this.fullServerUpdate(serializer, t);
                            break;
                        case CMD_NEW_PLAYER:
                            console.log('CMD_NEW_PLAYER');
                            this.newPlayer(serializer, t);
                            break;
                        case CMD_REMOVE_PLAYER:
                            console.log('CMD_REMOVE_PLAYER');
                            this.removePlayer(serializer, t);
                            break;
                        case CMD_TICK_REQUEST:
                            // console.log('CMD_TICK_REQUEST');
                            this.sendTickResponse(serializer, t);
                            break;
                        case CMD_TICK_RESPONSE:
                            // console.log('CMD_TICK_RESPONSE');
                            this.processTick(serializer, t);
                            break;
                        case CMD_RESYNC_RESPONSE:
                            this.resyncResponse(serializer, t);
                            break;
                        case CMD_RESYNC_REQUEST:
                            this.resyncRequest(serializer, t);
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

    resyncResponse(serializer, t) {
        if (this.state !== PLAYING_STATE && this.state !== RESYNCING_STATE) return;
        this.resync();
        this.state = PLAYING_STATE;
    }

    resyncRequest(serializer, t) {
        if (this.state !== PLAYING_STATE && this.state !== RESYNCING_STATE) return;
        this.resync();
        this.state = PLAYING_STATE;
        this.sendResyncResponse();
        this.lastServerUpdate = performance.now();
    }

    newPlayer(serializer, t) {
        if (this.state !== PLAYING_STATE) return;
        const players = this.players;
        const id = serializer.readUInt32();
        if (players.has(id)) return;
        const x = serializer.readInt32();
        const y = serializer.readInt32();
        const name = serializer.readString();
        const color = serializer.readInt32();
        const time = Date.now() + this.offsets.average();
        const player = new Replayer(this, x, y, Texture, time);
        player.id = id;
        player.setName(name);
        player.color = color;
        players.set(player.id, player);
        player.setTint(color);
    }

    removePlayer(serializer, t) {
        if (this.state !== PLAYING_STATE) return;

        const players = this.players;

        while (!serializer.isEndOfBuffer()) {
            const id = serializer.readUInt32();
            if (players.has(id)) {
                const player = players.get(id);
                player.deactive();
            }
            players.delete(id);
        }
    }

    reconnectServer() {
        this.state = BOOTING_STATE;
        const player = this.player;
        const players = this.players;

        for(let [id, p] of this.players) {
            if (p !== player) p.deactive();
        }

        players.clear();
        players.set(this.player.id, this.player);

        if (this.tryReconnectNetcode > MaxReconnect) {
            console.log('server disconnected!');
            return;
        }
        this.tryReconnectNetcode++;
        setTimeout(() => {
            // reset netcode!
            this.resync();
            this.netcode();
        }, 1000 * (this.tryReconnectNetcode + 1));
    }

    registerWithServer() {
        console.log('registering...!');
        this.state = REGISTERING_STATE;
        let name = this.name;
        let { width, height } = this.sys.game.canvas;

        if (name === '') {
            while (name === '') this.name = name = prompt('Your Name?');
            sessionStorage.setItem('name', name);
        }

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_REGISTER);
        builder.writeUInt32(width);
        builder.writeUInt32(height);
        builder.writeUInt32(this.player.width);
        builder.writeUInt32(this.player.height);
        builder.writeString(name);
        this.player.setName(name);
        this.socket.send(builder.buffer);
    }

    confirmServerRegistration(serializer, t) {
        if (this.state === REGISTERING_STATE) {
            const player = this.player;
            if (serializer.readUInt8() === SUCCESS) {
                const userId = serializer.readUInt32();
                this.id = player.id = userId;
                player.setPosition(serializer.readInt32(), serializer.readInt32());
                this.serverBufferSize = serializer.readUInt32();
                player.color = serializer.readInt32();
                player.setVisible(true);
                this.players.set(userId, player);
                player.setTint(player.color);
                this.state = PLAYING_STATE;
                this.askFullServerUpdate();
            } else {
                this.name = ''; // reset name and try again!
                this.registerWithServer();
            }
        } else {
            console.log('I received a registration confirmation but I am not in REGISTERING_STATE!');
        }
    }

    askFullServerUpdate() {
        if (this.state !== PLAYING_STATE) return;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_FULL_SERVER_UPDATE);
        this.socket.send(builder.buffer);
    }

    askResync() {
        if (this.state !== PLAYING_STATE && this.state !== REGISTERING_STATE) return;
        this.state = RESYNCING_STATE;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_RESYNC_REQUEST);
        builder.writeUInt32(this.id);
        this.socket.send(builder.buffer);
    }

    sendResyncResponse() {
        if (this.state !== PLAYING_STATE && this.state !== REGISTERING_STATE) return;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_RESYNC_RESPONSE);
        builder.writeUInt32(this.id);
        this.socket.send(builder.buffer);
    }

    sendTickRequest() {
        if (this.state === BOOTING_STATE) return;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_TICK_REQUEST);
        this.socket.send(builder.buffer);
        this.t1 = Date.now();
    }

    sendTickResponse(serializer, t) {
        if (this.state === BOOTING_STATE) return;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.ArrayBufferAllocator);
        builder.writeUInt8(CMD_TICK_RESPONSE);
        builder.writeFloat64(t);
        builder.writeFloat64(Date.now());
        this.socket.send(builder.buffer);
    }

    processTick(serializer, t) {
        if (this.state === BOOTING_STATE) return;
        this.t2 = serializer.readFloat64();
        this.t3 = serializer.readFloat64();
        this.t4 = t;
        this.computeTick();
    }

    serverUpdate(serializer, t) {
        if (this.state !== PLAYING_STATE) return;
        this.lastServerUpdate = performance.now();
        const players = this.players;
        const player = this.player;
        this.serverBufferSize = serializer.readUInt32();
        let playerId = serializer.readUInt32();
        const lastProcessedFrame = serializer.readUInt32();
        player.lastReceivedFrame = serializer.readUInt32();
        let x = serializer.readInt32();
        let y = serializer.readInt32();
        const serverCurrentTime = serializer.readFloat64();
        const userUpdateLock = serializer.readUInt32();        
        const commands = player.commands;

        while (commands.length > 0 && commands.front().frame <= lastProcessedFrame) {
            console.log(`Removed frame: ${commands.front().frame}`);
            commands.shift(); // remove comandos já processado.
        }

        player.lastProcessedFrame = lastProcessedFrame;
        player.reconciliate(x, y, this.serverTime);
        console.log(`Player must be at: (${x}, ${y}) in frame ${lastProcessedFrame}. But server is at ${player.lastReceivedFrame}`);

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

    fullServerUpdate(serializer, t) {
        if (this.state !== PLAYING_STATE) return;

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
            const color = serializer.readInt32();
            delete ids[id];
            if (players.has(id)) continue;
            const player = new Replayer(this, x, y, Texture, time);
            player.id = id;
            player.setName(name);
            player.color = color;
            players.set(player.id, player);
            player.setTint(color);
        }

        for (var [_, id] of Object.entries(ids)) {
            if (id === myId) continue;
            const player = players.get(id);
            player.deactive();
            players.delete(id);
        }

        this.lastServerUpdate = performance.now();
    }

    healthCheck() {
        if (this.state !== PLAYING_STATE && this.state !== RESYNCING_STATE) return;

        let player = this.player;
        
        if (!player) {
            player = this.player = new Player(this, 25, 25, Texture);
            player.setVisible(true);
            player.setName(this.name);
        }

        const now = performance.now();
        const lastServerUpdate = now - this.lastServerUpdate;

        if (lastServerUpdate > MaxTimeWithoutResponse) {
            console.log('server is a long time without answering...');
            this.askResync();
        } else if (this.fullCommandsTrys > MaxTrysFullCommands) {
            console.log('command buffer is full for a long time...');
            this.askResync();
        }

        if (this.serverBufferSize < MinServerBufferToAlert) {
            console.log('Server is lagging behind!');
        }

        // monitorar tempo resposta requisições de resync para não ficar travado
    }
}

let config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: 0xF8F8F8,
    parent: document.getElementById('game'),
    /*fps: {
        limit: 1,
    },*/
    scene: [GameScene]
};

let game = new Phaser.Game(config);