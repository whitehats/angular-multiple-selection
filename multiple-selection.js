/**
 * Angular JS multiple-selection module
 * @author Maksym Pomazan
 * @version 0.0.3
 */
function getSelectableElements(element) {
    var out = [];
    var childs = element.children();
    for (var i = 0; i < childs.length; i++) {
        var child = angular.element(childs[i]);
        if (child.scope().isSelectable) {
            out.push(child);
        } else {
            if (child.scope().$id!=element.scope().$id && child.scope().isSelectableZone === true) {

            } else {
                out = out.concat(getSelectableElements(child));
            }
        }
    }
    return out;
}

function offset(element) {
    var documentElem,
        box = {
            top: 0,
            left: 0
        },
        doc = element && element.ownerDocument;
    documentElem = doc.documentElement;

    if (typeof element.getBoundingClientRect !== undefined) {
        box = element.getBoundingClientRect();
    }

    return {
        top: box.top + (window.pageYOffset || documentElem.scrollTop) - (documentElem.clientTop || 0),
        left: box.left + (window.pageXOffset || documentElem.scrollLeft) - (documentElem.clientLeft || 0)
    };
}
angular.module('multipleSelection', [])
    .directive('multipleSelectionItem', [function() {
        return {
            scope: true,
            restrict: 'A',
            link: function(scope, element, iAttrs, controller) {

                scope.isSelectable = true;
                scope.isSelecting = false;
                scope.isSelected = false;
                scope.onSelect(iAttrs.id, false);

                element.on('mousedown', function(event) {
                    if (element.scope().isSelected) {
                        if (event.ctrlKey) {
                            element.scope().isSelected = false;
                            element.scope().onSelect(element.attr('id'), false);
                            element.scope().$apply();
                        }
                    } else {
                        if (!event.ctrlKey) {
                            var childs = getSelectableElements(element.parent());
                            for (var i = 0; i < childs.length; i++) {
                                var childScope = childs[i].scope();
                                if (childScope.isSelectable) {
                                    if (childScope.isSelecting === true || childScope.isSelected === true) {
                                        childScope.isSelecting = false;
                                        childScope.isSelected = false;
                                        childScope.onSelect(childs[i].attr('id'), false);
                                        childScope.$apply();
                                    }
                                }
                            }
                        }
                        if (element.scope().selectOnClick) {
                            element.scope().isSelected = true;
                            element.scope().onSelect(element.attr('id'), true);
                            element.scope().$apply();
                        }

                    }
                    event.stopPropagation();
                });
            }
        };
    }])
    .directive('multipleSelectionZone', ['$document', function($document) {
        return {
            scope: true,
            restrict: 'A',
            link: function(scope, element, iAttrs, controller) {

                scope.isSelectableZone = true;

                var jqElement = $(element);

                var getCoordinates = function(event) {
                    var offset = jqElement.offset();
                    return {
                        x: event.pageX,
                        y: event.pageY
                    };
                }

                var startX = 0,
                    startY = 0;
                var helper;

                /**
                 * Check that 2 boxes hitting
                 * @param  {Object} box1
                 * @param  {Object} box2
                 * @return {Boolean} is hitting
                 */
                function checkElementHitting(box1, box2) {
                    return (box2.beginX <= box1.beginX && box1.beginX <= box2.endX || box1.beginX <= box2.beginX && box2.beginX <= box1.endX) &&
                        (box2.beginY <= box1.beginY && box1.beginY <= box2.endY || box1.beginY <= box2.beginY && box2.beginY <= box1.endY);
                }

                /**
                 * Transform box to object to:
                 *  beginX is always be less then endX
                 *  beginY is always be less then endY
                 * @param  {Number} startX
                 * @param  {Number} startY
                 * @param  {Number} endX
                 * @param  {Number} endY
                 * @return {Object} result Transformed object
                 */
                function transformBox(startX, startY, endX, endY) {

                    var result = {};

                    if (startX > endX) {
                        result.beginX = endX;
                        result.endX = startX;
                    } else {
                        result.beginX = startX;
                        result.endX = endX;
                    }
                    if (startY > endY) {
                        result.beginY = endY;
                        result.endY = startY;
                    } else {
                        result.beginY = startY;
                        result.endY = endY;
                    }
                    return result;
                }

                /**
                 * Method move selection helper
                 * @param  {Element} hepler
                 * @param  {Number} startX
                 * @param  {Number} startY
                 * @param  {Number} endX
                 * @param  {Number} endY
                 */
                function moveSelectionHelper(hepler, startX, startY, endX, endY) {

                    var box = transformBox(startX, startY, endX, endY);

                    helper.css({
                        "top": box.beginY + "px",
                        "left": box.beginX + "px",
                        "width": (box.endX - box.beginX) + "px",
                        "height": (box.endY - box.beginY) + "px"
                    });
                }


                /**
                 * Method on Mouse Move
                 * @param  {Event} @event
                 */
                function mousemove(event) {
                    // Prevent default dragging of selected content
                    event.preventDefault();
                    // Move helper
                    var coords = getCoordinates(event);
                    moveSelectionHelper(helper, startX, startY, coords.x, coords.y);
                    // Check items is selecting
                    var childs = getSelectableElements(element);
                    for (var i = 0; i < childs.length; i++) {
                        var childScope = childs[i].scope(),
                            off = offset(childs[i][0]);
                        if (checkElementHitting(transformBox(off.left, off.top, off.left + childs[i].prop('offsetWidth'), off.top + childs[i].prop('offsetHeight')), transformBox(startX, startY, coords.x, coords.y))) {
                            if (childScope.isSelecting === false) {
                                childScope.isSelecting = true;
                                childScope.$apply();
                            }
                        } else {
                            if (childScope.isSelecting === true) {
                                childScope.isSelecting = false;
                                childScope.$apply();
                            }
                        }
                    }
                }



                /**
                 * Event on Mouse up
                 * @param  {Event} event
                 */
                function mouseup(event) {
                    // Prevent default dragging of selected content
                    event.preventDefault();
                    // Remove helper
                    helper.remove();
                    // Change all selecting items to selected
                    var childs = getSelectableElements(element);

                    for (var i = 0; i < childs.length; i++) {
                        var childScope = childs[i].scope();
                        if (childScope.isSelecting === true) {
                            childScope.isSelecting = false;

                            childScope.isSelected = event.ctrlKey ? !childScope.isSelected : true;
                            childScope.onSelect(childs[i].attr('id'), childScope.isSelected);
                            childScope.$apply();
                        } else {
                            var coords = getCoordinates(event),
                                off = offset(childs[i][0]);
                            if (checkElementHitting(transformBox(off.left, off.top, off.left + childs[i].prop('offsetWidth'), off.top + childs[i].prop('offsetHeight')), transformBox(coords.x, coords.y, coords.x, coords.y))) {
                                if (childScope.isSelected === false) {
                                    childScope.isSelected = true;
                                    childScope.onSelect(childs[i].attr('id'), true);
                                    childScope.$apply();
                                }
                            }
                        }
                    }
                    // Remove listeners
                    $document.off('mousemove', mousemove);
                    $document.off('mouseup', mouseup);
                }

                element.on('mousedown', function(event) {
                    if (event.button !== 0) return;
                    // Prevent default dragging of selected content
                    event.preventDefault();
                    if (!event.ctrlKey) {
                        // Skip all selected or selecting items
                        var childs = getSelectableElements(element);
                        for (var i = 0; i < childs.length; i++) {
                            var childScope = childs[i].scope();
                            if (childScope.isSelecting === true || childScope.isSelected === true) {
                                childScope.isSelecting = false;
                                childScope.isSelected = false;
                                childScope.onSelect(childs[i].attr('id'), false);
                                childScope.$apply();
                            }
                        }
                    }
                    // Update start coordinates
                    var coords = getCoordinates(event);
                    startX = coords.x;
                    startY = coords.y;

                    // Create helper
                    helper = angular
                        .element("<div></div>")
                        .addClass('select-helper');

                    moveSelectionHelper(helper, 0, 0, 0, 0);

                    $document.find('body').eq(0).append(helper);
                    // Attach events
                    $document.on('mousemove', mousemove);
                    $document.on('mouseup', mouseup);
                });
            }
        };
    }]);

