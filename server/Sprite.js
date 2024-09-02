const Origin = 0.5;

export default class Sprite {
    constructor(scene, x, y, width, height) {
        this._x = this._y = 0;
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.scene = scene;
    }

    get x() {
        return this._x;
    }

    set x(value) {
        this.originX = value;
        this._x = value - (this.width * Origin);
        if (this.body) this.body.position.x = x;
    }

    get y() {
        return this._y;
    }

    set y(value) {
        this.originY = value;
        this._y = value - (this.height * Origin);
        if (this.body) this.body.position.y = y;
    }
}