/** ****************************************************************************
 * Record List controller.
 *****************************************************************************/
import Morel from 'morel';
import App from '../../../app';
import Log from '../../../helpers/log';
import Error from '../../../helpers/error';
import ImageHelp from '../../../helpers/image';
import Analytics from '../../../helpers/analytics';
import userModel from '../../common/models/user_model';
import recordManager from '../../common/record_manager';
import Sample from '../../common/models/sample';
import Occurrence from '../../common/models/occurrence';
import MainView from './main_view';
import HeaderView from './header_view';
import LoaderView from '../../common/views/loader_view';

const API = {
  show() {
    const loaderView = new LoaderView();
    App.regions.main.show(loaderView);

    recordManager.getAll((getError, recordsCollection) => {
      Log('Records:List:Controller: showing');
      if (getError) {
        Log(getError, 'e');
        App.regions.dialog.error(getError);
        return;
      }

      // clean from drafts
      API.clearDrafts(recordsCollection);

      // MAIN
      const mainView = new MainView({
        collection: recordsCollection,
        userModel,
      });

      mainView.on('childview:record:edit:attr', (childView, attr) => {
        App.trigger('records:edit:attr', childView.model.id || childView.model.cid, attr);
      });

      mainView.on('childview:record:delete', (childView) => {
        const recordModel = childView.model;
        API.recordDelete(recordModel);
      });
      App.regions.main.show(mainView);
    });

    // HEADER
    const headerView = new HeaderView();

    headerView.on('photo:upload', (e) => {
      const photo = e.target.files[0];
      API.photoUpload(photo);
    });

    // android gallery/camera selection
    headerView.on('photo:selection', API.photoSelect);

    App.regions.header.show(headerView);

    // FOOTER
    App.regions.footer.hide().empty();
  },

  recordDelete(recordModel) {
    Log('Records:List:Controller: deleting record');

    const syncStatus = recordModel.getSyncStatus();
    let body = 'This record hasn\'t been saved to iRecord yet, ' +
      'are you sure you want to remove it from your device?';

    if (syncStatus === Morel.SYNCED) {
      body = 'Are you sure you want to remove this record from your device?';
      body += '</br><i><b>Note:</b> it will remain on the server.</i>';
    }
    App.regions.dialog.show({
      title: 'Delete',
      body,
      buttons: [
        {
          title: 'Cancel',
          onClick() {
            App.regions.dialog.hide();
          },
        },
        {
          title: 'Delete',
          class: 'btn-negative',
          onClick() {
            recordModel.destroy();
            App.regions.dialog.hide();
            Analytics.trackEvent('List', 'record remove');
          },
        },
      ],
    });
  },

  photoUpload(photo) {
    Log('Records:List:Controller: photo upload');

    // show loader
    API.createNewRecord(photo, () => {
      // hide loader
    });
  },

  photoSelect() {
    Log('Records:List:Controller: photo select');

    App.regions.dialog.show({
      title: 'Choose a method to upload a photo',
      buttons: [
        {
          title: 'Camera',
          onClick() {
            ImageHelp.getImage((entry) => {
              API.createNewRecord(entry.nativeURL, ()=>{});
            });
            App.regions.dialog.hide();
          },
        },
        {
          title: 'Gallery',
          onClick() {
            ImageHelp.getImage((entry) => {
              API.createNewRecord(entry.nativeURL, ()=>{});
            }, {
              sourceType: window.Camera.PictureSourceType.PHOTOLIBRARY,
              saveToPhotoAlbum: false,
            });
            App.regions.dialog.hide();
          },
        },
      ],
    });
  },

  /**
   * Creates a new record with an image passed as an argument.
   */
  createNewRecord(photo, callback) {
    ImageHelp.getImageModel(photo, (err, image) => {
      if (err || !image) {
        const err = new Error('Missing image.');
        callback(err);
        return;
      }
      const occurrence = new Occurrence();
      occurrence.addImage(image);

      const sample = new Sample();
      sample.addOccurrence(occurrence);

      recordManager.set(sample, (saveErr) => {
        if (saveErr) {
          callback(saveErr);
          return;
        }
        callback();
      });
    });
  },

  clearDrafts(recordsCollection) {
    recordsCollection.each(record => {
      if (!record.metadata.saved) {
        record.destroy();
      }
    });
  },
};

export { API as default };
