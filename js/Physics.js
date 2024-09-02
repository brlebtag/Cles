import Vector2 from './Vector2.js';

export class Body {
    constructor(gameObject) {
        this.acceleration = new Vector2();
        this.velocity = new Vector2();
        this.position = new Vector2(gameObject.x, gameObject.y);
        this.prevPosition = new Vector2(gameObject.x, gameObject.y);
        this.temp = new Vector2();
        this.gameObject = gameObject;
        this.mass = 1;
    }

    update(delta) {
         // https://gafferongames.com/post/integration_basics/
        // semi-implicit euler
        this.prevPosition.copy(this.position);
        this.temp.copy(this.acceleration).scale(delta);
        this.temp.add(this.velocity).scale(delta);
        this.position.add(this.temp);
        this.gameObject.x = this.position.x;
        this.gameObject.y = this.position.y;
        this.acceleration.reset();
        // update game object
        // https://github.com/phaserjs/phaser/blob/v3.80.0/src/physics/arcade/Body.js#L1054
    }

    destroy() {

    }

    applyForce(force) {
        this.acceleration.add(force.scale(1/this.mass));
    }
}