(function () {
    'use strict';
    
    /**
     * @typedef {LinesProperties} Properties of line
     * @type {Object}
     * @property {Number} maxHeight Position of highest line above baseline
     * @property {Number} minHeight Position of lowest line belowe baseline
     * @property {Number} height Difference between maxHeight and minHeight
     */

     /**
      * @typedef {GuideLine} single line in guidelines set
      * @type {Object}
      * @property {Number} position Height above or below baseline.
      * @property {Number} lineWidth Width of line
      * @property {String} style Name of line style (plain, dashed, dotted)
      * @property {String} color Hex color value of line
      */
     
    /**
     * @typedef {AngleLine} line at angle.
     * @type {Object}
     * @property {Number} angle angle of line.
     * @property {Number} lineWidth Width of line
     * @property {String} color Hex color value of line
     * @property {Number} distance distance between adjectent lines
     * @property {String} distanceType 'parallel' or 'horizontal'
     */

     /*
      *             slantLine: {
                angle: 5,
                lineWidth: .2,
                color: '#000000',
                distance: 2.5,
                distanceType: 'parallel'
            },
      */

    /**
     * For given lineset it calculates its height, minimal and maximal height.
     * 
     * @param {GuideLine[]} lines
     * @returns {LinesProperties}
     */
    function calculateLinesProperties(lines) {
        var result = {
            maxHeight: -Infinity,
            minHeight: +Infinity,
            height: 0
        };
        lines.forEach(function (line) {
            result.maxHeight = Math.max(line.position, result.maxHeight);
            result.minHeight = Math.min(line.position, result.minHeight);
        });
        result.height = result.maxHeight - result.minHeight;
        return result;
    }

    /**
     * Draws dashed horizontal lines.
     * 
     * @param {type} pdf jsPDF object
     * @param {Number} dx X coordinate of left point in line
     * @param {Number} dy Y coordinate of line
     * @param {Number} lenght Length of line
     * @param {Number} dash Length of dark segment
     * @param {Number} space Length of light segment
     */
    function drawDashedHorizontalLine(pdf, dx, dy, lenght, dash, space) {
        for (var x = 0; x < lenght; x = x + dash + space) {
            pdf.line(dx + x, dy, Math.min(dx + x + dash, dx + lenght), dy);
        }
    }

    function setLineColor(pdf, colorString, m) {
        var re = /^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/;
        if (colorString) {
            var matchArray = colorString.match(re);
            if (matchArray) {
                var red, green, blue;
                red = parseInt(matchArray[1], 16);
                green = parseInt(matchArray[2], 16);
                blue = parseInt(matchArray[3], 16);
                if (!m.data.currentColor || m.data.currentColor !== colorString) {
                    m.data.currentColor = colorString;
                    pdf.setDrawColor(red, green, blue);
                }
            }
        }
    }

    function verticalClipLine(x0, y0, x1, y1, minx, maxx) {
        var nx0, ny0, nx1, ny1, tmp, width, height;
        if (minx > maxx) {
            tmp = minx;
            minx = maxx;
            maxx = tmp;
        }
        if (x0 > x1) {
            tmp = x0;
            x0 = x1;
            x1 = tmp;
            tmp = y0;
            y0 = y1;
            y1 = tmp;
        }
        if (x1 < minx || x0 > maxx) {
            return null;
        }
        width = x1 - x0;
        height = y1 - y0;
        if (x0 < minx) {
            nx0 = minx;
            ny0 = y0 + height * ((minx - x0) / width);
        } else {
            nx0 = x0;
            ny0 = y0;
        }
        if (x1 > maxx) {
            nx1 = maxx;
            ny1 = y1 - height * ((x1 - maxx) / width);
        } else {
            nx1 = x1;
            ny1 = y1;
        }
        return [nx0, ny0, nx1, ny1];
    }

    function drawLines(pdf, m, dx, dy, width, skipFirst) {
        var slope, xoffset, i;

        /*
         * Draw nib angle lines.
         */
        if (m.nibAngleLine) {
            if (m.nibAngleLine.lineWidth) {
                pdf.setLineWidth(m.nibAngleLine.lineWidth);
            }
            setLineColor(pdf, m.nibAngleLine.color, m);
            slope = m.data.linesProperties.height / Math.tan(m.nibAngleLine.angle * Math.PI / 180.0);
            if (m.nibAngleLine.distanceType === 'parallel') {
                xoffset = m.nibAngleLine.distance / Math.sin(m.nibAngleLine.angle * Math.PI / 180.0);
            } else {
                xoffset = m.nibAngleLine.distance;
            }
            for (i = -Math.floor(slope / xoffset); i * xoffset < width; i++) {
                var l = verticalClipLine(dx + i * xoffset,
                        dy - m.data.linesProperties.minHeight,
                        dx + i * xoffset + slope,
                        dy - m.data.linesProperties.maxHeight,
                        dx, dx + width);
                if (l) {
                    pdf.line(l[0], l[1], l[2], l[3]);
                }
            }
        }

        /*
         * Draw horizontal lines (i.e. base line, waist line, ascenders 
         * and descenders lines.
         */
        m.lineModel.forEach(function (line) {
            var ypos = dy - line.position;
            if (!skipFirst || m.data.linesProperties.maxHeight !== line.position) {
                setLineColor(pdf, line.color, m);
                pdf.setLineWidth(line.lineWidth);
                if (line.style === 'dashed') {
                    drawDashedHorizontalLine(pdf, dx, ypos, width, 4 * line.lineWidth, 8 * line.lineWidth);
                } else if (line.style === 'dotted') {
                    drawDashedHorizontalLine(pdf, dx, ypos, width, line.lineWidth, 3 * line.lineWidth);
                } else {
                    pdf.line(dx, ypos, dx + width, ypos);
                }
            }
        });

        /*
         * Draw slant lines.
         */
        if (m.slantLine) {
            if (m.slantLine.lineWidth) {
                pdf.setLineWidth(m.slantLine.lineWidth);
            }
            setLineColor(pdf, m.slantLine.color, m);
            slope = m.data.linesProperties.height * Math.tan(m.slantLine.angle * Math.PI / 180.0);
            if (m.slantLine.distanceType === 'parallel') {
                xoffset = m.slantLine.distance / Math.cos(m.slantLine.angle * Math.PI / 180.0);
            } else {
                xoffset = m.slantLine.distance;
            }
            for (i = -Math.floor(slope / xoffset); i * xoffset < width; i++) {
                var t = verticalClipLine(dx + i * xoffset,
                        dy - m.data.linesProperties.minHeight,
                        dx + i * xoffset + slope,
                        dy - m.data.linesProperties.maxHeight,
                        dx, dx + width);
                if (t) {
                    pdf.line(t[0], t[1], t[2], t[3]);
                }
            }
        }
    }

    function drawColumn(pdf, column, m) {
        var columnHeight = column.bottom - column.top;
        var columnWidth = column.right - column.left;
        var numberOfLines = Math.floor(columnHeight / m.data.linesProperties.height);
        var interLineSpace = 0;
        if (numberOfLines > 1) {
            interLineSpace = (columnHeight - m.data.linesProperties.height * numberOfLines) / (numberOfLines - 1);
        }
        var firstLineWidth = 0;
        m.lineModel.forEach(function (line) {
            if (line.position === m.data.linesProperties.maxHeight) {
                firstLineWidth = line.lineWidth;
            }
        });
        var skipFirst = (interLineSpace <= firstLineWidth * 1.1);
        for (var i = 0; i < numberOfLines; i++) {
            drawLines(pdf, m, column.left,
                    column.top + i * (m.data.linesProperties.height + interLineSpace) + m.data.linesProperties.maxHeight, 
                    columnWidth, skipFirst && i !== 0);
        }
    }

    function drawPage(m) {
        var pdf = new jsPDF(m.page.layout, 'mm', m.page.format);
        m.data.linesProperties = calculateLinesProperties(m.lineModel);
        m.columns.forEach(function (column) {
            drawColumn(pdf, column, m);
        });
        return pdf;
    }

    function viewToModel(v) {
        var m = {
            page: {},
            lineModel: [],
            slantLine: {},
            nibAngleLine: {},
            columns: [],
            data: {}
        };

        // page:
        if (v.paperSize.value !== "other") {
            m.page.format = v.paperSize.value;
        } else {
            m.page.format = [v.paperSize.width, v.paperSize.height];
        }
        m.page.layout = v.paperOrientation.value;
        v.guideLines.forEach(function (line) {
            m.lineModel.push({
                position: line.position * v.nibWidth,
                lineWidth: line.lineWidth,
                color: line.color || '#000000',
                style: line.style
            });
        });
        if (v.slantGuide.enabled) {
            m.slantLine = {
                angle: v.slantGuide.angle,
                distance: v.slantGuide.distance * v.nibWidth,
                distanceType: v.slantGuide.distanceType.value,
                color: v.slantGuide.color || '#000000',
                lineWidth: v.slantGuide.lineWidth
            };
        } else {
            m.slantLine = false;
        }
        if (v.nibAngleGuide.enabled) {
            m.nibAngleLine = {
                angle: v.nibAngleGuide.angle,
                distance: v.nibAngleGuide.distance * v.nibWidth,
                distanceType: v.nibAngleGuide.distanceType.value,
                color: v.nibAngleGuide.color || '#000000',
                lineWidth: v.nibAngleGuide.lineWidth
            };
        } else {
            m.nibAngleLine = false;
        }
        var pageWidth, pageHeight;
        if (m.page.layout === 'P') {
            pageWidth = v.paperSize.width;
            pageHeight = v.paperSize.height;
        } else {
            pageWidth = v.paperSize.height;
            pageHeight = v.paperSize.width;
        }
        var columnWidth, columnHeight;
        columnHeight = pageHeight - v.page.topMargin - v.page.bottomMargin;
        columnWidth = (pageWidth - v.page.leftMargin - v.page.rightMargin - (v.page.columns - 1) * v.page.interColumn) / v.page.columns;
        for (var i = 0; i < v.page.columns; i++) {
            m.columns.push({
                top: v.page.topMargin,
                right: v.page.leftMargin + i * (columnWidth + v.page.interColumn) + columnWidth,
                bottom: v.page.topMargin + columnHeight,
                left: v.page.leftMargin + i * (columnWidth + v.page.interColumn)
            });

        }
        return m;
    }

    function mainController($scope, $document, $uibModal) {
        $scope.Math = Math;
        $scope.model = {};
        $scope.model.pageModel = {
//            page: {
//                layout: 'portrait',
//                format: 'a4'
//
//            },
//            lineModel: [
//                {
//                    position: 10,
//                    lineWidth: 0.3,
//                    color: '#000000'
//                },
//                {
//                    position: 7.5,
//                    lineWidth: 0.2,
//                    style: 'dashed',
//                    color: '#000000'
//                },
//                {
//                    position: 5,
//                    lineWidth: 0.3,
//                    color: '#000000'
//                },
//                {
//                    position: 2.5,
//                    lineWidth: 0.2,
//                    style: 'dashed',
//                    color: '#000000'
//                },
//                {
//                    position: 0,
//                    lineWidth: 0.5,
//                    color: '#000000'
//                },
//                {
//                    position: -2.5,
//                    lineWidth: 0.2,
//                    style: 'dashed',
//                    color: '#000000'
//                },
//                {
//                    position: -5,
//                    lineWidth: 0.3,
//                    color: '#000000'
//                }
//            ],
//            slantLine: {
//                angle: 5,
//                lineWidth: 0.2,
//                color: '#000000',
//                distance: 2.5,
//                distanceType: 'parallel'
//            },
//            nibAngleLine: {
//                angle: 45,
//                lineWidth: 0.2,
//                color: '#FF0000',
//                distance: 10,
//                distanceType: 'parallel'
//            },
//            columns: [
//                {
//                    top: 12.5,
//                    right: 197.5,
//                    bottom: 284.5,
//                    left: 12.5
//                }
//            ],
//            data: {
//            }
        };

        $scope.view = {
            paperSizes: [
                {value: 'a4', label: "A4", width: 210, height: 297, color: '#000000'},
                {value: 'a3', label: "A3", width: 297, height: 420, color: '#000000'},
                {value: 'letter', label: "Letter", width: 215.9, height: 279.4, color: '#000000'},
                {value: 'legal', label: "Legal", width: 215.9, height: 355.6, color: '#000000'},
                {value: 'other', label: "Other", width: null, height: null, color: '#000000'}
            ],
            paperOrientations: [
                {value: 'P', label: "Portrait"},
                {value: 'L', label: "Landscape"}
            ],
            distanceTypes: [
                {value: 'parallel', label: "Parallel"},
                {value: 'horizontal', label: "Horizontal"}
            ],
            paperSize: null,
            paperOrientation: null,
            nibWidth: 1.1,
            guideLines: [
                {position: 9, style: 'plain', lineWidth: 0.3},
                {position: 7.5, style: 'dashed', lineWidth: 0.2},
                {position: 5, style: 'plain', lineWidth: 0.3},
                {position: 2.5, style: 'dashed', lineWidth: 0.2},
                {position: 0, style: 'plain', lineWidth: 0.5},
                {position: -2.5, style: 'dashed', lineWidth: 0.2},
                {position: -4, style: 'plain', lineWidth: 0.3}
            ],
            page: {
                topMargin: 12.7,
                bottomMargin: 12.7,
                leftMargin: 12.7,
                rightMargin: 12.7,
                columns: 1,
                interColumn: 0
            },
            slantGuide: {
                enabled: true,
                angle: 3,
                lineWidth: 0.2,
                color: '#000000',
                distance: 2.5,
                distanceType: null
            },
            nibAngleGuide: {
                enabled: true,
                angle: 45,
                lineWidth: 0.2,
                color: '#FF0000',
                distance: 10,
                distanceType: null
            }
        };

        $scope.view.paperSize = $scope.view.paperSizes[0];
        $scope.view.paperOrientation = $scope.view.paperOrientations[0];
        $scope.view.slantGuide.distanceType = $scope.view.distanceTypes[0];
        $scope.view.nibAngleGuide.distanceType = $scope.view.distanceTypes[0];

        $scope.practice = function () {
            $scope.view.page.topMargin = 12.7;
            $scope.view.page.bottomMargin = 12.7;
            $scope.view.page.leftMargin = 12.7;
            $scope.view.page.rightMargin = 12.7;
            $scope.view.page.columns = 1;
            $scope.view.page.interColumn = 0;            
        };

        $scope.twoColumnsNinths = function () {
            var width, height;
            if ($scope.view.paperOrientation.value === 'P') {
                width = $scope.view.paperSize.width;
                height = $scope.view.paperSize.height;
            } else {
                width = $scope.view.paperSize.height;
                height = $scope.view.paperSize.width;
            }
            $scope.view.page.topMargin = +(height / 9).toFixed(1);
            $scope.view.page.bottomMargin = +(height / 4.5).toFixed(1);
            $scope.view.page.leftMargin = +(width / 9).toFixed(1);
            $scope.view.page.rightMargin = +(width / 9).toFixed(1);
            $scope.view.page.columns = 2;
            $scope.view.page.interColumn = +(width / 9).toFixed(1);
        };

        $scope.single = function () {
            var width, height;
            if ($scope.view.paperOrientation.value === 'P') {
                width = $scope.view.paperSize.width;
                height = $scope.view.paperSize.height;
            } else {
                width = $scope.view.paperSize.height;
                height = $scope.view.paperSize.width;
            }
            $scope.view.page.topMargin = +(height / 9).toFixed(1);
            $scope.view.page.bottomMargin = +(height / 4.5).toFixed(1);
            $scope.view.page.leftMargin = +(width / 6).toFixed(1);
            $scope.view.page.rightMargin = +(width / 6).toFixed(1);
            $scope.view.page.columns = 1;
            $scope.view.page.interColumn = +(width / 9).toFixed(1);
        };

        $scope.verso = function () {
            var width, height;
            if ($scope.view.paperOrientation.value === 'P') {
                width = $scope.view.paperSize.width;
                height = $scope.view.paperSize.height;
            } else {
                width = $scope.view.paperSize.height;
                height = $scope.view.paperSize.width;
            }
            $scope.view.page.topMargin = +(height / 9).toFixed(1);
            $scope.view.page.bottomMargin = +(height / 4.5).toFixed(1);
            $scope.view.page.leftMargin = +(width / 4.5).toFixed(1);
            $scope.view.page.rightMargin = +(width / 9).toFixed(1);
            $scope.view.page.columns = 1;
            $scope.view.page.interColumn = +(width / 9).toFixed(1);
        };

        $scope.recto = function () {
            var width, height;
            if ($scope.view.paperOrientation.value === 'P') {
                width = $scope.view.paperSize.width;
                height = $scope.view.paperSize.height;
            } else {
                width = $scope.view.paperSize.height;
                height = $scope.view.paperSize.width;
            }
            $scope.view.page.topMargin = +(height / 9).toFixed(1);
            $scope.view.page.bottomMargin = +(height / 4.5).toFixed(1);
            $scope.view.page.leftMargin = +(width / 9).toFixed(1);
            $scope.view.page.rightMargin = +(width / 4.5).toFixed(1);
            $scope.view.page.columns = 1;
            $scope.view.page.interColumn = +(width / 9).toFixed(1);
        };

        $scope.editLine = function (line) {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'line-edit.html',
                controller: 'lineEditModalController',
                size: 'lg',
                resolve: {
                    line: function () {
                        return angular.copy(line);
                    },
                    newLine: function () {
                        return false;
                    }
                }
            });
            modalInstance.result.then(function (editedLine) {
                angular.copy(editedLine, line);
            }, function () {

            });
        };

        $scope.addLine = function () {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'line-edit.html',
                controller: 'lineEditModalController',
                size: 'lg',
                resolve: {
                    line: function () {
                        return {position: 1, style: 'plain', lineWidth: 0.2, color: '#000000'};
                    },
                    newLine: function () {
                        return true;
                    }
                }
            });
            modalInstance.result.then(function (editedLine) {
                $scope.view.guideLines.push(editedLine);
            }, function () {

            });
        };

        $scope.removeLine = function (line) {
            var idx = $scope.view.guideLines.indexOf(line);
            if (idx !== -1) {
                $scope.view.guideLines.splice(idx,1);
            }
        };

        $scope.draw = function () {
            $scope.model.pageModel = viewToModel($scope.view);
            var doc = drawPage($scope.model.pageModel);
            $document.find("#pdfPreview").attr("src", doc.output('bloburi'));
        };
    }

    function lineEditModalController($scope, $uibModalInstance, line, newLine) {
        $scope.styles = [{value: 'plain', label: 'Plain'}, {value: 'dashed', label: 'Dashed'}, {value: 'dotted', label: 'Dotted'}];
        $scope.line = line;
        $scope.v = {new : newLine};

        $scope.ok = function () {
            $uibModalInstance.close($scope.line);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }

    angular.module('liniuszek', ['ui.bootstrap', 'colorpicker.module'])
            .controller('mainController', mainController)
            .controller('lineEditModalController', lineEditModalController);
})();