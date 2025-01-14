const DBTAG = 'suggestion';


var SUGGESTION_STATUS = Object.freeze({
	  BACKLOG: 1,
    INPROGRESS: 2,
    COMPLETED: 3,
  });

class Suggestion {
  constructor(records = {}){
    this.id = records.id;
    this.title = records.data.title || null;
    this.suggestion = records.data.suggestion || null;
    this.createdBy = records.data.createdBy || null;
    this.createdOn = records.data.createdOn || null;
    this.modifiedOn = records.lastUpdated|| null;
    this.pushNotificationTags = records.data.pushNotificationTags || [];
    this.upVoteCount = records.data.upVoteCount || 0;
    this.upVotedBy = records.data.upVotedBy || {};
    this.status = records.data.status || SUGGESTION_STATUS.BACKLOG;
  }
 

  static search(options) {
    return new Promise((resolve, reject) => {
      buildfire.publicData.search(options, DBTAG, (e, results) => {
        if (e) {
          reject(e);
        } else {
          let suggestions = results.map(result => new Suggestion(result))
          resolve(suggestions);
        }
      });
    });
  }

  static getById(id) {
   
    return new Promise((resolve, reject) => {
      buildfire.publicData.getById(
        id,
        DBTAG,
        (err, result) => {
         
          if (err) reject(err);
          resolve(new Suggestion(result) )
        }
      );
    });
  }
 

  static insert(suggestion, callback) {
    return new Promise((resolve, reject) => {
      buildfire.publicData.insert(suggestion, DBTAG, (e, r) => {
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

  static update(suggestion) {
    const suggestionId = suggestion.id;
    let suggestionData = structuredClone(suggestion);
    delete suggestionData.id;
    return new Promise((resolve, reject) => {
        buildfire.publicData.update(suggestionId, suggestionData, DBTAG, (e, r) => {
          if (e) {
            reject(e);
          } else {
            resolve(r);
          }
        });
      });
  }

  static searchAndUpdate(id, payload){
    return new Promise((resolve, reject) => {
      buildfire.publicData.searchAndUpdate({"id": id}, payload, DBTAG, (e, r) => {
        if (e) {
          reject(e);
        } else {
          resolve(r);
        }
      });
    });
  }

}