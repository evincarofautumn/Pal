var BACKGROUND_COLOR = 'rgb(40, 40, 50)';
var CANVAS_SIZE = 300;
var CONTROL_POINT_ACTIVE_COLOR = 'rgb(242, 242, 255)';
var CONTROL_POINT_COLOR = 'rgb(0, 0, 40)';
var CONTROL_POINT_SIZE = 10;
var CONTROL_TANGENT_WIDTH = 0.5;
var CONTROL_TANGENT_COLOR = 'rgba(0, 0, 40, 50)';
var DOUBLE_CLICK_THRESHOLD = 400;
var EDGE_COLOR = 'rgb(255, 255, 0)';
var EDGE_SHADOW_COLOR = 'rgb(0, 0, 0)';
var EDGE_WIDTH = 2;
var NUDGE_AMOUNT = 1/20;
var SWATCH_ACTIVE_COLOR = 'rgb(255, 255, 255)';
var SWATCH_COLOR = 'rgb(0, 0, 0)';
var SWATCH_SIZE = 20;

function View(parameters) {
  var object = {
    background: parameters.background,
    canvas: parameters.canvas,
    context: parameters.canvas.getContext('2d'),
    editor: parameters.editor,
    palette: parameters.palette,
    x: parameters.x,
    y: parameters.y,
    z: parameters.z,
    // Whether higher z-values are farther; default nearer.
    negate_z: parameters.negate_z === undefined ? false : parameters.negate_z,
    selected_nodes: [],
    drag_origin_x: 0,
    drag_origin_y: 0,
    dragging: false,
    last_click: 0,
    last_cursor_x: 0,
    last_cursor_y: 0,
    add_node: function(view_x, view_y) {
      var color = this.view_to_color(view_x, view_y, 0.5);
      this.palette.add_node(
        new Node({ x: color[0], y: color[1], z: color[2] }));
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
        var left = node[self.x] * CANVAS_SIZE - SWATCH_SIZE / 2;
        var top = node[self.y] * CANVAS_SIZE - SWATCH_SIZE / 2;
        var right = left + SWATCH_SIZE + 2.0;
        var bottom = top + SWATCH_SIZE + 2.0;
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
          self.palette.map_edges(function(edge) {
            if (edge.start === node) {
              if (!edge.control1.active) {
                edge.control1[self.x] += delta_x;
                edge.control1[self.y] += delta_y;
              }
            } else if (edge.end === node) {
              if (!edge.control2.active) {
                edge.control2[self.x] += delta_x;
                edge.control2[self.y] += delta_y;
              }
            }
          });
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
      this.render_background();
      var self = this;
      this.palette.map_edges(function(edge) {
        self.context.lineWidth = EDGE_WIDTH;
        self.context.strokeStyle = EDGE_COLOR;
        self.context.beginPath();
        self.context.moveTo(
          edge.start[self.x] * CANVAS_SIZE,
          edge.start[self.y] * CANVAS_SIZE);
        self.context.bezierCurveTo(
          edge.control1[self.x] * CANVAS_SIZE,
          edge.control1[self.y] * CANVAS_SIZE,
          edge.control2[self.x] * CANVAS_SIZE,
          edge.control2[self.y] * CANVAS_SIZE,
          edge.end[self.x] * CANVAS_SIZE,
          edge.end[self.y] * CANVAS_SIZE);
        self.context.stroke();
        self.context.lineWidth = CONTROL_TANGENT_WIDTH;
        self.context.strokeStyle = CONTROL_TANGENT_COLOR;
        self.context.beginPath();
        self.context.moveTo(
          edge.start[self.x] * CANVAS_SIZE,
          edge.start[self.y] * CANVAS_SIZE);
        self.context.lineTo(
          edge.control1[self.x] * CANVAS_SIZE,
          edge.control1[self.y] * CANVAS_SIZE);
        self.context.stroke();
        self.context.beginPath();
        self.context.moveTo(
          edge.end[self.x] * CANVAS_SIZE,
          edge.end[self.y] * CANVAS_SIZE);
        self.context.lineTo(
          edge.control2[self.x] * CANVAS_SIZE,
          edge.control2[self.y] * CANVAS_SIZE);
        self.context.stroke();
      });
      this.palette.map_nodes_by(this.z, function(node) {
        var scale = ((self.negate_z ? 1 - node[self.z] : node[self.z]) + 1) / 2;
        var x = Math.floor(
          node[self.x] * CANVAS_SIZE - scale * SWATCH_SIZE / 2) + 0.5;
        var y = Math.floor(
          node[self.y] * CANVAS_SIZE - scale * SWATCH_SIZE / 2) + 0.5;
        if (node.control) {
          self.context.fillStyle = node.active
            ? CONTROL_POINT_ACTIVE_COLOR : CONTROL_POINT_COLOR;
          self.context.beginPath();
          self.context.arc(
            Math.floor(
              node[self.x] * CANVAS_SIZE) + 0.5,
            Math.floor(
              node[self.y] * CANVAS_SIZE) + 0.5,
            scale * CONTROL_POINT_SIZE / 2,
            0,
            2 * Math.PI);
          self.context.fill();
        } else {
          self.context.fillStyle = self.background(node.x, node.y, node.z);
          self.context.fillRect(x, y, scale * SWATCH_SIZE, scale * SWATCH_SIZE);
          self.context.lineWidth = 1;
          self.context.strokeStyle = SWATCH_ACTIVE_COLOR;
          self.context.strokeRect(x, y, scale * SWATCH_SIZE, scale * SWATCH_SIZE);
          self.context.strokeStyle = node.active
            ? SWATCH_ACTIVE_COLOR : SWATCH_COLOR;
          self.context.strokeRect(
            x - 1, y - 1, scale * SWATCH_SIZE + 2, scale * SWATCH_SIZE + 2);
        }
      });
    },
    render_background: function() {
      var CELL_SIZE = 8;
      for (var view_x = 0; view_x < CANVAS_SIZE; view_x += CELL_SIZE) {
        for (var view_y = 0; view_y < CANVAS_SIZE; view_y += CELL_SIZE) {
          var color = this.view_to_color(
            view_x / CANVAS_SIZE, view_y / CANVAS_SIZE, 0.5);
          this.context.fillStyle = this.background(
            color[0], color[1], color[2]);
          this.context.fillRect(view_x, view_y, CELL_SIZE + 1, CELL_SIZE + 1);
        }
      }
    },
    view_to_color: function(view_x, view_y, default_value) {
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
      if (x === undefined) {
        x = default_value;
      } else if (y === undefined) {
        y = default_value;
      } else if (z === undefined) {
        z = default_value;
      }
      return [x, y, z];
    }
  };
  object.construct();
  return object;
}

function hsl_background(x, y, z) {
  return [
    'hsl(',
    (x * 360).toString(),
    ',',
    (y * 100).toString(),
    '%,',
    (z * 100).toString(),
    '%)',
  ].join('');
}

function Editor(parameters) {
  var object = {
    construct: function(parameters) {
      this.palette = new Palette();
      this.palette.add_node(new Node({ x: 0.25, y: 0.50, z: 0.75 }));
      this.palette.add_node(new Node({ x: 0.50, y: 0.25, z: 0.50 }));
      this.active_view = null;
      this.add_view({
        x: 'x', y: 'y', z: 'z', negate_z: true,
        background: hsl_background, canvas: 'xy_canvas' });
      this.add_view({
        x: 'z', y: 'y', z: 'x',
        background: hsl_background, canvas: 'zy_canvas' });
      this.add_view({
        x: 'x', y: 'z', z: 'y',
        background: hsl_background, canvas: 'xz_canvas' });
      var self = this;
      window.onkeydown = function(event) { self.key_down(event); };
    },
    add_view: function(parameters) {
      this.palette.add_view(new View({
        x: parameters.x,
        y: parameters.y,
        z: parameters.z,
        negate_z: parameters.negate_z,
        background: parameters.background,
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
      var self = this;
      this.palette.active_nodes().forEach(function(node) {
        self.palette.remove_node(node);
      });
    },
    disconnect_nodes: function() {
      this.palette.disconnect(this.palette.active_nodes());
    },
    grab_selection: function() {
      if (this.active_view === null)
        return;
      this.active_view.state = 'DOWN';
      this.active_view.begin_drag(
        this.active_view.last_cursor_x,
        this.active_view.last_cursor_y);
    },
    join_nodes: function() {
      var active_nodes = this.palette.active_nodes();
      var self = this;
      active_nodes.forEach(function(node1) {
        active_nodes.forEach(function(node2) {
          self.palette.connect(node1, node2);
        });
      });
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
      case 65: // A
        this.select_all();
        break;
      case 71: // G
        this.grab_selection();
        break;
      case 74: // J
        this.join_nodes();
        break;
      case 88: // X
        this.disconnect_nodes();
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
      if (this.active_view !== null && this.active_view.state === 'DOWN')
        return;
      var active
        = this.palette.active_nodes().length !== this.palette.node_count();
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
    control: parameters.control === undefined ? false : parameters.control,
  };
  return object;
}

function Edge(node1, node2) {
  var object = {
    start: node1,
    control1: new Node({
      x: node1.x * 2 / 3 + node2.x * 1 / 3,
      y: node1.y * 2 / 3 + node2.y * 1 / 3,
      z: node1.z * 2 / 3 + node2.z * 1 / 3,
      control: true,
    }),
    control2: new Node({
      x: node1.x * 1 / 3 + node2.x * 2 / 3,
      y: node1.y * 1 / 3 + node2.y * 2 / 3,
      z: node1.z * 1 / 3 + node2.z * 2 / 3,
      control: true,
    }),
    end: node2,
  };
  return object;
}

function Palette(context) {
  var object = {
    edges: [],
    nodes: [],
    views: [],
    active_nodes: function() {
      var active_nodes = [];
      this.map_nodes(function(node) {
        if (node.active) active_nodes.push(node);
      });
      return active_nodes;
    },
    add_node: function(node) {
      this.nodes.push(node);
    },
    add_view: function(view) {
      this.views.push(view);
    },
    connect: function(node1, node2) {
      if (!this.connected(node1, node2))
        this.edges.push(new Edge(node1, node2));
    },
    connected: function(node1, node2) {
      if (node1 === node2)
        return true;
      for (var i = 0; i < this.edges.length; ++i) {
        var edge = this.edges[i];
        if (edge.start === node1 && edge.end === node2
          || edge.start === node2 && edge.end === node1)
          return true;
      }
      return false;
    },
    disconnect: function(nodes) {
      this.edges = this.edges.filter(function(x) {
        // Keep edge if at least one of its endpoints is not in the set of nodes.
        return nodes.indexOf(x.start) === -1 || nodes.indexOf(x.end) === -1;
      });
    },
    map_edges: function(f) {
      this.edges.forEach(f);
    },
    map_nodes: function(f) {
      this.nodes.forEach(f);
      this.edges.forEach(function(edge) {
        f(edge.control1);
        f(edge.control2);
      });
    },
    map_nodes_by: function(property, f) {
      this.nodes.sort(function(a, b) { return a[property] - b[property]; });
      this.map_nodes(f);
    },
    map_views: function(f) {
      this.views.forEach(f);
    },
    node_count: function() {
      return this.nodes.length + this.edges.length * 2;
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
