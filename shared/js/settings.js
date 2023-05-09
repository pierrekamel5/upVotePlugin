  const DBTAG = 'settings';

  STATUS_UPDATE_SEGMENT = Object.freeze({
    ALL_USERS: 1,
    NO_USERS: 2,
    TAGS: 3,
  });
 
  PUSH_NOTIFICATIONS_SEGMENT = Object.freeze({
    ALL_USERS: 1,
    NO_USERS: 2,
    TAGS: 3,
  });
 

  class Settings {
    constructor(data = {}){
      this.enableComments = data.enableComments || false;
      this.statusUpdateUsersSegment = data.statusUpdateUsersSegment || STATUS_UPDATE_SEGMENT.NO_USERS;
      this.statusUpdateTags = [{tagName:"Test1", id:1},{tagName:"Test2", id:2}];
      this.pushNotificationUsersSegment = data.pushNotificationUsersSegment || PUSH_NOTIFICATIONS_SEGMENT.NO_USERS;
      this.pushNotificationTags = data.pushNotificationTags || [];
      this.createdOn = data.createdOn || new Date();
      this.createdBy = data.createdBy || null;
      this.lastUpdatedOn = data.lastUpdatedOn || new Date();
      this.lastUpdatedBy = data.lastUpdatedBy || null;
      this.deletedOn = data.deletedOn || null;
      this.deletedBy = data.deletedBy || null;
      this.isActive = data.isActive || 1;
    }
   

    static get(callback) {
      return new Promise((resolve, reject) => {
        buildfire.datastore.get(DBTAG, (e, obj) => {
          if (e) {
            reject(e);
            if (callback) callback(e);
          } else {
            let settings = new Settings(obj);
            resolve(settings);
            if (callback) callback(null, settings);
          }
        });
      });
    }

   

    static save(settings, callback) {
      return new Promise((resolve, reject) => {
        buildfire.datastore.save(settings, DBTAG, (e, r) => {
          if (e) {
            reject(e);
            if (callback) callback(e);
          } else {
            resolve(r);
            if (callback) callback(null, r);
          }
        });
      });
    }
  }