import { Body } from "../js/Physics";
import { MaxSpeed } from "../js/Configuration.js";

const MaxKnownPositions = 120;
const MaxInterpolationTime = 100/*ms*/;

export default class Replayer extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture, time) {
        super(scene, x, y, texture);
        this.scene.add.existing(this);
        const body = this.body = new Body(this);
        body.position.x = x - this.displayOriginX;
        body.position.y = y - this.displayOriginY;
        body.prevPosition.copy(body.position);

        this.lastKnownPositions = new Array(MaxKnownPositions);
        this.lastKnownPositionIndex = 1;

        for (let i = 0; i < MaxKnownPositions; i++) {
            this.lastKnownPositions[i] = new Phaser.Math.Vector2(x, y);
            this.lastKnownPositions[i].time = time;
        }
    }

    update(time, delta, serverTime, avgLag) {
        // this.body.update(delta);
        const [previous, next] = this.findStraddlePosition(serverTime - MaxInterpolationTime);

        if (previous == null) {
            return;
        }

        const divisor = serverTime - previous.time;
        const quotient = next.time - previous.time;

        const pos = Phaser.Math.LinearXY(previous, next, quotient == 0 ? 0 :divisor / quotient); // checar isso aqui!
        this.x = pos.x;
        this.y = pos.y;
        // sync physics engine!
        const body = this.body;
        body.prevPosition.copy(body.position);
        body.position.x = pos.x - this.displayOriginX;
        body.position.y = pos.y - this.displayOriginY;
    }

    addKnownPosition(x, y, time) {
        const lastKnownPosition = this.lastKnownPositions[this.lastKnownPositionIndex++];
        lastKnownPosition.x = x;
        lastKnownPosition.y = y;
        lastKnownPosition.time = time;
        if (this.lastKnownPositionIndex >= MaxKnownPositions) {
            this.lastKnownPositionIndex = 0;
        }
    }

    findStraddlePosition(time) {
        const knownPositions = this.lastKnownPositions;
        let next = this.lastKnownPositionIndex;
        let prev = next - 1;
        if (prev < 0) prev = MaxKnownPositions - 1;

        for (let i = 0; i < MaxKnownPositions; i++) {
            if (knownPositions[next].time >= time && knownPositions[prev].time <= time) {
                return [this.lastKnownPositions[prev], this.lastKnownPositions[next]];
            }

            next = next - 1;
            prev = next - 1;

            if (next < 0) {
                next = MaxKnownPositions - 1;
            }

            if (prev < 0) {
                prev = MaxKnownPositions - 1;
            }
        }

        return [null, null];
    }
}