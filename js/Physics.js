import Vector2 from './Vector2.js';

export class Body {
    constructor(gameObject) {
        this.gameObject = gameObject;
        this.acceleration = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.position = new Vector2(gameObject.x - gameObject.displayOriginX, gameObject.y - gameObject.displayOriginY);
        this.prevPosition = new Vector2();
        this.prevPosition.copy(this.position);
        this.mass = 1;
        this.transform = {
            x: gameObject.x,
            y: gameObject.y,
            displayOriginX: gameObject.displayOriginX,
            displayOriginY: gameObject.displayOriginY
        };
    }

    get width() {
        return this.gameObject.width;
    }

    set width(value) {
        return this.gameObject.width = value;
    }

    get height() {
        return this.gameObject.height;
    }

    set height(value) {
        return this.gameObject.height = value;
    }

    update(time, delta) {
        const go = this.gameObject;
        const transform = this.transform;
        const prev = this.prevPosition;
        const pos = this.position;
        const vel = this.velocity;
        const accel = this.acceleration;

        transform.x = go.x;
        transform.y = go.y;
        transform.displayOriginX = go.displayOriginX;
        transform.displayOriginY = go.displayOriginY;
        pos.x = transform.x - transform.displayOriginX;
        pos.y = transform.y - transform.displayOriginY;


         // https://gafferongames.com/post/integration_basics/
        // semi-implicit euler
        prev.x = pos.x;
        prev.y = pos.y;

        vel.x = vel.x + accel.x * delta;
        vel.y = vel.y + accel.y * delta;

        pos.x = pos.x + vel.x * delta;
        pos.y = pos.y + vel.y * delta;

        accel.x = 0;
        accel.y = 0;

        go.x += (pos.x - prev.x); //dx
        go.y += (pos.y - prev.y); //dy
        // update game object
        // https://github.com/phaserjs/phaser/blob/v3.80.0/src/physics/arcade/Body.js#L1054
    }

    reset() {
        const go = this.gameObject;
        this.acceleration.reset();
        this.velocity.reset();
        this.position.copy(go.position);
        this.prevPosition.copy(go.prevPosition);
        this.mass = 1;
    }

    copy(src) {
        this.acceleration.copy(src.acceleration);
        this.velocity.copy(src.velocity);
        this.position.copy(src.position);
        this.prevPosition.copy(src.prevPosition);
        this.mass = src.mass;
        this.transform.x = src.transform.x;
        this.transform.y = src.transform.y;
        this.transform.displayOriginX = src.transform.displayOriginX;
        this.transform.displayOriginY = src.transform.displayOriginY;
    }

    destroy() {

    }

    applyForce(force) {
        this.acceleration.add(force.scale(1/this.mass));
    }
}