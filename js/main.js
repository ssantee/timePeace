(function(win,$,mmt,document){
    "use strict";

    win.TIMEPEACE = win.TIMEPEACE || {};
    
    var self = win.TIMEPEACE,
        stringGlobalSymbol = "TIMEPEACE";
    
    self.language = {

        inProgressMsg : "There is an activity in progress.",
        clearRecordsWarn : "Are you sure?",
        noCurrentActivity : "No Activity"

    };

    self.controls = {
        
        btnStart : $("#activityStart"),
        btnStop : $("#activityStop"),
        btnClearAuto : $("#clearAuto"),
        btnClearStored : $("#clearStored"),
        btnClearRecords : $("#clearRecords")
        
    };
    
    self.utilities = (function(){
        
        var copyObject = function(obj){
            
            var newobj = {},
                key;
            
            for(key in obj){

                newobj[key] = obj[key];

            }
            
            return newobj;
            
        };
        
        return {

            copyObject : copyObject

        };
        
    })();
    
    self.timeKeeper = (function(){

        var currentTime = function(){

            return mmt().format('h:mm:ss a');

        },
        
        currentTimeObj = function(existing){
            
            if(existing===undefined){

                return mmt();

            }
            else{

                return mmt(existing);

            }
    
        },
        
        pastTime = function(time){

            return mmt(time).format('h:mm:ss a');

        },
        
        currentDate = function(){

            return mmt().format('dddd, MMMM Do');

        },

        duration = function(startTime){
           
            return currentTimeObj().diff(startTime,"minutes");
            
        },
        
        sumDurations = function(dur1,dur2){

			if(typeof dur1==="string"){

				dur1 = parseInt(dur1);

			}
			if(typeof dur2==="string"){

				dur2 = parseInt(dur2);

			}

            return dur1+dur2;
        
        };
       
        return {

            currentTime : currentTime,
            currentTimeObj : currentTimeObj,
            duration : duration,
            sumDurations : sumDurations,
            currentDate : currentDate,
            pastTime : pastTime

        };
    })();
    
    self.recordKeeper = (function(){
        
        var records = [],
            summaries = [],
            names = [],
            currentActivity = {},
            numChanges = 0,
            activityInProgress = false,
            currentId = 0,
            durationTimer,

            getNumChanges = function(){

                return numChanges;

            },
            getNames = function(){

                return names;

            },
            loadNames = function(){

                var storedNames = win.localStorage.getItem(stringGlobalSymbol+"names"),
                    thenames = [],x,l;
                
                if(storedNames!==null){

                    thenames = storedNames.split(",");
                    
                    l = thenames.length;
                    
                    for(x=0;x<l;x++){
                        
                        if($.inArray(thenames[x],names)===-1){
                        
                            names.push(thenames[x]);

                        }

                    }
                }
                
                //TODO refactor this
                $("#activityIn").autocomplete({source:names});

            }(), 
            
            loadRecords = function(){

                var strStoredRecords = win.localStorage.getItem(stringGlobalSymbol),
                    storedRecords = $.parseJSON(strStoredRecords),
                    key,key2;
                
                
                for(key in storedRecords["storedRecords"]){
                    
                    for(key2 in storedRecords["storedRecords"][key]){

                        if(key2==="startTimeObj"){

                            storedRecords["storedRecords"][key][key2] 
                                = mmt(decodeURIComponent(storedRecords["storedRecords"][key][key2]));
                        }
                        else{

                            storedRecords["storedRecords"][key][key2] 
                                = decodeURIComponent(storedRecords["storedRecords"][key][key2]);

                        }
                    }
                    
                    newRecord(storedRecords["storedRecords"][key]);
                    
                }
                
            },
            
            getRecords = function(){

                return records;

            },
            
            clearRecords = function(){
            
                var x = window.confirm(self.language.clearRecordsWarn);
            
                if(x){

                    summaries = [];
                    records = [];
                    self.view.resetRecords();

                }

            },
            
            clearAuto = function(){

                win.localStorage.setItem(stringGlobalSymbol+"names","");

            },
            
            clearStored = function(){

                win.localStorage.setItem(stringGlobalSymbol,"");

            },
            
            promptLoadRecords = function(){
                
                var x = win.localStorage.getItem(stringGlobalSymbol),
                    b;
                
                if(x!==null && x!==""){

                    //b = window.confirm("Load previous records?");
                    b = true;

                    if(b){

                        loadRecords();

                    }
                
                }

            },
            
            startActivity = function(activity,oldStartTime){

                if(!activityInProgress){
                    
                    $(document).trigger("beforeactivitystart");
                    
                    numChanges = numChanges + 1;
                    
                    //update obj props
                    currentActivity.name = activity;
                    
                    if(oldStartTime===undefined){

                        currentActivity.startTime = self.timeKeeper.currentTime();
                        currentActivity.startTimeObj = self.timeKeeper.currentTimeObj();
                        currentActivity.duration = 0;

                    }
                    else{

                        //use the previous
                        currentActivity.startTime = self.timeKeeper.pastTime(oldStartTime);
                        currentActivity.startTimeObj = self.timeKeeper.currentTimeObj(oldStartTime);
                        currentActivity.duration = 0;

                    }
                    
                    currentActivity.id = currentId;
                    activityInProgress = true;
                    updateDuration();
                    durationTimer = win.setInterval(function(){updateDuration();},10000);
                    storeCurrent();
                    
                    $(document).trigger("activitystart",currentActivity);

                }
                else{

                    ;

                }
            },
            stopActivity = function(){

                if(activityInProgress){
                    
                    $(document).trigger("beforeactivitystop");
                    
                    //add stop time to current
                    currentActivity.stopTime = self.timeKeeper.currentTime();
                    
                    //create a record of this activity
                    newRecord(currentActivity);
                    activityInProgress = false;
                    win.clearInterval(durationTimer);    
                    
                    //clear current,
                    win.localStorage.removeItem(stringGlobalSymbol+"currentActivityname",currentActivity.name);
                    win.localStorage.removeItem(stringGlobalSymbol+"currentActivitystart",currentActivity.startTimeObj);
                    currentActivity = {};

                    $(document).trigger("activitystop");
                    
                }
                else{

                    ;//TODO show a msg or something

                }

            },
            updateDuration = function(){

                currentActivity.duration = self.timeKeeper.duration(currentActivity.startTimeObj);
                //TODO move view code to event handler
                //this is an interval called function.
                //maybe better to leave the direct call
                //for performance
                self.view.updateDurationView(currentActivity.duration);

            },      
            summaryExists = function(summ){
            
                var x,l = summaries.length,
                    key,found = false;
                
                for(x=0;x<l;x++){
                    
                    if(summaries[x].name===summ){

                        found = true;

                    }
                    
                }

                return found;
            
            },
            updateSummary = function(){
            
                //compare the current summaries to
                //the current records. when activity names
                //match, update the summary to reflect the sum
                //of all durations spent on activity
                
                var sumkey,reckey,x,y,z,
                    l = summaries.length,
                    cursum,currec,
                    rl = records.length;
                
                
                if(l===0){

                    //skip most logic just push latest activity in
                    var newr = self.utilities.copyObject(records[records.length-1]);
                    summaries.push(newr);

                }
                else{

                    //there are existing summaries,
                    for(x=0;x<l;x++){
                        
                        cursum = summaries[x];
                        cursum.duration = 0;

                        for(y=0;y<rl;y++){

                            currec = records[y];
                            if(cursum.name===currec.name && summaryExists(currec.name)){
                                
                                //this summary needs the duration of currec
                                //added to it
                                cursum.duration = self.timeKeeper.sumDurations(
                                    cursum.duration,currec.duration
                                );
                            
                            }
                            
                            if(!summaryExists(currec.name)){

                                var newrx = self.utilities.copyObject(records[records.length-1]);
                                //newrx.duration = 0;
                                summaries.push(newrx);

                            }
                        
                        }
                         
                    }
                    
                }
                
                l = summaries.length;
                
                for(z=0;z<l;z++){

                    if($.inArray(summaries[z].name,names)===-1){

                        names.push(summaries[z].name);

                    }
                
                }
                
                $(document).trigger("updatesummary",[summaries,names]);

            },
            
            newRecord = function(toRecord){
                
                records.push(toRecord);
                
                currentId = currentId + 1;
                
                storeRecords();
                
                updateSummary();
                
                storeNames();

                //TODO move view code to event handler
                self.view.createRecord(toRecord);
        
            },

            updateRecord = function(){},

            storeNames = function(){

                storeLocal("names");

            },

            storeRecords = function(){

                storeLocal("records");

            },

            storeCurrent = function(){

                if(activityInProgress){

                    storeLocal("currentActivity");

                }

            },

            reloadCurrent = function(){
                
                var activity = win.localStorage.getItem(stringGlobalSymbol+"currentActivityname"),
                    time = win.localStorage.getItem(stringGlobalSymbol+"currentActivitystart");
                
                if(time!==null && activity!==null){

                    startActivity(activity,time);

                }

            },

            retrieveRecords = function(){

                var jsonStr = win.localStorage.getItem(stringGlobalSymbol),
                    newObj = JSON.parse(jsonStr),
                    key,key2,key3;
                
                    for(key in newObj["storedRecords"]){

                        for(key2 in newObj["storedRecords"][key]){
                            
                                newObj["storedRecords"][key][key2] = decodeURIComponent(newObj["storedRecords"][key][key2]);
                            
                        }
                    
                    }
                
                return newObj;
                
            },

            storeLocal = function(what){
        
                if(what==="records"){

                    var x,key,
                        l = records.length,
                        recordsTmp = {},
                        recordsStr = '{"storedRecords":{';

                    for(x=0;x<l;x++){

                        recordsTmp[x] = {};

                        for(key in records[x]){

                            recordsTmp[x][key] = encodeURIComponent(records[x][key]);
                        }

                        recordsStr += '"record'+x+'":' + JSON.stringify(recordsTmp[x]);

                        if(x<l-1){

                            recordsStr += ",";

                        }
                    
                    }

                    recordsStr += "}}";

                    win.localStorage.setItem(stringGlobalSymbol,recordsStr);

                }
                else if(what==="names"){
                    
                    win.localStorage.setItem(stringGlobalSymbol+what,names.toString());

                }
                else if(what==="currentActivity"){
                    
                    win.localStorage.setItem(stringGlobalSymbol+what+"name",currentActivity.name);
                    win.localStorage.setItem(stringGlobalSymbol+what+"start",currentActivity.startTimeObj);
                    
                }
        
            },
            storeRemote = function(){

                //TODO

            };
        //TODO the list of exposed functions should be reduced
        //leaving some temporarily for console testing
        return {

            startActivity : startActivity,
            stopActivity : stopActivity,
            getRecords : getRecords,
            retrieveRecords : retrieveRecords,
            updateSummary : updateSummary,
            getNumChanges : getNumChanges,
            getNames : getNames,
            promptLoadRecords : promptLoadRecords,
            clearStored : clearStored,
            clearAuto : clearAuto,
            clearRecords : clearRecords,
            storeCurrent : storeCurrent,
            reloadCurrent : reloadCurrent

        };
        
    })();
    
    self.view = (function(){
        
        var viewIds = {

            time : "controlView",
            current : "currentView",
            records : "recordsView"

        },
        
        noActivity = self.language.noCurrentActivity,
        
        $controlView = $("#"+viewIds.time),
        $currentView = $("#"+viewIds.current),
        $recordsView = $("#"+viewIds.records),
        $allViews = $(".view"),
        
        showAView = function(viewToShow){

            var id = viewToShow[0].id;
            $("a[href='#"+id+"']").tab("show");

        },
        
        showTimeView = function(){

            showAView($controlView);

        },
                
        showCurrentView = function(){

            showAView($currentView);

        },
        showRecordsView = function(){

            showAView($recordsView);

        },
        updateTimeView = function(){

            document.getElementById("tvTime").innerHTML = self.timeKeeper.currentTime();

        },
        updateDateView = function(){

            document.getElementById("tvDate").innerHTML = self.timeKeeper.currentDate();

        },
        updateSummaryView = function(summaries){
            
            var x,
                l = summaries.length,
                tmpl = document.getElementById("summaryTemplate").textContent,
                temp ="",
                final = "";
            
            for(x=0;x<l;x++){

                temp = tmpl.replace("{activity}",summaries[x].name);
                temp = temp.replace("{duration}",summaries[x].duration);
                temp = temp.replace("{recordid}",summaries[x].id);
                final += temp;

            }
            
            $("#summaryBody").html("").append(final);
            $("#svSwitches").html(self.recordKeeper.getNumChanges());
        },

        updateDurationView = function(data){
    
            document.getElementById("cvDuration").innerHTML = data + " minutes";
            
        },
        updateCurrentView = function(newdata){

            if(newdata!==undefined){
            
                $("#cvCurrent").html(newdata.name);
                $("#cvStarted").html(newdata.startTime);
                $("#activeIndicator").html("!");
                
            }
            else{

                $("#cvCurrent").html(noActivity);
                $("#cvDuration,#cvStarted,#activeIndicator").html("");
                
            }

        },
        
        resetRecords = function(){

            $("#recordsBody").html("");
            $("#summaryBody,#svSwitches").html("");
            
        },
        
        createRecord = function(toRecord){

            var tmpl = document.getElementById("entriesTemplate").textContent;
                
            tmpl = tmpl.replace("{recordid}",toRecord.id);
            tmpl = tmpl.replace("{activity}",toRecord.name);
            tmpl = tmpl.replace("{start}",toRecord.startTime);
            tmpl = tmpl.replace("{end}",toRecord.stopTime);
            tmpl = tmpl.replace("{duration}",toRecord.duration);
            
            $("#recordsBody").append(tmpl);

        };
        
        var tvUpdateTimer = win.setInterval(function(){updateTimeView();},100),
            dateUpdateTimer = win.setInterval(function(){updateDateView();},360000);

        updateDateView();
        
        return {

            showTimeView : showTimeView,
            showCurrentView : showCurrentView,
            showRecordsView : showRecordsView,
            updateCurrentView : updateCurrentView,
            updateDurationView : updateDurationView,
            createRecord : createRecord,
            updateSummaryView : updateSummaryView,
            resetRecords : resetRecords

        };
    })();
    
    self.controls.btnStart.on("click",function(event){
        
        var f = $("#activityIn"),
            valin = f.val();
        
        valin = valin.replace(/</gi,"&lt;");
        valin = valin.replace(/>/gi,"&gt;");
        
        if(valin!==""){

            f.removeClass("err");
            self.recordKeeper.startActivity(valin);

        }
        else{

            f.addClass("err");

        }
    });
    
    self.controls.btnStop.on("click",function(event){

        self.recordKeeper.stopActivity();

    });
    
    self.controls.btnClearAuto.on("click",function(event){

        self.recordKeeper.clearAuto();

    });
    
    self.controls.btnClearStored.on("click",function(event){

        self.recordKeeper.clearStored();

    });
    self.controls.btnClearRecords.on("click",function(event){

        self.recordKeeper.clearRecords();

    });
    
    $(document).on("activitystart",function(event,currentActivity){

        self.view.updateCurrentView(currentActivity);
        self.view.showCurrentView();

    });
    
    $(document).on("activitystop",function(event){

        self.view.updateCurrentView();
        self.view.showRecordsView();

    });
    
    $(document).on("updatesummary",function(event,summaries,names){

        self.view.updateSummaryView(summaries);
        $("#activityIn").autocomplete({source:names});
        
    });
    
    self.recordKeeper.promptLoadRecords();
    self.recordKeeper.reloadCurrent();
    
})(window,jQuery,moment,document);
