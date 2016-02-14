import Marionette from 'backbone.marionette';

const WorkoutItem = Marionette.View.extend({
  className: 'col-md-6 col-lg-4 col-sm-12',

  template: require('../templates/workout/item.html'),

  templateContext: function() {
    const panelIndexes = {
      0: 'info',
      1: 'danger',
      2: 'warning',
      3: 'success',
      4: 'default'
    };

    return {
      iterType: panelIndexes[this.getOption('index') % 5]
    };
  }
});

const WorkoutListView = Marionette.CollectionView.extend({
  childView: WorkoutItem,

  childViewOptions: function(model, index) {
    return {
      index: index
    };
  }
});

export const WorkoutList = Marionette.View.extend({
  template: require('../templates/workout/layout.html'),

  regions: {
    list: '.list-hook'
  },

  ui: {
    create: '.create-workout'
  },

  triggers: {
    'click @ui.create': 'show:create:workout'
  },

  onRender: function() {
    this.showChildView('list', new WorkoutListView({
      collection: this.collection
    }));
  }
});
