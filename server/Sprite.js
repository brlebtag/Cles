const Origin = 0.5;

export default class Sprite {
    constructor(x, y, width, height) {
        this._x = this.originX = x;
        this._y = this.originY = y;
        this.width = width;
        this.height = height;
    }

    get x() {
        return this._x;
    }

    set x(value) {
        this.originX = value;
        this._x = value - (this.width * Origin);
    }

    get y() {
        return this._y;
    }

    set y(value) {
        this.originY = value;
        this._y = value - (this.height * Origin);
    }
}