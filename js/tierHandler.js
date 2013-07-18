EmuLabeller.tierHandler = {
    init: function(params){
        this.internalCanvasWidth = params.internalCanvasWidth;
        this.internalCanvasHeightSmall = params.internalCanvasHeightSmall;
        this.internalCanvasHeightBig = params.internalCanvasHeightBig;
        this.isModalShowing = false;    
        this.tierInfos = params.tierInfos;     
    },

    addTier: function(addPointTier) {
        var my = this;
        var tName = "Tier" + this.getLength()+1;
        if (!addPointTier) {
            this.tierInfos.tiers.push([tName, {
                TierName: tName,
                type: "seg",
                events: []
            }]);
        } else {
            this.tierInfos.tiers.push([tName, {
                TierName: tName,
                type: "point",
                events: []
            }]);
        }
        this.addTiertoHtml(tName, "tierSettings", "#cans");
        this.tierInfos.tiers[tName].uiInfos.canvas = $("#" + tName)[0];
        this.drawBuffer();
        this.rebuildSelect();
    },

    addLoadedTiers: function(loadedTiers) {
        var my = this;
        $.each(loadedTiers.tiers, function() {
             my.addTiertoHtml(this.TierName, "tierSettings", "#cans");
             my.tierInfos.tiers[this.TierName] = this;
             my.tierInfos.tiers[this.TierName].uiInfos.canvas = $("#" + this.TierName)[0];

        });
    },

    getLength: function() {
        return this.tierInfos.length;
    },


    showHideTierDial: function() {
        emulabeller.isModalShowing = true;
        $("#dialog-messageSh").dialog({
            modal: true,
            close: function() {
                console.log("closing");
                emulabeller.isModalShowing = false;
            },
            buttons: {
                Ok: function() {
                    $(this).dialog("close");
                    var usrTxt = $("#dialShInput")[0].value;
                    // emulabeller.tierInfos.tiers[0] = {};
                    // emulabeller.tierInfos.canvases[0] = {};
                    $("#" + usrTxt).slideToggle();
                    emulabeller.isModalShowing = false;
                }
            }
        });
    },
    
    /**
     * append a tier
     *
     * @param myName is used ad id of canvas
     * @param myID is used in custom attr. tier-id
     * @param myCssClass is used to spec. css class
     * @param
     */
    addTiertoHtml: function(myName, myCssClass, myAppendTo) {
        $('<canvas>').attr({
            id: myName,
            width: this.internalCanvasWidth,
            height: this.internalCanvasHeightSmall
        }).addClass(myCssClass).appendTo(myAppendTo);

        $("#" + myName).bind("click", function(event) {
            emulabeller.tierHandler.handleTierClick(emulabeller.getX(event.originalEvent), emulabeller.getY(event.originalEvent), emulabeller.tierHandler.getTierDetailsFromTierWithName(myName));
        });
        $("#" + myName).bind("dblclick", function(event) {
            emulabeller.handleTierDoubleClick(event.originalEvent);
        });
        $("#" + myName).bind("contextmenu", function(event) {
            emulabeller.setMarkedEvent(emulabeller.getX(event.originalEvent), emulabeller.getY(event.originalEvent), myName);
        });
        $("#" + myName).bind("mousemove", function(event) {
            emulabeller.tierHandler.trackMouseInTiers(event, emulabeller.getX(event.originalEvent), myName);
        });
        $("#" + myName).bind("mouseout", function(event) {
            emulabeller.tierHandler.resetAllSelBoundariesInTierInfos();
            var curTierDetails = emulabeller.tierHandler.getTierDetailsFromTierWithName(myName);
            emulabeller.drawer.updateSingleTier(emulabeller.viewPort, curTierDetails);

        });
        $("#" + myName).bind("mouseup", function(event) {
            //myMouseUp(e);
        });
        $("#" + myName).bind("mousedown", function(event) {
            //myMouseDown(e);
        });

    },
    
    /**
     * function called on mouse move in tiers
     *
     * @param percX x position percentage of
     * canvas calling this function
     * @param tierID id of canvas calling this function
     */
    trackMouseInTiers: function(event, percX, tierName) {
        if (!event.shiftKey) {
            this.resetAllSelBoundariesInTierInfos();
            var curTierDetails = this.getTierDetailsFromTierWithName(tierName);
            var curSample = emulabeller.viewPort.sS + (emulabeller.viewPort.eS - emulabeller.viewPort.sS) * percX;
            this.findAndMarkNearestSegmentBoundry(curTierDetails, curSample, true);
            emulabeller.drawer.updateSingleTier(emulabeller.viewPort, curTierDetails);
        }
    },

    findAndMarkNearestSegmentBoundry: function(tierDetails, curSample, markAsSel) {
        var closestStartSample = null;
        var closestStartEvt = null;
        $.each(tierDetails.events, function() {
            if (closestStartSample === null || Math.abs(this.startSample - curSample) < Math.abs(closestStartSample - curSample)) {
                closestStartSample = this.startSample;
                closestStartEvt = this;
            }
        });  
        if (markAsSel) {
            closestStartEvt.uiInfos.selBoundryStart = true;
        }
        return closestStartEvt;
    },    
    
    getTierDetailsFromTierWithName: function(tierName) {
        return this.tierInfos.tiers[tierName];
    },
    
    resetAllSelBoundariesInTierInfos: function() {
        $.each(this.tierInfos.tiers, function() {
            $.each(this.events, function() {
                this.uiInfos.selBoundryStart = false;
                this.uiInfos.selBoundryEnd = false;
            }); 
        });    
    },
    

    handleTierClick: function(percX, percY, tierDetails) {
        //deselect everything
        this.resetAllSelTiers();
        this.resetAllSelSegments();

        tierDetails.uiInfos.sel = true;
        // var lastTier = this.viewPort.selTier;
        // if (lastTier != elID) my.rebuildSelect();
        // this.viewPort.selTier = elID;


        var rXp = tierDetails.uiInfos.canvas.width * percX;
        var rYp = tierDetails.uiInfos.canvas.height * percY;
        var sXp = tierDetails.uiInfos.canvas.width * (emulabeller.viewPort.selectS / (emulabeller.viewPort.eS - emulabeller.viewPort.sS));

        /*if(this.viewPort.selectS == this.viewPort.selectE && Math.abs(rXp-sXp) <= 5 && rYp < 10){
            console.log("hit the circle")
            this.addSegmentAtSelection();
        }*/
        // if (clickedTier.type == "point") {
        //     var curSample = this.viewPort.sS + (this.viewPort.eS - this.viewPort.sS) * percX;
        //     var clickedEvtNr = my.getNearestSegmentBoundry(clickedTier, curSample);

        // }
        if (tierDetails.type == "seg") {
            var curSample = emulabeller.viewPort.sS + (emulabeller.viewPort.eS - emulabeller.viewPort.sS) * percX;

            // var nearest = this.findAndMarkNearestSegmentBoundry(tierDetails, curSample, false);
            var nearest = this.findAndMarkNearestSegmentAsSel(tierDetails, curSample);


            // nearest.uiInfos.selSeg = true;

            emulabeller.viewPort.selectS = nearest.startSample;
            emulabeller.viewPort.selectE = nearest.startSample + nearest.sampleDur;

            // var clickedEvtNr = this.getSegmentIDbySample(clickedTier, curSample);
            //     var clicked = this.countSelected(elID);
            //     var timeS = clickedTier.events[clickedEvtNr - 1].startSample;
            //     console.log(clickedTier.events)
            //     var timeE = clickedTier.events[clickedEvtNr].startSample;
            //     if (clicked > 0) {
            //         if (this.isSelectNeighbour(elID, clickedEvtNr)) {
            //             my.viewPort.selectedSegments[elID][clickedEvtNr] = true;
            //             if (this.viewPort.selectS != 0 && clicked > 0) {
            //                 if (timeS < this.viewPort.selectS)
            //                     this.viewPort.selectS = timeS;
            //             } else this.viewPort.selectS = timeS;
            //             if (this.viewPort.selectE != 0 && clicked > 0) {
            //                 if (timeE > this.viewPort.selectE)
            //                     this.viewPort.selectE = timeE;
            //             }
            //         } else {
            //             my.rebuildSelect();
            //             my.viewPort.selectedSegments[elID][clickedEvtNr] = true;
            //             this.viewPort.selectS = timeS;
            //             this.viewPort.selectE = timeE;
            //         }
            //     } else {
            //         my.viewPort.selectedSegments[elID][clickedEvtNr] = true;
            //         this.viewPort.selectS = timeS;
            //         this.viewPort.selectE = timeE;
            //     }
        }
        emulabeller.drawBuffer();
    },
    

    findAndMarkNearestSegmentAsSel: function(tierDetails, curSample) {

        var resEvt = null;

        for (var i = 0; i < tierDetails.events.length; i++) {
            var curEvt = tierDetails.events[i];

            if (curSample > curEvt.startSample && curSample < (curEvt.startSample + curEvt.sampleDur)) {
                resEvt = curEvt;
                break;
            }
        }

        resEvt.uiInfos.selSeg = true;

        return resEvt;
    },

    resetAllSelTiers: function() {
        $.each(this.tierInfos.tiers, function() {
            this.uiInfos.sel = false;
        });     
    },

    resetAllSelSegments: function() {
        $.each(this.tierInfos.tiers, function() {
            $.each(this.events, function() {
                this.uiInfos.sel = false;
            });     
        });     
    },
    

    getSelectedTier: function() {
        $.each(this.tierInfos.tiers, function() {
            if(this.uiInfos.sel) return this;
        });    
    },

    getSelectedSegmentInTier: function(tierDetails) {
        $.each(tierDetails.events, function() {
            if(this.uiInfos.sel) return this;
        });        
    },
    
    

};
