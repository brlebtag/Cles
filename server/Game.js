import TimeStep from './TimeStep.js';
import { CMD_CLIENT_UPDATE, SUCCESS, CMD_REGISTER, CMD_END_OF_BUFFER, CMD_TICK_REQUEST, CMD_TICK_RESPONSE, CMD_FULL_SERVER_UPDATE, CMD_SERVER_UPDATE, CMD_NEW_PLAYER, CMD_REMOVE_PLAYER, FAILURE, CMD_RESYNC_REQUEST, CMD_RESYNC_RESPONSE, CMD_WHOIS } from '../js/CommandTypes.js';
import { nextInteger, randomColor } from '../js/Random.js';
import { BufferSerializer, CommandSerializer, DynamicPacketBuilder } from '../js/Serializer.js';
import CommandInputs from '../js/CommandInputs.js';
import Player, { PLAYER_DISCONNECTED_STATE, PLAYER_PLAYING_STATE, PLAYER_RESYNCING_STATE } from './Player.js';
import { HelthCheckRate, MaxTimeWithoutResponse, MaxTimeToDisconnect, NetworkUpdateRate, TimeSamplingSyncRate, MaxTrysFullCommands, MinServerBufferToAlert } from '../js/Configuration.js';


const BOOTING_STATE = 0;
const RUNNING_STATE = 1;
const TEARING_DOWN_STATE = 2;

export default class Game {
    constructor(wss) {
        this.loop = new TimeStep();
        this.wss = wss;
        this.totalPlayers = 0;
        this.players = new Map();
        this.namesToIds = new Map();
        this._inputs = new CommandInputs();
        this.updateTimer = setInterval(this.updateClients.bind(this), NetworkUpdateRate);
        this.timeSyncTimer = setInterval(this.sendTickRequest.bind(this), TimeSamplingSyncRate);
        this.healthCheckTimer = setInterval(this.healthCheck.bind(this), HelthCheckRate);
        this.userUpdateLock = 0;
        this.state = BOOTING_STATE;
    }

    create() {
        this.preload();
        this.loop.start(this.update.bind(this));
        this.state = RUNNING_STATE;
        this.netcode();
    }

    get inputs() {
        return this._inputs;
    }

    preload() {

    }

    update(time, delta) {
        // console.log('now:', Date.now());

        if (this.state !== RUNNING_STATE) return;

        delta = delta / 1000; // adjust to seconds

        for (const [id, player] of this.players) {
            if (player.state !== PLAYER_PLAYING_STATE) continue;
            if (player.commands.empty()) {
                player.emptyCommandsTrys++;
                continue;
            } else {
                player.emptyCommandsTrys = 0;
            }
            const cmd = player.commands.shift(); // remove na frente
            this._inputs.consume(cmd);
            player.update(time, delta);
            player.lastProcessedFrame = cmd.frame;
            console.log(`Player: ${player.id}, lastProcessedFrame: ${cmd.frame}, X: ${player.x}, Y: ${player.y}`);
        }
    }

    destroy() {
        this.state = TEARING_DOWN_STATE;
        this.loop.stop();
    }

    removePlayer(ws) {
        if (this.state !== RUNNING_STATE) return;

        const curPlayer = ws.player;

        if (curPlayer) {
            curPlayer.disconnect();
            curPlayer.ws = null;
            ws.player = null;
            // this.namesToIds.delete(ws.player.name);
            // this.players.delete(ws.player.id);
            this.playerDisconnected(ws, curPlayer);
            this.userUpdateLock++;
            console.log(`[#${curPlayer.id}] Player "${curPlayer.name}" disconnected!`);
        }
    }

    netcode() {
        if (this.state !== RUNNING_STATE) return;

        this.wss.on('connection', (ws) => {
            console.log('New connection!');
            this.userUpdateLock++;
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
                                console.log('CMD_REGISTER');
                                this.registerUser(ws, serializer, t);
                                break;
                            case CMD_CLIENT_UPDATE:
                                // console.log('CMD_CLIENT_UPDATE');
                                this.clientUpdate(ws, serializer, t);
                                break;
                            case CMD_TICK_REQUEST:
                                // console.log('CMD_TICK_REQUEST');
                                this.sendTickResponse(ws, serializer, t);
                                break;
                            case CMD_TICK_RESPONSE:
                                // console.log('CMD_TICK_RESPONSE');
                                this.processTick(ws, serializer, t);
                                break;
                            case CMD_FULL_SERVER_UPDATE:
                                this.sendFullServerUpdate(ws, serializer, t)
                                break;
                            case CMD_RESYNC_REQUEST:
                                this.resyncRequest(ws, serializer, t);
                                break;
                            case CMD_RESYNC_RESPONSE:
                                this.resyncResponse(ws, serializer, t);
                                break;
                            case CMD_WHOIS:
                                this.whois(ws, serializer, t);
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
        if (this.state !== RUNNING_STATE) return;

        const namesToIds = this.namesToIds;
        const players =  this.players;
        const screenWidth = serializer.readUInt32();
        const screenHeight = serializer.readUInt32();
        const width = serializer.readUInt32();
        const height = serializer.readUInt32();
        const name = serializer.readString().trim();

        if (name === '') {
            this.sendRegistrationRejection(ws);
            console.log('Name is empty string!');
            return;
        }

        let player;

        if (!namesToIds.has(name)) {
            player = new Player(
                this,
                nextInteger(0, screenWidth - width),
                nextInteger(0, screenHeight - height),
                width,
                height
            );
            player.name = name;
            player.id = ++this.totalPlayers;
            namesToIds.set(name, player.id);
            players.set(player.id, player);
            player.color = 0xFFFFFF;
        } else {
            player = players.get(namesToIds.get(name));
            if (player.ws !== null && player.ws !== ws) {
                console.log(`Already registered with name: ${name}`);
                this.sendRegistrationRejection(ws);
                return;
            } else {
                player.resync();
            }
        }

        ws.id = player.id;
        ws.player = player;
        player.ws = ws;
        player.playing();

        this.sendRegistrationConfirmation(ws, player, t);
        this.newPlayerConnected(ws, player);
        // console.log(`[#${player.id}] Player "${player.name}" connected!`);
    }

    resyncRequest(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer && curPlayer.state === PLAYER_DISCONNECTED_STATE) return;

        curPlayer.resync();
        curPlayer.playing();
        this.sendResyncResponse(ws, curPlayer);
        // console.log(`[#${curPlayer.id}] Player "${curPlayer.name}" resync!`);
        curPlayer.lastClientUpdate = performance.now();
    }

    askResync(ws) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer && curPlayer.state === PLAYER_DISCONNECTED_STATE) return;

        curPlayer.resyncing();
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_RESYNC_REQUEST);
        builder.writeUInt32(curPlayer.id);
        ws.send(builder.buffer);
    }

    sendResyncResponse(ws, curPlayer) {
        if (this.state !== RUNNING_STATE || !curPlayer) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_RESYNC_RESPONSE);
        builder.writeUInt32(curPlayer.id);
        ws.send(builder.buffer);
    }

    resyncResponse(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer && curPlayer.state === PLAYER_DISCONNECTED_STATE) return;

        curPlayer.resync();
        curPlayer.playing();
    }

    sendRegistrationConfirmation(ws, player, t) {
        if (this.state !== RUNNING_STATE) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_REGISTER);
        builder.writeUInt8(SUCCESS);
        builder.writeUInt32(player.id);
        builder.writeInt32(player.x);
        builder.writeInt32(player.y);
        builder.writeUInt32(player.commands.capacity);
        builder.writeInt32(player.color);
        ws.send(builder.buffer);
    }

    sendRegistrationRejection(ws) {
        if (this.state !== RUNNING_STATE) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_REGISTER);
        builder.writeUInt8(FAILURE);
        ws.send(builder.buffer);
    }

    newPlayerConnected(ws, player) {
        if (this.state !== RUNNING_STATE) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_NEW_PLAYER);
        builder.writeUInt32(player.id);
        builder.writeInt32(player.x);
        builder.writeInt32(player.y);
        builder.writeString(player.name);
        builder.writeInt32(player.color);

        for (let [id, p] of this.players) {
            if (p !== player && p.state === PLAYER_PLAYING_STATE) {
                p.ws.send(builder.buffer);
            }
        }
    }

    playerDisconnected(ws, player) {
        if (this.state !== RUNNING_STATE) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_REMOVE_PLAYER);
        builder.writeUInt32(player.id);

        for (let [id, p] of this.players) {
            if (p !== player && p.state === PLAYER_PLAYING_STATE) {
                p.ws.send(builder.buffer);
            }
        }
    }

    sendTickResponse(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer || curPlayer.state === PLAYER_DISCONNECTED_STATE) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_TICK_RESPONSE);
        builder.writeFloat64(t);
        builder.writeFloat64(Date.now());
        ws.send(builder.buffer);
    }

    processTick(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer || curPlayer.state === PLAYER_DISCONNECTED_STATE) return;

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
        if (this.state !== RUNNING_STATE) return;

        const now = Date.now();
        
        for (const [id, player] of this.players) {
            const ws = player.ws;

            if (player.state === PLAYER_DISCONNECTED_STATE) continue;

            // enviar id, x, y, direcao face
            this.sendServerUpdate(ws, now);
        }
    }

    sendTickRequest() {
        if (this.state !== RUNNING_STATE) return;

        const players = this.players;

        if (players.size <= 0) return;

        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_TICK_REQUEST);
        const buffer = builder.buffer;

        for (const [id, player] of players) {
            if (player.state === PLAYER_DISCONNECTED_STATE) continue;
            const ws = player.ws;
            ws.send(buffer);
            player.t1 = Date.now();
        }
    }

    clientUpdate(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer || curPlayer.state !== PLAYER_PLAYING_STATE) return;
        
        const commandSerializer = new CommandSerializer(serializer);
        const commandsReceived = commandSerializer.deserialize();
        const len = commandsReceived.length;
        
        if (len <= 0) return;
        
        const commands = curPlayer.commands;
        let remaining = commands.capacity - commands.length;
        let lastReceivedFrame = curPlayer.lastReceivedFrame;

        if (remaining < MinServerBufferToAlert) {
            console.log(`[#${curPlayer.id}] Player "${curPlayer.name}"'s buffer is too full!`);
        }

        for (let i = 0; i < len && remaining > 0; i++) {
            const cmd = commandsReceived[i];
            if (cmd.frame > lastReceivedFrame) {
                console.log(`Frame added: ${cmd.frame}`);
                commands.push(cmd); // insere atrás
                lastReceivedFrame = cmd.frame;
                remaining--;
            } else {
                console.log(`Frame ignored: ${cmd.frame}`);
            }
        }
        
        console.log('lastReceivedFrame:', lastReceivedFrame);
        curPlayer.lastReceivedFrame = lastReceivedFrame;
        curPlayer.lastClientUpdate = performance.now();
    }

    sendServerUpdate(ws, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer || curPlayer.state !== PLAYER_PLAYING_STATE) return;

        const commands = curPlayer.commands;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_SERVER_UPDATE);
        builder.writeUInt32(commands.capacity - commands.length);
        builder.writeUInt32(curPlayer.id);
        builder.writeUInt32(curPlayer.lastProcessedFrame);
        builder.writeUInt32(curPlayer.lastReceivedFrame);
        builder.writeInt32(curPlayer.x);
        builder.writeInt32(curPlayer.y);
        builder.writeFloat64(t);
        builder.writeUInt32(this.userUpdateLock);

        console.log(`Player ${curPlayer.id} must be at (${curPlayer.x}, ${curPlayer.y}) in frame ${curPlayer.lastProcessedFrame}`);

        for (const [id, player] of this.players) {
            if (player === curPlayer || player.state !== PLAYER_PLAYING_STATE) continue;

            builder.writeUInt32(id);
            builder.writeInt32(player.x);
            builder.writeInt32(player.y);
        }

        ws.send(builder.buffer);
    }

    sendFullServerUpdate(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer || curPlayer.state !== PLAYER_PLAYING_STATE) return;
        
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        builder.writeUInt8(CMD_FULL_SERVER_UPDATE);
        builder.writeUInt32(this.userUpdateLock);

        for (const [id, player] of this.players) {
            if (player.id === curPlayer.id || player.state !== PLAYER_PLAYING_STATE) continue;

            builder.writeUInt32(player.id);
            builder.writeInt32(player.x);
            builder.writeInt32(player.y);
            builder.writeString(player.name);
            builder.writeInt32(player.color);
        }

        ws.send(builder.buffer);
        curPlayer.lastClientUpdate = performance.now();
    }

    whois(ws, serializer, t) {
        const curPlayer = ws.player;

        if (this.state !== RUNNING_STATE || !curPlayer || curPlayer.state !== PLAYER_PLAYING_STATE) return;
        
        const players = this.players;
        const builder = new DynamicPacketBuilder(DynamicPacketBuilder.BufferAllocator);
        
        builder.writeUInt8(CMD_WHOIS);

        while (!serializer.isEndOfBuffer()) {
            const id = serializer.readUInt32();

            if (players.has(id)) {
                const player = players.get(id);

                if (player.state === PLAYER_DISCONNECTED_STATE) continue;

                builder.writeUInt32(player.id);
                builder.writeInt32(player.x);
                builder.writeInt32(player.y);
                builder.writeString(player.name);
                builder.writeInt32(player.color);
            }
        }

        ws.send(builder.buffer);
        curPlayer.lastClientUpdate = performance.now();
    }

    healthCheck() {
        const now = performance.now();

        for (const [id, player] of this.players) {
            if (player.state === PLAYER_DISCONNECTED_STATE) continue;
            
            const ws = player.ws;
            const diff = now - player.lastClientUpdate;

            if (diff >= MaxTimeWithoutResponse && diff < MaxTimeToDisconnect) {
                this.askResync(ws);
                console.log(`[#${player.id}] Player "${player.name}" is not responding!`);
            } else if (diff >= MaxTimeToDisconnect) {
                ws.close();
                player.disconnect();
                console.log(`[#${player.id}] Player "${player.name}" was forcefully disconnected!`);
            }

            if (player.emptyCommandsTrys > MaxTrysFullCommands) {
                console.log(`[#${player.id}] Player "${player.name}"'s buffer is too low for too long!`);
            }
        }
    }
}