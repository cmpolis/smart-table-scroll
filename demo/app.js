//
//
// Demo of SmartTableScroll

var table = window.table = new SmartTableScroll({

  //
  el: document.querySelector('#table-target'),

  //
  data: _.range(1e6).map(function(ndx) {
    return {
      index: ndx,
      color: _.sample(['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']),
      random: Math.ceil(Math.random() * 100)
    };
  }),

  //
  heightFn: function() { return 17; },
  availableNodes: 200,

  //
  buildRow: function(rowData) {
    var node = document.createElement('div');
    node.classList.add('test-row');
    node.innerHTML =
      "<div class='test-col index'>"+rowData.index+"</div>"+
      "<div class='test-col color'>"+rowData.color+"</div>"+
      "<div class='test-col random'>"+rowData.random+"</div>";
    node.childNodes[1].style.color = rowData.color;
    return node;
  },

  //
  updateRow: function(rowData, rowEl) {
    rowEl.childNodes[0].textContent = rowData.index;
    rowEl.childNodes[1].textContent = rowData.color;
    rowEl.childNodes[1].style.color = rowData.color;
    rowEl.childNodes[2].textContent = rowData.random;
  }
});
