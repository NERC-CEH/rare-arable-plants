/** ****************************************************************************
 * Record Attribute main view.
 *****************************************************************************/
import $ from 'jquery';
import Marionette from 'marionette';
import Device from '../../../helpers/device';
import DateHelp from '../../../helpers/date';
import StringHelp from '../../../helpers/string';
import Log from '../../../helpers/log';
import JST from '../../../JST';

// http://stackoverflow.com/questions/846221/logarithmic-slider
function LogSlider(options) {
  options = options || {};
  this.minpos = options.minpos || 0;
  this.maxpos = options.maxpos || 100;
  this.minlval = Math.log(options.minval || 1);
  this.maxlval = Math.log(options.maxval || 100000);

  this.scale = (this.maxlval - this.minlval) / (this.maxpos - this.minpos);
}

LogSlider.prototype = {
  // Calculate value from a slider position
  value: function(position) {
    if (!position) return;
    const result = Math.exp((position - this.minpos) * this.scale + this.minlval);
    return result.toFixed(0);

  },
  // Calculate slider position from a value
  position: function(value) {
    if (!value) return;
    const result = this.minpos + (Math.log(value) - this.minlval) / this.scale;
    return result.toFixed(0);
  }
};

const logsl = new LogSlider({ maxpos: 100, minval: 1, maxval: 1000 });

export default Marionette.ItemView.extend({
  initialize(options) {
    this.template = JST[`records/attr/${options.attr}`];
  },

  events: {
    'click input[type="radio"]': 'save',
    'input input[type="range"]': 'updateRangeInputValue',
    'change input[type="number"]': 'updateRangeSliderValue',
  },

  save() {
    if (this.options.attr === 'number') return;
    this.trigger('save');
  },

  getValues() {
    const values = {};
    let value;
    const attr = this.options.attr;
    let $inputs;
    switch (attr) {
      case 'date':
        value = this.$el.find('input').val();
        values[attr] = new Date(value);
        break;
      case 'number':
        // ranges selection
        $inputs = this.$el.find('input[type="radio"]');
        $inputs.each((int, elem) => {
          if ($(elem).prop('checked')) {
            values[attr] = $(elem).val();
          }
        });
        const $inputWidth = this.$el.find('#number_width');
        values.number_width = $inputWidth.val();
        values.number_width && (values.number_width = parseInt(values.number_width));

        const $inputLength = this.$el.find('#number_length');
        values.number_length = $inputLength.val();
        values.number_length && (values.number_length = parseInt(values.number_length));
        break;
      case 'stage':
        $inputs = this.$el.find('input');
        $inputs.each((int, elem) => {
          if ($(elem).prop('checked')) {
            values[attr] = $(elem).val();
          }
        });
        break;
      case 'habitat':
        $inputs = this.$el.find('input');
        $inputs.each((int, elem) => {
          if ($(elem).prop('checked')) {
            values[attr] = $(elem).val();
          }
        });
        break;
      case 'comment':
        value = this.$el.find('textarea').val();
        values[attr] = StringHelp.escape(value);
        break;
      default:
        Log('Records:Attribute:MainView: no such attribute', 'e');
    }

    return values;
  },

  serializeData() {
    const templateData = {};
    const occ = this.model.occurrences.at(0);
    let key;

    switch (this.options.attr) {
      case 'date':
        templateData.date = DateHelp.toDateInputValue(this.model.get('date'));
        templateData.maxDate = DateHelp.toDateInputValue(new Date());
        break;
      case 'number':
        key = occ.get('number');
        if (key) templateData[key] = true;
        templateData.number_width = occ.get('number_width');
        templateData.number_width_slider = logsl.position(occ.get('number_width'));
        templateData.number_length = occ.get('number_length');
        templateData.number_length_slider = logsl.position(occ.get('number_length'));

        break;
      case 'stage':
        key = occ.get('stage');
        if (key) templateData[key] = true;
        break;
      case 'habitat':
        key = occ.get('habitat');
        if (key) templateData[key] = true;
        break;
      case 'comment':
        templateData.comment = occ.get('comment');
        break;
      default:
        Log('Records:Attribute:MainView: no such attribute', 'e');
        return null;
    }

    return templateData;
  },

  updateRangeSliderValue(e) {
    const $input = $(e.target);
    const $slider = this.$el.find(`input[name="${$input.prop('id')}"]`);
    const value = logsl.position($input.val());
    $slider.val(value);
  },

  updateRangeInputValue(e) {
    const $slider = $(e.target);
    if (!$slider.val()) {
      // no need to do anything on input clear
      return;
    }
    const $input = this.$el.find(`#${$slider.prop('name')}`);
    const value = logsl.value($slider.val());
    $input.val(value);
  },

  onShow() {
    const that = this;
    switch (this.options.attr) {
      case 'date':
        // this.$el.find('input').focus();
        const $input = this.$el.find('input').focus();
        if (Device.isAndroid()) {
          const options = {
            date: new Date(this.model.get('date')),
            mode: 'date',
            androidTheme: 5,
            allowOldDates: true,
            allowFutureDates: false,
          };

          window.datePicker.show(options, function (date) {
            $input.val(DateHelp.toDateInputValue(new Date(date)));
          });
        }
        break;
      case 'comment':
        // this.$el.find('textarea').focus();
        const $textarea = this.$el.find('textarea').focus();
        if (window.cordova && Device.isAndroid()) {
          window.Keyboard.show();
          $textarea.focusout(() => {
            window.Keyboard.hide();
          });
        }
        break;
      default:
    }
  },
});

