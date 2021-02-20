function draggableWindow(element) {

    this.dragElement = function(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "Header")) {
          document.getElementById(elmnt.id + "Header").onmousedown = dragMouseDown;
        } else {
          elmnt.onmousedown = dragMouseDown;
        }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
          e = e || window.event;
          e.preventDefault();

          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;

          elmnt.style.top = clamp(elmnt.offsetTop - pos2, 0, window.innerHeight - elmnt.offsetHeight)  + "px";
          elmnt.style.left = Math.max(0, Math.min(elmnt.offsetLeft - pos1, window.innerWidth - elmnt.offsetWidth)) + "px";
        }

        function closeDragElement() {
          document.onmouseup = null;
          document.onmousemove = null;
        }
    }

    dragElement(element);

    element.style.left = window.innerWidth - element.offsetWidth;
    element.style.top = window.innerHeight - element.offsetHeight;

    var button = element.querySelector('#windowOpacityMapHeader > button');
    if (button) {
        button.addEventListener('click', function() {
            element.style.visibility = 'hidden';
        });
    }
}