


var _currentUser = null;
var appThemeColors = null;
var settings = {};
var isCardClicked = false;
buildfire.appearance.titlebar.show();

function getLanguageValue(stringkey) {
	return new Promise((resolve, reject) => {
		buildfire.language.get({stringKey: stringkey}, (err, result) => {
		  if (err) reject({
			err
		  });
		  resolve(result);
		});
	  });
}

function getUser(callback) {
	if (_currentUser) {
		callback(_currentUser);
		return;
	}
	buildfire.auth.getCurrentUser(function(err, user) {
		if (err || !user) {
			callback(null);
			return console.error(err);
		}
		if(user){
			_currentUser = user;
			callback(user)
		}
	});
}

function enforceLogin() {
	buildfire.auth.login({}, function(err, user) {
		if (err) {
			callback();
			return console.error(err);
		}
		_currentUser = user;
	});
}

var config = {};

'use strict';
(function (angular, buildfire) {
	angular
	  .module('upvote')
	  .controller('listCtrl', ['$scope', 'ViewStack', '$sce',
		function ($scope, ViewStack, $sce) {
			var UpVoteHome = this;
			UpVoteHome.listeners = {};
			UpVoteHome.suggestions = [];
			UpVoteHome.isInitalized = false;
			UpVoteHome.text = "";
		
			showSkeleton()
			getSettings();
			buildfire.appearance.getAppTheme((err, result) => {
				if (err) return console.error(err);
				appThemeColors = result.colors
			  });


			  

			UpVoteHome.goToItemDetails = function (selectedItem) {
				if(isCardClicked){
					isCardClicked = false
					return;
				}
				ViewStack.push({
					template: 'Item_details',
					item: selectedItem
				  });
				buildfire.history.push('Item_details', { elementToShow: 'Item_details' });
			}

			
			function showSkeleton() {
				let skeleton = document.getElementById("skeleton")
				for(let i=0;i<=2;i++){
					let div = document.createElement("div")
					div.classList.add("bf-skeleton-loader")
					div.classList.add("grid-block")
					skeleton.append(div);
				}
			}
		
			function hideSkeleton() {
				let skeleton = document.getElementById("skeleton")
				skeleton.style.display = "none";
			}
		
			function getSettings() {
				Settings.get((err, result)=>{
					settings = result;
				})
			}
		
			function init() {
				let date = new Date();
				date.setDate(date.getDate() - 1);
		
		
				const options = {
					sort: { upVoteCount: -1 }
				}
				
				buildfire.datastore.get(function (err, obj) {
					if (obj) config = obj.data;
					getLanguageValue("mainScreen.introduction").then(result => {
						if(result != ""){
							UpVoteHome.text = result;
						} else if(config.text != ""){
							UpVoteHome.text = config.text;
						}
						if (!$scope.$$phase) $scope.$apply();
					})
				});
			
				Suggestion.search(options).then(results => {
					results = results.filter(x => x.status != 3 || new Date(x.createdOn) >= date)
					document.getElementById("btn--add__container").classList.remove("hidden")
					if (!results || !results.length) return update([]);
		
					results = results.map(checkYear);
					const promises = results.map(suggestion => {
						return new Promise(resolve => {
							buildfire.auth.getUserProfile({ userId: suggestion.createdBy._id }, (error, updatedUser) => {
								if (error || !updatedUser._id) {
									console.warn('failed to update user profile:', suggestion.createdBy);
									return resolve(suggestion);
								}
		
								const hasUpdate = suggestion.createdBy.displayName !== updatedUser.displayName;
		
								suggestion.createdBy = updatedUser;
								resolve(suggestion);
		
								if (!hasUpdate) return;
								// update suggestion out of sync for next time
								Suggestion.update(suggestion,()=>{})
							});
						});
					});
		
					Promise.all(promises)
						.then(update)
						.catch(console.error);
		
					function update(data) {
						hideSkeleton();
						UpVoteHome.isInitalized = true;
						$scope.suggestions = data;
						buildfire.spinner.hide();
						if (!$scope.$$phase) $scope.$apply();
					}
		
					function checkYear(item) {
						var creationYear = new Date(item.createdOn).getFullYear();
						var currentYear = new Date().getFullYear();
		
						item.isCurrentYear = creationYear === currentYear;
						item.disableUpvote = _currentUser ? !item || !item.upVotedBy || item.upVotedBy[_currentUser._id] : false;
						item.upvoteByYou = item.upVotedBy && _currentUser && item.upVotedBy[_currentUser._id] != null
						return item;
					}
				}).catch(err => console.log(err))
			}
		
			getUser(init);
		
			buildfire.auth.onLogin(user => {
				_currentUser = user;
				init();
			});
		
			buildfire.auth.onLogout(() => {
				_currentUser = null;
				init();
			});
		
			
		
			function renderStatusItem(text, index){
				const element = `
				<div style='display:flex;color:#000;font-weight:500;font-size:16px;line-height:24px'>
						<span style='width: 24px;height: 24px;border-radius: 50%;margin-right: 16px;background-color:
						   ${getStatusColor(index)}'></span> ${text} </div>`
		
				return element;
			}
		
			function getStatusColor(index){
				switch (index) {
					case 1:
						return "rgba(150, 150, 150, 0.1)";
					case 2:
						return appThemeColors.warningTheme
					case 3:
						return appThemeColors.successTheme
				}
			}
		
			UpVoteHome.goSocial = (suggestion = {}) => {
				isCardClicked = true;
				if (!suggestion || !settings.enableComments) return;
		
				const { title, createdOn, createdBy } = suggestion;
				const navigateToCwByDefault = (
					config && !Object.keys(config).length
						?
						true
						:
						config && config.navigateToCwByDefault
							?
							config.navigateToCwByDefault
							:
							false
				);
				const queryString = `wid=${createdBy.displayName}-${createdOn}&wTitle=${title}`;
				buildfire.navigation.navigateToSocialWall({
					title,
					queryString,
					pluginTypeOrder: navigateToCwByDefault ? ['community', 'premium_social', 'social'] : ['premium_social', 'social', 'community']
				}, () => { });
			};
		
			UpVoteHome.showVoterModal = function (suggestion) {
				isCardClicked = true;
				var voterIds = Object.keys(suggestion.upVotedBy);
				Promise.all(
					voterIds.map(userId => {
						return new Promise((resolve, reject) => {
							buildfire.auth.getUserProfile({ userId }, (error, user) => {
								if (error || !user) return reject(error);
								resolve(user);
							});
						});
					})
				).then(users => {
					const listItems = [];
					for(let i=0;i<users.length;i++){
						listItems.push({
							text: users[i].firstName + " " + users[i].lastName , imageUrl:buildfire.auth.getUserPictureUrl({ userId: users[i]._id }) 
						})
					}
					buildfire.components.drawer.open(
						{
						  content: '<b>Upvotes</b>',
						  isHTML: true,
						  triggerCallbackOnUIDismiss: false,   
						  autoUseImageCdn: true,
						  listItems: listItems
						},
						() => {}
					  );
				});
			};

			UpVoteHome.openChangeStatusModal = function (suggestion) {
				isCardClicked = true;
				const callBacklogText = getLanguageValue("mainScreen.backlog") 
				const callInProgressText = getLanguageValue("mainScreen.inProgress") 
				const callCompletedText = getLanguageValue("mainScreen.completed") 
		
				Promise.all([callBacklogText, callInProgressText,callCompletedText]).then(result => {
					const listItems = [];
					for(let i=1;i<=result.length;i++){
						listItems.push({
							id: i,
							text: renderStatusItem(result[i-1], i)
						})
					}
					buildfire.components.drawer.open(
						{
							content: '<b>Update Status</b>',
							isHTML: true,
							triggerCallbackOnUIDismiss: false,   
							listItems: listItems
						},
						(err, result) => {
							if(suggestion.status != result.id){
								suggestion.status = parseInt(result.id) 
								Suggestion.update(suggestion).then(()=>{
									if(suggestion.status == SUGGESTION_STATUS.COMPLETED){
										buildfire.input.showTextDialog({
											placeholder: `"${suggestion.title}" has been marked as completed`,
											saveText: "Post",
											defaultValue: `"${suggestion.title}" has been marked as completed`,
											required: true
										}, (err, response)=>{
											const voterIds = Object.keys(suggestion.upVotedBy);
											PushNotification.sendToCustomUsers("Task Completed", response.results[0].textValue, voterIds);
										})
									} else if(suggestion.status == SUGGESTION_STATUS.INPROGRESS){
										const voterIds = Object.keys(suggestion.upVotedBy);
										PushNotification.sendToCustomUsers("Task in Progress", `"${suggestion.title}" has been marked as in progress`, voterIds);
									}
									if (!$scope.$$phase) $scope.$apply();
								})
							}
							buildfire.components.drawer.closeDrawer();
						}
					);
				})
		
			
			}
		
			UpVoteHome.upVote = function(suggestionObj) {
				getUser(function(user) {
					if(!user) enforceLogin()
					if (!suggestionObj.upVotedBy) suggestionObj.upVotedBy = {};
					if (!suggestionObj.upVoteCount) suggestionObj.upVoteCount = 1;
		
					if (!suggestionObj.upVotedBy[user._id]) {
						// vote
						Analytics.trackAction(analyticKeys.VOTE_NUMBER.key, { votes: 1, _buildfire: { aggregationValue: 1 } });
		
						suggestionObj.upVoteCount++;
						suggestionObj.disableUpvote = true;
						suggestionObj.upVotedBy[user._id] = {
							votedOn: new Date(),
							user: user
						};
		
						if (suggestionObj.createdBy._id != user._id) {
							buildfire.notifications.pushNotification.schedule(
								{
									title: 'You got an upvote!',
									text: user.displayName + ' upvoted your suggestion ' + suggestionObj.title,
									users: [suggestionObj.createdBy._id]
								},
								function (err) {
									if (err) console.error(err);
								}
							);
						}
					} else {
						// unvote
						Analytics.trackAction(analyticKeys.VOTE_NUMBER.key, { votes: -1, _buildfire: { aggregationValue: -1 } });
		
						suggestionObj.upVoteCount--;
						suggestionObj.disableUpvote = false;
						delete suggestionObj.upVotedBy[user._id];
					}
		
					if (suggestionObj.upVoteCount < 10) {
						/// then just to a hard count just in case
						suggestionObj.upVoteCount = Object.keys(suggestionObj.upVotedBy).length;
					}
					Suggestion.update(suggestionObj).then(()=>{
						suggestionObj.upvoteByYou = suggestionObj.upVotedBy[user._id] != null
						if (!$scope.$$phase) $scope.$apply();
					})
				});
			};
		
			window.openPopup = function() {
				if(_currentUser){
					const step1 = {
						placeholder: "Enter short title*",
						saveText: "Next",
						defaultValue: "",
						required: true
					  }
					const step2 = {
						placeholder: "Add more details*",
						saveText: "Submit",
						defaultValue: "",
						required: true
					  }
					const steps = [step1, step2];
		
					buildfire.input.showTextDialog(steps, (err, response)=>{
						const title = response.results[0].textValue
						const description = response.results[1].textValue
						addSuggestion(title, description)
					})
				} else {
					enforceLogin();
				}
			};
		
			function addSuggestion(title, description) {
		
				getUser(function (user) {
					_addSuggestion(user, title, description);
					Analytics.trackAction(analyticKeys.SUGGESTIONS_NUMBER.key, { _buildfire: { aggregationValue: 1 } });
					if (!$scope.$$phase) $scope.$apply();
				});
			};
		
			function _addSuggestion(user, title, text) {
				if (!user || !title || !text) return;
		
				var obj = {
					title: title,
					suggestion: text,
					createdBy: user,
					createdOn: new Date(),
					upVoteCount: 1,
					upVotedBy: {},
					status: SUGGESTION_STATUS.BACKLOG
				};
				obj.upVotedBy[user._id] = {
					votedOn: new Date(),
					user: user
				};
		
				Suggestion.insert(obj, (err, result) => {
					buildfire.dialog.toast({
						message: "Your suggestion has been successfully added.",
						type: "info"
					  });
					const suggestion = new Suggestion(result)
					suggestion.disableUpvote = true;
					UpVoteHome.suggestions.unshift(suggestion);
					if(settings){
						const title = "A new item has been created";
						const message = `A "${suggestion.title}" has been created`;
						if(settings.pushNotificationUsersSegment === PUSH_NOTIFICATIONS_SEGMENT.ALL_USERS){
							PushNotification.sendToAll(title, message);
						} else if(settings.pushNotificationUsersSegment === PUSH_NOTIFICATIONS_SEGMENT.TAGS){
							PushNotification.sendToUserSegment(title, message, settings.pushNotificationTags)
						}
					}
					
					if (!$scope.$$phase) $scope.$apply();
				})
			}

			UpVoteHome.safeHtml = function (html) {
				if (html) {
					var $html = $('<div />', {html: html});
					$html.find('iframe').each(function (index, element) {
						var src = element.src;
						src = src && src.indexOf('file://') != -1 ? src.replace('file://', 'http://') : src;
						element.src = src && src.indexOf('http') != -1 ? src : 'http:' + src;
					});
					return $sce.trustAsHtml($html.html());
				}
			};
		}
	]
	  )}
)(window.angular, window.buildfire);
