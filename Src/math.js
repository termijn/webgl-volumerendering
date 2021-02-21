function Point(x, y) {
    this.x = x;
    this.y = y;
    this.left = x;
    this.top = y;

    this.subtract = function(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }

    this.add = function(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    this.len = function() {
        return Math.sqrt(this.x * this.x + this.y + this.y);
    }
}

function subtract(p1, p2) {
    return {x: p1.x - p2.x, y: p1.y - p2.y}
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}