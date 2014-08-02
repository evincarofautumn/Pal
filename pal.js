var BACKGROUND_COLOR = 'rgb(40, 40, 50)';
var CANVAS_SIZE = 300;
var CONTROL_POINT_ACTIVE_COLOR = 'rgb(128, 192, 255)';
var CONTROL_POINT_COLOR = 'rgb(0, 128, 255)';
var CONTROL_POINT_SIZE = 10;
var DOUBLE_CLICK_THRESHOLD = 400;
var NUDGE_AMOUNT = 1/20;

function View(parameters) {
  var object = {
    canvas: parameters.canvas,
    context: parameters.canvas.getContext('2d'),
    editor: parameters.editor,
    palette: parameters.palette,
    x: parameters.x,
    y: parameters.y,
    selected_nodes: [],
    drag_origin_x: 0,
    drag_origin_y: 0,
    dragging: false,
    last_click: 0,
    last_cursor_x: 0,
    last_cursor_y: 0,
    add_node: function(view_x, view_y) {
      var x, y, z;
      switch (this.x) {
      case 'x':
        x = view_x;
        break;
      case 'y':
        y = view_x;
        break;
      case 'z':
        z = view_x;
        break;
      }
      switch (this.y) {
      case 'x':
        x = view_y;
        break;
      case 'y':
        y = view_y;
        break;
      case 'z':
        z = view_y;
        break;
      }
      var default_value = 0.50;
      if (x === undefined) {
        x = default_value;
      } else if (y === undefined) {
        y = default_value;
      } else if (z === undefined) {
        z = default_value;
      }
      this.palette.add_node(new Node({ x: x, y: y, z: z }));
    },
    begin_drag: function(x, y) {
      if (this.palette.active_nodes().length === 0 || this.dragging)
        return;
      this.dragging = true;
      this.drag_origin_x = x;
      this.drag_origin_y = y;
      this.canvas.style.cursor = 'all-scroll';
    },
    clear: function() {
      this.context.fillStyle = BACKGROUND_COLOR;
      this.context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    },
    construct: function() {
      var self = this;
      this.canvas.onmousedown = function(event) { self.mouse_down(event); };
      this.canvas.onmousemove = function(event) { self.mouse_move(event); };
      this.canvas.onmouseup = function(event) { self.mouse_up(event); };
      this.canvas.onselectstart = function() { return false; };
    },
    end_drag: function() {
      this.dragging = false;
      this.canvas.style.cursor = 'default';
    },
    mouse_down: function(event) {
      this.state = 'DOWN';
      var self = this;
      var clicked_node = null;
      var now = new Date().getTime();
      if (now - this.last_click < DOUBLE_CLICK_THRESHOLD)
        this.add_node(event.offsetX / CANVAS_SIZE, event.offsetY / CANVAS_SIZE);
      this.last_click = now;
      this.palette.map_nodes(function(node) {
        var left = node[self.x] * CANVAS_SIZE - CONTROL_POINT_SIZE / 2;
        var top = node[self.y] * CANVAS_SIZE - CONTROL_POINT_SIZE / 2;
        var right = left + CONTROL_POINT_SIZE;
        var bottom = top + CONTROL_POINT_SIZE;
        if (event.offsetX >= left && event.offsetY >= top
          && event.offsetX <= right && event.offsetY <= bottom) {
          clicked_node = node;
        }
      });
      if (!(event.shiftKey || (clicked_node !== null && clicked_node.active))) {
        this.palette.map_nodes(function(node) {
          if (node !== clicked_node)
            node.active = false;
        });
      }
      if (clicked_node !== null) {
        if (event.shiftKey) {
          clicked_node.active = !clicked_node.active;
        } else {
          clicked_node.active = true;
        }
      }
      if (!event.shiftKey)
      this.palette.render();
    },
    mouse_move: function(event) {
      this.last_cursor_x = event.offsetX;
      this.last_cursor_y = event.offsetY;
      this.editor.active_view = this;
      if (this.state === 'DOWN') {
        var active_nodes = this.palette.active_nodes();
        this.begin_drag(event.offsetX, event.offsetY);
        var delta_x = (event.offsetX - this.drag_origin_x) / CANVAS_SIZE;
        var delta_y = (event.offsetY - this.drag_origin_y) / CANVAS_SIZE;
        this.drag_origin_x = event.offsetX;
        this.drag_origin_y = event.offsetY;
        var self = this;
        active_nodes.forEach(function(node) {
          node[self.x] += delta_x;
          node[self.y] += delta_y;
        });
        this.palette.render();
      }
    },
    mouse_up: function(event) {
      this.end_drag();
      this.state = 'UP';
      this.palette.render();
    },
    render: function() {
      this.clear();
      var self = this;
      this.palette.map_nodes(function(node) {
        self.context.fillStyle = node.active
          ? CONTROL_POINT_ACTIVE_COLOR : CONTROL_POINT_COLOR;
        self.context.fillRect(
          (node[self.x] * CANVAS_SIZE) - CONTROL_POINT_SIZE / 2,
          (node[self.y] * CANVAS_SIZE) - CONTROL_POINT_SIZE / 2,
          CONTROL_POINT_SIZE,
          CONTROL_POINT_SIZE
        );
      });
    },
  };
  object.construct();
  return object;
}

function Editor(parameters) {
  var object = {
    construct: function(parameters) {
      this.palette = new Palette();
      this.palette.add_node(new Node({ x: 0.25, y: 0.50, z: 0.75 }));
      this.palette.add_node(new Node({ x: 0.50, y: 0.25, z: 0.50 }));
      this.active_view = null;
      this.add_view({ x: 'x', y: 'y', canvas: 'xy_canvas' });
      this.add_view({ x: 'z', y: 'y', canvas: 'zy_canvas' });
      this.add_view({ x: 'x', y: 'z', canvas: 'xz_canvas' });
      var self = this;
      window.onkeydown = function(event) { self.key_down(event); };
    },
    add_view: function(parameters) {
      this.palette.add_view(new View({
        x: parameters.x,
        y: parameters.y,
        canvas: document.getElementById(parameters.canvas),
        editor: this,
        palette: this.palette,
      }));
    },
    cancel: function() {
      if (this.active_view !== null) {
        this.active_view.state = 'UP';
        this.active_view.end_drag();
      }
      return;
    },
    delete_selection: function() {
      this.palette.active_nodes().forEach(function(node) {
        self.palette.remove_node(node);
      });
    },
    grab_selection: function() {
      if (this.active_view === null)
        return;
      this.active_view.state = 'DOWN';
      this.active_view.begin_drag(
        this.active_view.last_cursor_x,
        this.active_view.last_cursor_y);
    },
    key_down: function(event) {
      var self = this;
      switch (event.keyCode) {
      case 13: // RET
        this.cancel();
        break;
      case 27: // ESC
        this.cancel();
        break;
      case 37: // Left
        this.nudge(-1, 0);
        break;
      case 38: // Up
        this.nudge(0, -1);
        break;
      case 39: // Right
        this.nudge(+1, 0);
        break;
      case 40: // Down
        this.nudge(0, +1);
        break;
      case 8: // BS
      case 46: // DEL
        this.delete_selection();
        break;
      case 65: // Select [a]ll
        this.select_all();
        break;
      case 71: // [G]rab selection
        this.grab_selection();
        break;
      }
      this.render();
    },
    nudge: function(x, y) {
      if (this.active_view === null)
        return;
      var self = this;
      this.palette.map_nodes(function(node) {
        node[self.active_view.x] += x * NUDGE_AMOUNT;
        node[self.active_view.y] += y * NUDGE_AMOUNT;
      });
    },
    render: function() {
      this.palette.map_views(function(view) { view.render(); });
    },
    select_all: function() {
      var active = this.palette.active_nodes().length !== this.palette.nodes.length;
      this.palette.map_nodes(function(node) {
        node.active = active;
      });
    },
  };
  object.construct(parameters);
  return object;
}

function Node(parameters) {
  var object = {
    x: parameters.x,
    y: parameters.y,
    z: parameters.z,
    active: false,
  };
  return object;
}

function Palette(context) {
  var object = {
    edges: [],
    nodes: [],
    views: [],
    active_nodes: function() {
      return this.nodes.filter(function(node) { return node.active; });
    },
    add_node: function(node) {
      this.nodes.push(node);
    },
    add_view: function(view) {
      this.views.push(view);
    },
    connect: function(node1, node2) {
      this.edges.push(new Edge(node1, node2));
    },
    disconnect: function(nodes) {
      this.edges = this.edges.filter(function(x) {
        // Keep edge if at least one of its endpoints is not in the set of nodes.
        return nodes.indexOf(x.start) === -1 || nodes.indexOf(x.end) === -1;
      });
    },
    map_nodes: function(f) {
      this.nodes.forEach(f);
    },
    map_views: function(f) {
      this.views.forEach(f);
    },
    render: function() {
      this.map_views(function(view) { view.render(); });
    },
    remove_node: function(node) {
      this.edges = this.edges.filter(function(x) {
        return x.start !== node && x.end !== node;
      });
      this.nodes = this.nodes.filter(function(x) {
        return x !== node;
      });
    },
  };
  return object;
}
