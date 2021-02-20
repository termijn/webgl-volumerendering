function subtract(p1, p2) {
    return {x: p1.x - p2.x, y: p1.y - p2.y}
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}
