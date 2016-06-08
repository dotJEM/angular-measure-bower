(function () {
    var zoom = angular.module('dotjem.angular.measure', ['dotjem.angular.events']);
    function Point(x, y) {
        this.x = x;
        this.y = y;
        this.add = function (x, y) {
            if (typeof x === 'number') {
                return new Point(this.x + x, this.y + y);
            }
            else {
                this.add(x.x, x.y);
            }
        };
    }
    function Line(start, end) {
        this.start = start;
        this.end = end;
        this.visible = true;
        this.length = Math.sqrt((end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y));
        this.moveEnd = function (x, y) {
            return new Line(start, new Point(x, y));
        };
        this.flip = function () {
            return new Line(end, start);
        };
    }
    function MeasureModel() {
        var self = this;
        self.lines = [];
        self.toggle = function (x, y) {
            if (self.current)
                self.commit(x, y);
            else
                self.start(x, y);
        };
        self.start = function (x, y) {
            self.current = new Line(new Point(x, y), new Point(x, y));
        };
        self.move = function (x, y) {
            if (!self.current)
                return;
            self.current = self.current.moveEnd(x, y);
        };
        self.commit = function (x, y) {
            self.lines.push(self.current.moveEnd(x, y));
            delete self.current;
        };
        self.all = function () {
            var all = self.lines.slice();
            if (self.current) {
                all.push(self.current);
            }
            return all;
        };
    }
    function Painter(model, canvas) {
        var self = this;
        var ctx = canvas.getContext("2d");
        self.paint = function () {
            var all = model.all();
            if (all.length < 0) {
                return self;
            }
            return all.reduce(function (self, line) {
                return self.paintLine(line);
            }, self.clear());
        };
        self.paintTest = function () {
            ctx.beginPath();
            ctx.rect(20, 20, 40, 40);
            ctx.fill();
        };
        self.paintLine = function (line) {
            if (!line.visible) {
                return self;
            }
            ctx.beginPath();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            if (line.length > 0) {
                self.paintLineStop(line);
                self.paintLineStop(line.flip());
            }
            self.stroke().paintLabel(line.end.add(15, 0), line.length.toFixed(1) + "m");
            return self;
        };
        self.paintLineStop = function (line) {
            var dx = line.start.x - line.end.x;
            var dy = line.start.y - line.end.y;
            ctx.moveTo(line.start.x - 5 * dy / line.length, line.start.y + 5 * dx / line.length);
            ctx.lineTo(line.start.x + 5 * dy / line.length, line.start.y - 5 * dx / line.length);
            return self;
        };
        self.paintLabel = function (point, str) {
            ctx.font = '11px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = "#0066ff";
            ctx.beginPath();
            var tw = ctx.measureText(str).width;
            var bound = 8;
            var topLeft = new Point(point.x, point.y - bound);
            var topRight = new Point(point.x + tw, point.y - bound);
            var bottomLeft = new Point(point.x, point.y + bound);
            var bottomRight = new Point(point.x + tw, point.y + bound);
            var leftTop = new Point(point.x - bound, point.y);
            var leftBottom = new Point(point.x - bound, point.y);
            var rightTop = new Point(point.x + bound + tw, point.y);
            var rightBottom = new Point(point.x + bound + tw, point.y);
            var lt = new Point(point.x - bound, point.y - bound);
            var lb = new Point(point.x - bound, point.y + bound);
            var rt = new Point(point.x + bound + tw, point.y - bound);
            var rb = new Point(point.x + bound + tw, point.y + bound);
            self.moveTo(topLeft);
            self.lineTo(topRight);
            self.quadraticCurveTo(rt, rightTop);
            self.lineTo(rightBottom);
            self.quadraticCurveTo(rb, bottomRight);
            self.lineTo(bottomLeft);
            self.quadraticCurveTo(lb, leftBottom);
            self.lineTo(leftTop);
            self.quadraticCurveTo(lt, topLeft);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(str, topLeft.x + bound + 6, topLeft.y + bound);
        };
        self.quadraticCurveTo = function (jump, to) {
            ctx.quadraticCurveTo(jump.x, jump.y, to.x, to.y);
            return self;
        };
        self.lineTo = function (point) {
            ctx.lineTo(point.x, point.y);
            return self;
        };
        self.moveTo = function (point) {
            ctx.moveTo(point.x, point.y);
            return self;
        };
        self.stroke = function () {
            ctx.stroke();
            return self;
        };
        self.clear = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return self;
        };
    }
    zoom.component('dxMeasure', {
        template: '<canvas class="dx-overlay"' +
            '     ng-mousemove="$ctrl.onMouseMove($event)"' +
            '     ng-mousedown="$ctrl.onMouseDown($event)"></canvas>' +
            '<div class="dx-m-box" ng-style="$ctrl.boxStyles" ng-if="$ctrl.show"></div>' +
            '<div><img ng-src="{{ $ctrl.image }}" dx-image-ready="$ctrl.imageReady($event)" style="width: 100%;"></div>',
        bindings: {
            image: '@',
            enabled: '='
        },
        controller: function ($element, $timeout, $scope) {
            var self = this;
            //TODO: replace lookup with child directive reporting in the canvas.
            var canvas = $element.children('canvas').first()[0];
            var model = new MeasureModel();
            var painter = new Painter(model, canvas);
            self.imageReady = function (evt) {
                var img = evt.element[0];
                canvas.width = img.clientWidth;
                canvas.height = img.clientHeight;
            };
            self.onMouseMove = function (e) {
                model.move(e.offsetX, e.offsetY);
                if (model.current) {
                    painter.paint();
                }
            };
            self.onMouseDown = function (e) {
                model.toggle(e.offsetX, e.offsetY);
                painter.paint();
            };
        }
    });
})();
