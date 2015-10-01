//
//
// UI Component that manages a (large) scrollable table by reusing row <div> nodes
//  allows for rows to be different heights and dynamic sizing
//
// a la: https://github.com/NeXTs/Clusterize.js, https://github.com/facebook/fixed-data-table
//
//  |       | <- total table area, rows exist in data, but not on dom
//  |xxxxxxx| <- buffer of rows on dom, but not visible
//  |-------|
//  |#######| <- visible screen area
//  |#######|
//  |-------|
//  |xxxxxxx|
//  |       |

// Required params:
//  el: container element to render to
//  data: array of objects containing row data
//  buildRow: called when first building table rows (return node)
//  updateRow: called when switching row data into a dom node

//
"use strict";

//
var _sortedIndex = require('lodash.sortedindex');

//
var defaults = {
  heightFn: function() { return 10; },
  availableNodes: 100
};

//
var ScrollableTable = function(opts) {
  if(!opts.el) { throw new Error("Need to pass `el` into ScrollableTable."); }
  if(!opts.data) { throw new Error("Need to pass `data` into ScrollableTable."); }
  if(!opts.buildRow) { throw new Error("Need to pass `buildRow` into ScrollableTable."); }
  if(!opts.updateRow) { throw new Error("Need to pass `updateRow` into ScrollableTable."); }

  // inherit from options or defaults
  for(var key in defaults) { this[key] = defaults[key]; }
  for(var key in opts) { this[key] = opts[key]; }

  this.rowsWithNodes = []; // indices of rows w/ active dom nodes
  this.tops = []; // css `top` values for each data row - in seperate array for faster _sortedIndex call
  this.el.className = this.el.className + ' sts-container';
  this.isUpdating = false;
  this.reset();
};

//
//

// Reset or init dom elements and scrolling state
ScrollableTable.prototype.reset = function() {
  this.yPosition = 0;
  this.setHeights();

  // clear nodes and rebuild using `buildRow`
  while (this.el.firstChild) { this.el.remove(this.el.firstChild); }

  // clear all references between data and nodes
  for(var ndx = 0; ndx < this.data.length; ndx++) { this.data[ndx].__node = null; }

  // create new nodes and position absolutely
  this.rowsWithNodes = [];
  var nodesToBuild = Math.min(this.availableNodes, this.data.length);
  for(ndx = 0; ndx < nodesToBuild; ndx++) {
    var newRow = this.buildRow(this.data[ndx]);
    newRow.style.top = this.data[ndx].__top + 'px';
    newRow.className = newRow.className + ' sts-row';
    this.el.appendChild(newRow);
    this.rowsWithNodes.push(ndx);
    this.data[ndx].__node = newRow;
  }

  // add node to stick to bottom to preserve height
  this.bottomEl = document.createElement('div');
  this.bottomEl.className = 'sts-bottom-anchor';
  this.bottomEl.style.top = this.totalHeight + 'px';
  this.el.appendChild(this.bottomEl);

  // setup scroll handling
  this.el.addEventListener('scroll', this.updateVisibleRows.bind(this));
};

//
//

//
ScrollableTable.prototype.updateVisibleRows = function(evt) {
  if(this.isUpdating) { return; }
  this.isUpdating = true;

  // var start = performance.now();
  var screenMidpoint = this.el.scrollTop + (this.el.clientHeight / 2),
      midNdx = _sortedIndex(this.tops, screenMidpoint),
      freeSearchNdx = 0,
      fillStart = Math.max(0, midNdx - Math.ceil(this.availableNodes / 2)),
      fillEnd = Math.min(this.data.length, midNdx + Math.ceil(this.availableNodes / 2));
  if(this.lastMidNdx === midNdx) { this.isUpdating = false; return; }
  this.lastMidNdx = midNdx;
  for(var rowNdx = fillStart; rowNdx < fillEnd; rowNdx++) {
    if(!this.data[rowNdx].__node) {
      while(this.rowsWithNodes[freeSearchNdx] > fillStart &&
            this.rowsWithNodes[freeSearchNdx] < fillEnd) { freeSearchNdx++; }
      this.data[rowNdx].__node = this.data[this.rowsWithNodes[freeSearchNdx]].__node;
      this.updateRow(this.data[rowNdx], this.data[rowNdx].__node);
      this.data[rowNdx].__node.style.top = this.data[rowNdx].__top + 'px';
      this.data[this.rowsWithNodes[freeSearchNdx]].__node = null;
      this.rowsWithNodes[freeSearchNdx] = rowNdx;
      freeSearchNdx++;
    }
  }
  this.isUpdating = false;
  // console.log((performance.now() - start) + ' ms');
};

//
//

// Set `top` value in data for each row
ScrollableTable.prototype.setHeights = function() {
  this.totalHeight = 0;
  this.tops = [];
  for(var ndx = 0; ndx < this.data.length; ndx++) {
    this.data[ndx].__top = this.totalHeight;
    this.tops.push(this.totalHeight);
    this.totalHeight += this.heightFn(this.data[ndx]);
  }
  return this.totalHeight;
};

// Update data and adjust heights, rebuild nodes
ScrollableTable.prototype.updateData = function(newData) {
  var oldNodes = [];
  var ndx, newNode;
  // var start = performance.now();

  if(this.isUpdating) { return; }
  this.isUpdating = true;

  // remove nodes if newData is smaller
  // potential perf update; keep this.hiddenNodes and reuse/reattach instead of rebuilding
  if(newData.length < this.rowsWithNodes.length) {
    for(ndx = this.rowsWithNodes.length-1; ndx >= newData.length; ndx--) {
      var node = this.data[this.rowsWithNodes[ndx]].__node;
      node.parentNode.removeChild(node);
      this.data[this.rowsWithNodes[ndx]].__node = null;
      this.rowsWithNodes.pop();
    }
  }

  for(ndx = 0; ndx < Math.min(this.rowsWithNodes.length, newData.length); ndx++) {
    oldNodes.push(this.data[this.rowsWithNodes[ndx]].__node);
    // this.data[this.rowsWithNodes[ndx]].__node = null;
    // this.rowsWithNodes[ndx] = ndx;
  }

  // build new nodes if neccesary
  if(oldNodes.length < newData.length &&
     oldNodes.length < this.availableNodes) {
    for(ndx = oldNodes.length; ndx < Math.min(this.availableNodes, newData.length); ndx++) {
      newNode = this.buildRow(newData[ndx]);
      newNode.className = newNode.className + ' sts-row';
      this.el.appendChild(newNode);
      oldNodes.push(newNode);
      this.rowsWithNodes.push(ndx);
    }
  }

  this.data = newData;
  this.setHeights();
  for(ndx = 0; ndx < oldNodes.length; ndx++) {
    //this.data[ndx].__node = oldNodes[ndx];
    this.data[this.rowsWithNodes[ndx]].__node = oldNodes[ndx];
    this.updateRow(this.data[this.rowsWithNodes[ndx]], this.data[this.rowsWithNodes[ndx]].__node);
    this.data[this.rowsWithNodes[ndx]].__node.style.top = this.data[this.rowsWithNodes[ndx]].__top + 'px';
  }
  this.bottomEl.style.top = this.totalHeight + 'px';
  this.isUpdating = false;
  // this.updateVisibleRows();
  // console.log((performance.now() - start) + ' ms (update)');
};

//
module.exports = ScrollableTable;
