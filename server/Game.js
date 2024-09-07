import TimeStep from './TimeStep.js';
import { CMD_CLIENT_UPDATE, SUCCESS, CMD_REGISTER, CMD_END_OF_BUFFER, CMD_TICK_REQUEST, CMD_TICK_RESPONSE, CMD_FULL_SERVER_UPDATE, CMD_SERVER_UPDATE, CMD_NEW_PLAYER, CMD_REMOVE_PLAYER } from '../js/CommandTypes.js';
import { nextInteger } from '../js/Random.js';
import { BufferSerializer, CommandSerializer, PacketBuilder } from '../js/Serializer.js';
import CommandInputs from '../js/CommandInputs.js';
import Player from './Player.js';
import { NetworkUpdateRate, TimeSyncRate } from '../js/Configuration.js';

export default class Game {
    constructor(wss) {
        this.loop = new TimeStep();
        this.wss = wss;
        this.totalPlayers = 0;
        this.players = new Map();
        this.namesToIds = new Map();
        this._inputs = new CommandInputs();
        this.updateTimer = setInterval(this.updateClients.bind(this), NetworkUpdateRate);
        this.timeSyncTimer = setInterval(this.sendTickRequest.bind(this), TimeSyncRate);
    }

    create() {
        this.preload();
        this.netcode();
        this.loop.start(this.update.bind(this));
    }

    get inputs() {
        return this._inputs;
    }

    preload() {

    }

    update(time, delta) {
        delta = delta / 1000; // adjust to seconds

        for (const [id, player] of this.players) {
            if (player.buffer.empty()) return;
            const cmd = player.buffer.shift(); // remove na frente
            this._inputs.consume(cmd);
            player.update(time, delta);
            player.lastProcessedFrame = cmd.frame;
            // console.log('{"id":', id, ', "time":', time, ', "delta":', delta, ', "frame":', cmd.frame, ', "x":', player.x, ', "y":', player.y, ', "left":', cmd.left, ', "right":', cmd.right, ', "up":', cmd.up, ', "down":', cmd.down, '}');
        }
    }

    destroy() {
        this.loop.stop();
    }

    removePlayer(ws) {
        if (ws.player) {
            ws.player.isDisconnected = true;
            // this.namesToIds.delete(ws.player.name);
            // this.players.delete(ws.player.id);
            this.playerDisconnected(ws, ws.player);
        }
    }

    netcode() {
        this.wss.on('connection', (ws) => {
            console.log('New connection!');
            ws.player = null;

            ws.on('error', (err) => {
                this.removePlayer(ws);
                console.error(err);
            });

            ws.on('close', () => {
                this.removePlayer(ws);
            });
          
            ws.on('message', (data) => {
                let t = Date.now(); // t2
                if (data instanceof Buffer) {
                    // binary frame
                    let serializer = new BufferSerializer(data);
                    while (!serializer.isEndOfBuffer()) {
                        switch (serializer.readUInt8()) {
                            case CMD_REGISTER:
                                // console.log('CMD_REGISTER');
                                this.registerUser(ws, serializer, t);
                                break;
                            case CMD_CLIENT_UPDATE:
                                // console.log('CMD_CLIENT_UPDATE');
                                this.clientUpdate(ws, serializer, t);
                                break;
                            case CMD_TICK_REQUEST:
                                this.sendTickResponse(ws, serializer, t);
                                break;
                            case CMD_TICK_RESPONSE:
                                // console.log('CMD_TICK');
                                this.processTick(ws, serializer, t);
                                break;
                            case CMD_END_OF_BUFFER: return;
                        }
                    }
                } else {
                    console.log('Invalid message:', data);
                    return;
                }
            });
        });
    }

    registerUser(ws, serializer, t) {
        const namesToIds = this.namesToIds;
        const players =  this.players;
        const screenWidth = serializer.readUInt32();
        const screenHeight = serializer.readUInt32();
        const width = serializer.readUInt32();
        const height = serializer.readUInt32();
        const name = serializer.readString().trim();
        let player;

        if (!namesToIds.has(name)) {
            player = new Player(
                this,
                nextInteger(0, screenWidth),
                nextInteger(0, screenHeight),
                width,
                height
            );
            player.name = name;
            player.id = ++this.totalPlayers;
            player.skipClientUpdate = false;
            namesToIds.set(name, player.id);
            players.set(player.id, player);
        } else {
            player = players.get(namesToIds.get(name));
        }
        ws.id = player.id;
        ws.player = player;
        player.ws = ws;

        this.newPlayerConnected(ws, player);
        this.sendRegistrationConfirmation(ws, player, t);
        this.sendFullServerUpdate(ws, player, t);
        console.log(`player #${player.id} registered!`);
    }

    sendRegistrationConfirmation(ws, player, t) {
        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_REGISTER);
        builder.writeUInt8(SUCCESS);
        builder.writeUInt32(player.id);
        builder.writeInt32(player.x);
        builder.writeInt32(player.y);
        builder.writeUInt32(player.buffer.capacity);
        ws.send(builder.buffer);
    }

    newPlayerConnected(ws, player) {
        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_NEW_PLAYER);
        builder.writeUInt32(player.id);
        builder.writeInt32(player.x);
        builder.writeInt32(player.y);
        builder.writeString(player.name);

        for (let [id, p] of this.players) {
            if (p !== player) {
                p.ws.send(builder.buffer);
            }
        }
    }

    playerDisconnected(ws, player) {
        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_REMOVE_PLAYER);
        builder.writeUInt32(player.id);

        for (let [id, p] of this.players) {
            if (p !== player) {
                p.ws.send(builder.buffer);
            }
        }
    }

    sendTickResponse(ws, serializer, t) {
        if (!ws.player) return;

        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_TICK_RESPONSE);
        builder.writeFloat64(t);
        builder.writeFloat64(Date.now());
        ws.send(builder.buffer);
    }

    processTick(ws, serializer, t) {
        if (!ws.player) return;

        const player = ws.player;
        player.t2 = serializer.readFloat64();
        player.t3 = serializer.readFloat64();
        player.t4 = t;

        const delta_1_4 = player.t4 - player.t1;
        const delta_2_3 = player.t3 - player.t2;

        // Too big, ignore t2 and t3
        if (delta_2_3 > (delta_1_4 * 0.5)) {
            player.t2 = player.t3 = 0; 
        }

        player.computeTick();
    }

    updateClients() {
        const now = Date.now();
        
        for (const [id, player] of this.players) {
            const ws = player.ws;
            
            if (player.skipClientUpdate) {
                player.skipClientUpdate = false;
                continue;
            }

            // enviar id, x, y, direcao face
            this.sendServerUpdate(ws, now);
        }
    }

    sendTickRequest() {
        const players = this.players;
        if (players.size <= 0) return;

        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_TICK_REQUEST);
        const buffer = builder.buffer;

        for (const [id, player] of players) {
            const ws = player.ws;
            ws.send(buffer);
            player.t1 = Date.now();
        }
    }

    clientUpdate(ws, serializer, t) {
        if (!ws.player) return;
        
        const player = ws.player;
        const commandSerializer = new CommandSerializer(serializer);
        const commands = commandSerializer.deserialize();
        const len = commands.length;
        
        if (len <= 0) return;
        
        const buffer = player.buffer;
        let remaining = buffer.capacity - buffer.length;
        let lastReceivedFrame = player.lastReceivedFrame;

        for (let i = 0; i < len && remaining > 0; i++) {
            const cmd = commands[i];
            if (cmd.frame > lastReceivedFrame) {
                buffer.push(cmd); // insere atrás
                lastReceivedFrame = cmd.frame;
                remaining--;
            }
        }

        player.lastReceivedFrame = lastReceivedFrame;
        player.skipClientUpdate = true;
        this.sendServerUpdate(ws, t);
    }

    sendServerUpdate(ws, t) {
        if (!ws.player) return;
        const curPlayer = ws.player;
        const buffer = curPlayer.buffer;
        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_SERVER_UPDATE);
        builder.writeUInt32(buffer.capacity - buffer.length);
        builder.writeUInt32(curPlayer.id);
        builder.writeUInt32(curPlayer.lastReceivedFrame);
        builder.writeInt32(curPlayer.x);
        builder.writeInt32(curPlayer.y);
        builder.writeFloat64(Date.now());

        for (const [id, player] of this.players) {
            if (player === curPlayer) continue;

            builder.writeUInt32(id);
            builder.writeInt32(player.x);
            builder.writeInt32(player.y);
        }

        ws.send(builder.buffer);
    }

    sendFullServerUpdate(ws, curPlayer, t) {
        const builder = new PacketBuilder(PacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_FULL_SERVER_UPDATE);

        for (const [id, player] of this.players) {
            if (player === curPlayer || player.isDisconnected) continue;

            builder.writeUInt32(player.id);
            builder.writeInt32(player.x);
            builder.writeInt32(player.y);
            builder.writeString(player.name);
        }

        ws.send(builder.buffer);
    }
}